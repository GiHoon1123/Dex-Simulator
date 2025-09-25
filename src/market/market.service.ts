import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ArbitrageOpportunity,
  MarketPrice,
  MarketStatus,
  PriceChangeEvent,
} from './types/market.interface';

@Injectable()
export class MarketService {
  private currentPrice: MarketPrice;
  private priceHistory: MarketPrice[] = [];
  private readonly MAX_HISTORY = 100; // 최대 100개 가격 이력 보관
  private readonly VOLATILITY_WINDOW = 20; // 변동성 계산 윈도우

  constructor(private readonly eventEmitter: EventEmitter2) {
    // 초기 가격 설정
    this.currentPrice = {
      eth: 2000, // $2000
      btc: 60000, // $60000
      ratio: 2000 / 60000, // 0.033
      timestamp: new Date(),
    };
    this.priceHistory.push({ ...this.currentPrice });
  }

  // 현재 가격 조회
  getCurrentPrice(): MarketPrice {
    return { ...this.currentPrice };
  }

  // 가격 변동 시뮬레이션
  simulatePriceChange(): PriceChangeEvent {
    const previousPrice = { ...this.currentPrice };

    // 랜덤 가격 변동 생성 (-5% ~ +5%)
    const ethChange = (Math.random() - 0.5) * 0.1; // -5% ~ +5%
    const btcChange = (Math.random() - 0.5) * 0.1; // -5% ~ +5%

    // 가격 업데이트
    this.currentPrice.eth *= 1 + ethChange;
    this.currentPrice.btc *= 1 + btcChange;
    this.currentPrice.ratio = this.currentPrice.eth / this.currentPrice.btc;
    this.currentPrice.timestamp = new Date();

    // 가격 이력에 추가
    this.priceHistory.push({ ...this.currentPrice });
    if (this.priceHistory.length > this.MAX_HISTORY) {
      this.priceHistory.shift(); // 오래된 이력 제거
    }

    // 이벤트 생성
    const event: PriceChangeEvent = {
      eventId: `price_change_${Date.now()}`,
      timestamp: new Date(),
      previousPrice,
      currentPrice: { ...this.currentPrice },
      change: {
        eth: ethChange * 100, // 퍼센트로 변환
        btc: btcChange * 100,
      },
      volatility: this.calculateVolatility(),
    };

    // 이벤트 발생
    this.eventEmitter.emit('market.price.changed', event);

    return event;
  }

  // 변동성 계산 (표준편차 기반)
  private calculateVolatility(): number {
    if (this.priceHistory.length < 2) return 0;

    const recentPrices = this.priceHistory.slice(-this.VOLATILITY_WINDOW);
    const returns: number[] = [];

    for (let i = 1; i < recentPrices.length; i++) {
      const ethReturn =
        (recentPrices[i].eth - recentPrices[i - 1].eth) /
        recentPrices[i - 1].eth;
      const btcReturn =
        (recentPrices[i].btc - recentPrices[i - 1].btc) /
        recentPrices[i - 1].btc;
      const avgReturn = (ethReturn + btcReturn) / 2;
      returns.push(avgReturn);
    }

    // 표준편차 계산
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance =
      returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) /
      returns.length;
    const standardDeviation = Math.sqrt(variance);

    return standardDeviation * 100; // 퍼센트로 변환
  }

  // 아비트라지 기회 계산
  calculateArbitrageOpportunity(
    poolEth: number,
    poolBtc: number,
  ): ArbitrageOpportunity | null {
    const poolEthPrice = poolBtc / poolEth; // 풀 내부: 1 ETH = ? BTC
    const marketEthPrice = this.currentPrice.btc / this.currentPrice.eth; // 시장: 1 ETH = ? BTC

    const difference = Math.abs(poolEthPrice - marketEthPrice);
    const percentage = (difference / marketEthPrice) * 100;

    // 5% 이상 차이 시 아비트라지 기회
    if (percentage < 5) return null;

    const opportunity: ArbitrageOpportunity = {
      opportunityId: `arbitrage_${Date.now()}`,
      timestamp: new Date(),
      poolPrice: poolEthPrice,
      marketPrice: marketEthPrice,
      difference,
      percentage,
      direction:
        poolEthPrice > marketEthPrice ? 'buy_eth_sell_btc' : 'buy_btc_sell_eth',
    };

    // 아비트라지 기회 이벤트 발생
    this.eventEmitter.emit('arbitrage.opportunity', opportunity);

    return opportunity;
  }

  // 시장 상태 조회
  getMarketStatus(poolEth?: number, poolBtc?: number): MarketStatus {
    const arbitrageOpportunity =
      poolEth && poolBtc
        ? this.calculateArbitrageOpportunity(poolEth, poolBtc)
        : null;

    return {
      currentPrice: { ...this.currentPrice },
      volatility: {
        eth: this.calculateEthVolatility(),
        btc: this.calculateBtcVolatility(),
        overall: this.calculateVolatility(),
      },
      arbitrageOpportunity,
      lastUpdate: new Date(),
    };
  }

  // 가격 변동 시 아비트라지 기회 체크 및 이벤트 발생
  checkAndEmitArbitrageOpportunity(poolEth: number, poolBtc: number): void {
    const opportunity = this.calculateArbitrageOpportunity(poolEth, poolBtc);
    if (opportunity) {
      console.log(
        `아비트라지 기회 발견: ${opportunity.percentage.toFixed(2)}% 차이`,
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      this.eventEmitter.emit('arbitrage.opportunity', opportunity);
    }
  }

  // ETH 변동성 계산
  private calculateEthVolatility(): number {
    if (this.priceHistory.length < 2) return 0;

    const recentPrices = this.priceHistory.slice(-this.VOLATILITY_WINDOW);
    const returns: number[] = [];

    for (let i = 1; i < recentPrices.length; i++) {
      const returnRate =
        (recentPrices[i].eth - recentPrices[i - 1].eth) /
        recentPrices[i - 1].eth;
      returns.push(returnRate);
    }

    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance =
      returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) /
      returns.length;
    const standardDeviation = Math.sqrt(variance);

    return standardDeviation * 100;
  }

  // BTC 변동성 계산
  private calculateBtcVolatility(): number {
    if (this.priceHistory.length < 2) return 0;

    const recentPrices = this.priceHistory.slice(-this.VOLATILITY_WINDOW);
    const returns: number[] = [];

    for (let i = 1; i < recentPrices.length; i++) {
      const returnRate =
        (recentPrices[i].btc - recentPrices[i - 1].btc) /
        recentPrices[i - 1].btc;
      returns.push(returnRate);
    }

    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance =
      returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) /
      returns.length;
    const standardDeviation = Math.sqrt(variance);

    return standardDeviation * 100;
  }
}
