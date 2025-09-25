import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TradeExecutedEvent } from '../common/events/trade.events';
import { LpService } from '../lp/lp.service';
import { Trade, TradeResult } from './types/trade.interface';

@Injectable()
export class TraderService {
  private tradeCounter = 0;

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly lpService: LpService,
  ) {}

  // 랜덤 거래 실행
  executeRandomTrade(): TradeResult {
    // 거래 방향 랜덤 결정
    const isEthToBtc = Math.random() > 0.5;
    const from = isEthToBtc ? 'ETH' : 'BTC';
    const to = isEthToBtc ? 'BTC' : 'ETH';

    // 거래량 랜덤 결정 (풀의 1~5%)
    const maxTradeRatio = 0.05;
    const tradeRatio = Math.random() * maxTradeRatio + 0.01; // 1~6%

    return this.executeTrade(from, to, tradeRatio);
  }

  // 특정 거래 실행
  executeTrade(
    from: 'ETH' | 'BTC',
    to: 'ETH' | 'BTC',
    tradeRatio: number,
  ): TradeResult {
    this.tradeCounter++;
    const tradeId = `trade_${this.tradeCounter}`;

    // 현재 풀 상태 가져오기
    const currentPool = this.lpService.getPool();
    const poolBefore = {
      eth: currentPool.eth,
      btc: currentPool.btc,
      k: currentPool.k,
    };

    // 거래량 계산
    const amountIn =
      from === 'ETH'
        ? poolBefore.eth * tradeRatio
        : poolBefore.btc * tradeRatio;

    // 수수료 계산 (LP 서비스에서)
    const fee = this.lpService.calculateFee(amountIn);

    // 수수료를 제외한 실제 거래량
    const actualAmountIn = amountIn - fee;

    // AMM 계산 (수수료 제외한 금액으로)
    const { amountOut, slippage, priceImpact } = this.calculateAMM(
      from,
      to,
      actualAmountIn,
      poolBefore,
    );

    // 거래 후 풀 상태 계산
    const poolAfter = this.calculatePoolAfter(
      from,
      to,
      actualAmountIn,
      amountOut,
      poolBefore,
    );

    // 거래 정보 생성
    const trade: Trade = {
      id: tradeId,
      from,
      to,
      amountIn,
      amountOut,
      fee,
      slippage,
      priceImpact,
      timestamp: new Date(),
    };

    // 이벤트 발생
    const tradeEvent: TradeExecutedEvent = {
      tradeId,
      from,
      to,
      amountIn,
      amountOut,
      fee,
      slippage,
      priceImpact,
      poolBefore,
      poolAfter,
    };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    this.eventEmitter.emit('trade.executed', tradeEvent);

    // 가격 정보 계산
    const expectedRate =
      from === 'ETH'
        ? poolBefore.btc / poolBefore.eth
        : poolBefore.eth / poolBefore.btc;
    const actualRate = amountOut / amountIn;

    return {
      trade,
      poolBefore,
      poolAfter,
      priceInfo: {
        expectedRate: parseFloat(expectedRate.toFixed(6)),
        actualRate: parseFloat(actualRate.toFixed(6)),
        slippage: parseFloat(slippage.toFixed(4)),
      },
    };
  }

  // AMM 계산 (x*y=k)
  private calculateAMM(
    from: 'ETH' | 'BTC',
    to: 'ETH' | 'BTC',
    actualAmountIn: number,
    pool: { eth: number; btc: number; k: number },
  ) {
    let amountOut: number;

    if (from === 'ETH' && to === 'BTC') {
      // x*y = k 공식: (x + Δx) * (y - Δy) = k
      // Δy = (k / (x + Δx)) - y
      amountOut = pool.btc - pool.k / (pool.eth + actualAmountIn);
    } else {
      amountOut = pool.eth - pool.k / (pool.btc + actualAmountIn);
    }

    // 슬리피지 계산
    const expectedPrice =
      from === 'ETH' ? pool.btc / pool.eth : pool.eth / pool.btc;
    const actualPrice = amountOut / actualAmountIn;
    const slippage =
      Math.abs((actualPrice - expectedPrice) / expectedPrice) * 100;

    // 가격 영향도 계산
    const priceImpact =
      (actualAmountIn / (from === 'ETH' ? pool.eth : pool.btc)) * 100;

    return {
      amountOut: parseFloat(amountOut.toFixed(6)),
      slippage: parseFloat(slippage.toFixed(4)),
      priceImpact: parseFloat(priceImpact.toFixed(4)),
    };
  }

  // 거래 후 풀 상태 계산
  private calculatePoolAfter(
    from: 'ETH' | 'BTC',
    to: 'ETH' | 'BTC',
    amountIn: number,
    amountOut: number,
    poolBefore: { eth: number; btc: number; k: number },
  ) {
    if (from === 'ETH' && to === 'BTC') {
      return {
        eth: poolBefore.eth + amountIn,
        btc: poolBefore.btc - amountOut,
        k: poolBefore.k, // k는 유지
      };
    } else {
      return {
        eth: poolBefore.eth - amountOut,
        btc: poolBefore.btc + amountIn,
        k: poolBefore.k, // k는 유지
      };
    }
  }
}
