import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  MEVOpportunityDetectedEvent,
  MEVOpportunityExpiredEvent,
  OracleStatusChangedEvent,
  POOL_EVENT_TYPES,
} from '../events/pool.events';
import {
  MEVOpportunity,
  OracleConfig,
  OracleStatus,
  PoolPrice,
  PriceDeviation,
  PriceHistoryItem,
  TWAPInfo,
} from './types/oracle.interface';
import { PoolState } from './types/pool.interface';

/**
 * 풀 오라클 서비스
 *
 * 풀 내부 가격을 모니터링하고, TWAP을 계산하며,
 * MEV 기회를 탐지하는 오라클 시스템을 제공합니다.
 */
@Injectable()
export class PoolOracleService {
  private readonly logger = new Logger(PoolOracleService.name);

  /** 풀별 가격 정보 */
  private poolPrices: Map<string, PoolPrice> = new Map();

  /** 풀별 가격 히스토리 */
  private priceHistory: Map<string, PriceHistoryItem[]> = new Map();

  /** 활성 MEV 기회 */
  private activeOpportunities: Map<string, MEVOpportunity> = new Map();

  /** 오라클 설정 */
  private config: OracleConfig;

  /** 오라클 상태 */
  private status: OracleStatus;

  /** 업데이트 타이머 */
  private updateTimer: NodeJS.Timeout | null = null;

  /** MEV 기회 만료 타이머 */
  private expirationTimer: NodeJS.Timeout | null = null;

  constructor(private readonly eventEmitter: EventEmitter2) {
    this.initializeConfig();
    this.initializeStatus();
    this.startOracle();
  }

  /**
   * 오라클 설정 초기화
   */
  private initializeConfig(): void {
    this.config = {
      twapPeriod: 300, // 5분
      updateInterval: 30, // 30초
      mevThreshold: 0.5, // 0.5%
      confidenceThreshold: 0.8, // 80%
      maxDeviation: 10, // 10%
      autoExecute: false, // 수동 실행
    };
  }

  /**
   * 오라클 상태 초기화
   */
  private initializeStatus(): void {
    this.status = {
      isActive: false,
      lastUpdate: new Date(),
      totalPools: 0,
      monitoredPools: 0,
      activeOpportunities: 0,
      averageConfidence: 0,
      systemStatus: 'healthy',
    };
  }

  /**
   * 오라클 시작
   */
  private startOracle(): void {
    this.status.isActive = true;
    this.status.systemStatus = 'healthy';

    // 정기 업데이트 시작
    this.startPeriodicUpdate();

    // MEV 기회 만료 체크 시작
    this.startExpirationCheck();

    this.logger.log('풀 오라클 서비스가 시작되었습니다');

    // 상태 변경 이벤트 발생
    this.emitOracleStatusChanged(
      'inactive',
      'active',
      'Oracle service started',
    );
  }

  /**
   * 정기 업데이트 시작
   */
  private startPeriodicUpdate(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }

    this.updateTimer = setInterval(() => {
      this.performPeriodicUpdate();
    }, this.config.updateInterval * 1000);
  }

  /**
   * MEV 기회 만료 체크 시작
   */
  private startExpirationCheck(): void {
    if (this.expirationTimer) {
      clearInterval(this.expirationTimer);
    }

    this.expirationTimer = setInterval(() => {
      this.checkExpiredOpportunities();
    }, 10000); // 10초마다 체크
  }

  /**
   * 정기 업데이트 수행
   */
  private performPeriodicUpdate(): void {
    try {
      this.status.lastUpdate = new Date();

      // 모든 풀의 가격 업데이트
      for (const [poolAddress, poolPrice] of this.poolPrices) {
        this.updatePoolPrice(poolAddress);
      }

      // MEV 기회 탐지
      this.detectMEVOpportunities();

      // 통계 업데이트
      this.updateStatistics();
    } catch (error) {
      this.logger.error('정기 업데이트 중 오류 발생:', error);
      this.status.systemStatus = 'error';
    }
  }

  /**
   * 풀 가격 등록
   */
  registerPool(poolState: PoolState): void {
    const poolPrice: PoolPrice = {
      poolAddress: poolState.address,
      pair: poolState.pair,
      tokenA: poolState.tokenA,
      tokenB: poolState.tokenB,
      price: poolState.reserveB / poolState.reserveA,
      inversePrice: poolState.reserveA / poolState.reserveB,
      timestamp: new Date(),
      confidence: 1.0, // 초기 신뢰도
    };

    this.poolPrices.set(poolState.address, poolPrice);
    this.priceHistory.set(poolState.address, []);

    this.status.totalPools++;
    this.status.monitoredPools++;

    this.logger.log(`풀 등록됨: ${poolState.address} (${poolState.pair})`);
  }

  /**
   * 풀 가격 업데이트
   */
  updatePoolPrice(poolAddress: string): void {
    const poolPrice = this.poolPrices.get(poolAddress);
    if (!poolPrice) {
      this.logger.warn(`등록되지 않은 풀: ${poolAddress}`);
      return;
    }

    // 가격 히스토리에 추가
    const historyItem: PriceHistoryItem = {
      price: poolPrice.price,
      timestamp: new Date(),
      volume: 0, // 실제로는 거래량 정보 필요
      weight: 1.0,
    };

    const history = this.priceHistory.get(poolAddress) || [];
    history.push(historyItem);

    // 히스토리 크기 제한 (최근 1000개)
    if (history.length > 1000) {
      history.shift();
    }

    this.priceHistory.set(poolAddress, history);

    // 가격 신뢰도 업데이트
    poolPrice.confidence = this.calculateConfidence(poolAddress);
    poolPrice.timestamp = new Date();

    this.poolPrices.set(poolAddress, poolPrice);
  }

  /**
   * TWAP 계산
   */
  calculateTWAP(
    poolAddress: string,
    period: number = this.config.twapPeriod,
  ): TWAPInfo | null {
    const history = this.priceHistory.get(poolAddress);
    if (!history || history.length < 2) {
      return null;
    }

    const now = new Date();
    const startTime = new Date(now.getTime() - period * 1000);

    // 기간 내 데이터 필터링
    const periodData = history.filter((item) => item.timestamp >= startTime);
    if (periodData.length < 2) {
      return null;
    }

    let totalWeight = 0;
    let weightedPriceSum = 0;

    for (let i = 1; i < periodData.length; i++) {
      const current = periodData[i];
      const previous = periodData[i - 1];

      // 시간 가중치 계산
      const timeDiff =
        current.timestamp.getTime() - previous.timestamp.getTime();
      const weight = timeDiff / 1000; // 초 단위

      totalWeight += weight;
      weightedPriceSum += current.price * weight;
    }

    const twapPrice = totalWeight > 0 ? weightedPriceSum / totalWeight : 0;

    return {
      poolAddress,
      twapPrice,
      period,
      sampleCount: periodData.length,
      startTime,
      endTime: now,
      totalWeight,
    };
  }

  /**
   * 가격 편차 계산
   */
  calculatePriceDeviation(
    poolAddress: string,
    externalPrice: number,
  ): PriceDeviation | null {
    const poolPrice = this.poolPrices.get(poolAddress);
    if (!poolPrice) {
      return null;
    }

    const absoluteDifference = Math.abs(poolPrice.price - externalPrice);
    const relativeDifference = (absoluteDifference / externalPrice) * 100;

    let direction: 'pool_higher' | 'external_higher' | 'equal';
    if (poolPrice.price > externalPrice) {
      direction = 'pool_higher';
    } else if (poolPrice.price < externalPrice) {
      direction = 'external_higher';
    } else {
      direction = 'equal';
    }

    const isMEVOpportunity = relativeDifference >= this.config.mevThreshold;

    return {
      poolAddress,
      poolPrice: poolPrice.price,
      externalPrice,
      absoluteDifference,
      relativeDifference,
      direction,
      detectedAt: new Date(),
      isMEVOpportunity,
    };
  }

  /**
   * MEV 기회 탐지
   */
  private detectMEVOpportunities(): void {
    for (const [poolAddress, poolPrice] of this.poolPrices) {
      // 외부 가격 (실제로는 외부 오라클에서 가져와야 함)
      const externalPrice = this.getExternalPrice(poolPrice.pair);
      if (!externalPrice) continue;

      const deviation = this.calculatePriceDeviation(
        poolAddress,
        externalPrice,
      );
      if (!deviation || !deviation.isMEVOpportunity) continue;

      // 기존 기회가 있는지 확인
      if (this.activeOpportunities.has(poolAddress)) {
        continue;
      }

      // MEV 기회 생성
      const opportunity = this.createMEVOpportunity(poolAddress, deviation);
      this.activeOpportunities.set(poolAddress, opportunity);

      // 이벤트 발생
      this.emitMEVOpportunityDetected(opportunity);

      this.logger.log(
        `MEV 기회 탐지: ${poolAddress} - ${deviation.relativeDifference.toFixed(2)}% 편차`,
      );
    }
  }

  /**
   * MEV 기회 생성
   */
  private createMEVOpportunity(
    poolAddress: string,
    deviation: PriceDeviation,
  ): MEVOpportunity {
    const poolPrice = this.poolPrices.get(poolAddress);
    if (!poolPrice) {
      throw new Error(`풀을 찾을 수 없습니다: ${poolAddress}`);
    }

    const opportunityId = `mev_${poolAddress}_${Date.now()}`;
    const expectedProfit = deviation.relativeDifference * 0.1; // 편차의 10% 수익
    const expectedProfitUSD = expectedProfit * 1000; // 가정: $1000 거래
    const gasCost = 0.01; // $0.01 가스 비용
    const netProfit = expectedProfitUSD - gasCost;

    return {
      opportunityId,
      poolAddress,
      pair: poolPrice.pair,
      strategy: this.determineMEVStrategy(deviation),
      expectedProfit,
      expectedProfitUSD,
      gasCost,
      netProfit,
      detectedAt: new Date(),
      expiresAt: new Date(Date.now() + 60000), // 1분 후 만료
      isExecutable: netProfit > 0,
      riskLevel: this.calculateRiskLevel(deviation),
    };
  }

  /**
   * MEV 전략 결정
   */
  private determineMEVStrategy(
    deviation: PriceDeviation,
  ): 'front_run' | 'back_run' | 'sandwich' | 'arbitrage' {
    if (deviation.relativeDifference > 5) {
      return 'arbitrage';
    } else if (deviation.relativeDifference > 2) {
      return 'sandwich';
    } else if (deviation.relativeDifference > 1) {
      return 'front_run';
    } else {
      return 'back_run';
    }
  }

  /**
   * 위험도 계산
   */
  private calculateRiskLevel(deviation: PriceDeviation): number {
    if (deviation.relativeDifference > 10) return 5;
    if (deviation.relativeDifference > 5) return 4;
    if (deviation.relativeDifference > 2) return 3;
    if (deviation.relativeDifference > 1) return 2;
    return 1;
  }

  /**
   * 외부 가격 조회 (시뮬레이션)
   */
  private getExternalPrice(pair: string): number | null {
    // 실제로는 외부 오라클 API를 호출해야 함
    const mockPrices: Record<string, number> = {
      'ETH/USDC': 2000,
      'BTC/ETH': 0.05,
      'DAI/USDC': 1.0,
      'WETH/USDC': 2000,
    };

    return mockPrices[pair] || null;
  }

  /**
   * 가격 신뢰도 계산
   */
  private calculateConfidence(poolAddress: string): number {
    const history = this.priceHistory.get(poolAddress);
    if (!history || history.length < 2) {
      return 0.5; // 기본 신뢰도
    }

    // 최근 데이터의 일관성으로 신뢰도 계산
    const recentData = history.slice(-10);
    const prices = recentData.map((item) => item.price);
    const avgPrice =
      prices.reduce((sum, price) => sum + price, 0) / prices.length;

    const variance =
      prices.reduce((sum, price) => sum + Math.pow(price - avgPrice, 2), 0) /
      prices.length;
    const standardDeviation = Math.sqrt(variance);
    const coefficientOfVariation = standardDeviation / avgPrice;

    // 변동계수가 낮을수록 신뢰도 높음
    return Math.max(0, Math.min(1, 1 - coefficientOfVariation));
  }

  /**
   * 만료된 MEV 기회 체크
   */
  private checkExpiredOpportunities(): void {
    const now = new Date();

    for (const [poolAddress, opportunity] of this.activeOpportunities) {
      if (now > opportunity.expiresAt) {
        this.activeOpportunities.delete(poolAddress);
        this.emitMEVOpportunityExpired(
          opportunity.opportunityId,
          poolAddress,
          'timeout',
        );

        this.logger.log(`MEV 기회 만료: ${poolAddress}`);
      }
    }
  }

  /**
   * 통계 업데이트
   */
  private updateStatistics(): void {
    this.status.totalPools = this.poolPrices.size;
    this.status.monitoredPools = this.poolPrices.size;
    this.status.activeOpportunities = this.activeOpportunities.size;

    // 평균 신뢰도 계산
    const confidences = Array.from(this.poolPrices.values()).map(
      (p) => p.confidence,
    );
    this.status.averageConfidence =
      confidences.length > 0
        ? confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length
        : 0;
  }

  /**
   * MEV 기회 탐지 이벤트 발생
   */
  private emitMEVOpportunityDetected(opportunity: MEVOpportunity): void {
    const event: MEVOpportunityDetectedEvent = {
      eventId: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: POOL_EVENT_TYPES.MEV_OPPORTUNITY_DETECTED as any,
      mevOpportunity: opportunity,
      timestamp: new Date(),
      priority:
        opportunity.expectedProfit > 5
          ? 'urgent'
          : opportunity.expectedProfit > 2
            ? 'high'
            : opportunity.expectedProfit > 1
              ? 'medium'
              : 'low',
      autoExecutable: opportunity.isExecutable && this.config.autoExecute,
    };

    this.eventEmitter.emit(POOL_EVENT_TYPES.MEV_OPPORTUNITY_DETECTED, event);
  }

  /**
   * MEV 기회 만료 이벤트 발생
   */
  private emitMEVOpportunityExpired(
    opportunityId: string,
    poolAddress: string,
    reason: string,
  ): void {
    const event: MEVOpportunityExpiredEvent = {
      eventId: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: POOL_EVENT_TYPES.MEV_OPPORTUNITY_EXPIRED as any,
      mevOpportunityId: opportunityId,
      poolAddress,
      timestamp: new Date(),
      reason: reason as any,
    };

    this.eventEmitter.emit(POOL_EVENT_TYPES.MEV_OPPORTUNITY_EXPIRED, event);
  }

  /**
   * 오라클 상태 변경 이벤트 발생
   */
  private emitOracleStatusChanged(
    previousStatus: string,
    currentStatus: string,
    reason: string,
  ): void {
    const event: OracleStatusChangedEvent = {
      eventId: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: POOL_EVENT_TYPES.ORACLE_STATUS_CHANGED as any,
      poolAddress: 'system',
      previousStatus: previousStatus as any,
      currentStatus: currentStatus as any,
      timestamp: new Date(),
      reason,
    };

    this.eventEmitter.emit(POOL_EVENT_TYPES.ORACLE_STATUS_CHANGED, event);
  }

  /**
   * 풀 가격 조회
   */
  getPoolPrice(poolAddress: string): PoolPrice | null {
    return this.poolPrices.get(poolAddress) || null;
  }

  /**
   * 모든 풀 가격 조회
   */
  getAllPoolPrices(): PoolPrice[] {
    return Array.from(this.poolPrices.values());
  }

  /**
   * 활성 MEV 기회 조회
   */
  getActiveOpportunities(): MEVOpportunity[] {
    return Array.from(this.activeOpportunities.values());
  }

  /**
   * 오라클 상태 조회
   */
  getOracleStatus(): OracleStatus {
    return { ...this.status };
  }

  /**
   * 오라클 설정 업데이트
   */
  updateConfig(newConfig: Partial<OracleConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logger.log('오라클 설정이 업데이트되었습니다');
  }

  /**
   * 오라클 중지
   */
  stop(): void {
    this.status.isActive = false;

    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }

    if (this.expirationTimer) {
      clearInterval(this.expirationTimer);
      this.expirationTimer = null;
    }

    this.emitOracleStatusChanged(
      'active',
      'inactive',
      'Oracle service stopped',
    );
    this.logger.log('풀 오라클 서비스가 중지되었습니다');
  }

  /**
   * 리소스 정리
   */
  onModuleDestroy(): void {
    this.stop();
  }
}
