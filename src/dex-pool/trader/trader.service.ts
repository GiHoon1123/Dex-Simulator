import { Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { TradeExecutedEvent } from '../events/trade.events';
import { LpService } from '../lp/lp.service';
import { MarketService } from '../market/market.service';
import { ArbitrageOpportunity } from './types/arbitrage.interface';
import { Trade, TradeResult } from './types/trade.interface';

@Injectable()
export class TraderService {
  private tradeCounter = 0;

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly lpService: LpService,
    private readonly marketService: MarketService,
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

  // 아비트라지 기회 이벤트 수신
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @OnEvent('arbitrage.opportunity')
  handleArbitrageOpportunity(event: ArbitrageOpportunity): void {
    console.log(`아비트라지 기회 감지: ${event.percentage.toFixed(2)}% 차이`);
    console.log(`방향: ${event.direction}`);

    // 아비트라지 거래 실행
    this.executeArbitrageTrade(event);
  }

  // 아비트라지 거래 실행
  private executeArbitrageTrade(
    opportunity: ArbitrageOpportunity,
  ): TradeResult {
    this.tradeCounter++;
    const tradeId = `arbitrage_${this.tradeCounter}`;

    const currentPool = this.lpService.getPool();
    const poolBefore = {
      eth: currentPool.eth,
      btc: currentPool.btc,
      k: currentPool.k,
    };

    // 아비트라지 거래량 계산 (풀의 1-3% 범위)
    const maxArbitrageRatio = Math.min(0.03, opportunity.percentage / 1000); // 최대 3% 또는 차이의 1/10
    const arbitrageRatio = Math.max(0.01, maxArbitrageRatio); // 최소 1%

    let from: 'ETH' | 'BTC';
    let to: 'ETH' | 'BTC';
    let amountIn: number;

    if (opportunity.direction === 'buy_eth_sell_btc') {
      // 풀에서 ETH가 저평가 → ETH 구매 (BTC로)
      from = 'BTC';
      to = 'ETH';
      amountIn = currentPool.btc * arbitrageRatio;
    } else {
      // 풀에서 BTC가 저평가 → BTC 구매 (ETH로)
      from = 'ETH';
      to = 'BTC';
      amountIn = currentPool.eth * arbitrageRatio;
    }

    // 수수료 계산
    const fee = this.lpService.calculateFee(amountIn);
    const actualAmountIn = amountIn - fee;

    // AMM 계산
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

    const result: TradeResult = {
      trade,
      poolBefore,
      poolAfter,
      priceInfo: {
        expectedRate: parseFloat(expectedRate.toFixed(6)),
        actualRate: parseFloat(actualRate.toFixed(6)),
        slippage: parseFloat(slippage.toFixed(4)),
      },
    };

    console.log(
      `아비트라지 거래 완료: ${from} ${amountIn.toFixed(3)} → ${to} ${amountOut.toFixed(3)}`,
    );
    console.log(`수수료: ${fee.toFixed(6)}, 슬리피지: ${slippage.toFixed(2)}%`);

    return result;
  }

  // 아비트라지 거래 수동 실행 (API용)
  executeArbitrageTradeManually(
    opportunity: ArbitrageOpportunity,
  ): TradeResult {
    return this.executeArbitrageTrade(opportunity);
  }

  // 아비트라지 기회 체크 후 실행 (API용)
  checkAndExecuteArbitrage(): {
    message: string;
    opportunity?: ArbitrageOpportunity;
    trade?: TradeResult;
  } {
    const currentPool = this.lpService.getPool();

    // 실제 시장 가격에서 아비트라지 기회 체크
    const poolEthPrice = currentPool.btc / currentPool.eth; // 풀 내부: 1 ETH = ? BTC
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const marketPrice = this.marketService.getCurrentPrice();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const marketEthPrice = marketPrice.btc / marketPrice.eth; // 시장: 1 ETH = ? BTC

    const difference = Math.abs(poolEthPrice - marketEthPrice);
    const percentage = (difference / marketEthPrice) * 100;

    if (percentage < 5) {
      return {
        message: `아비트라지 기회가 없습니다. 현재 차이: ${percentage.toFixed(2)}% (최소 5% 필요)`,
      };
    }

    // 아비트라지 기회가 있는 경우
    const opportunity: ArbitrageOpportunity = {
      opportunityId: `manual_arbitrage_${Date.now()}`,
      timestamp: new Date(),
      poolPrice: poolEthPrice,
      marketPrice: marketEthPrice,
      difference,
      percentage,
      direction:
        poolEthPrice > marketEthPrice ? 'buy_eth_sell_btc' : 'buy_btc_sell_eth',
    };

    const trade = this.executeArbitrageTrade(opportunity);

    return {
      message: `아비트라지 거래 실행 완료! 차이: ${percentage.toFixed(2)}%`,
      opportunity,
      trade,
    };
  }
}
