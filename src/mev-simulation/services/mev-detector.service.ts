/**
 * MEV 기회 감지 서비스
 * PENDING 트랜잭션을 모니터링하여 MEV 기회를 감지하고 분석
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TransactionPoolService } from '../../shared/blockchain/transaction-pool.service';
import {
  Transaction,
  TransactionType,
} from '../../shared/blockchain/types/transaction.interface';
import { PoolService } from '../../shared/pool/pool.service';
import {
  MEVBotConfig,
  MEVDetectionCriteria,
  MEVOpportunity,
  MEVOpportunityStatus,
  MEVStrategyType,
} from '../types/mev.interface';
import {
  ExecutionWindow,
  MarketImpact,
  MEVOpportunityDetection,
  OpportunityAnalysis,
  RecommendedAction,
  RiskAssessment,
  StrategyAnalysis,
} from '../types/opportunity.interface';

@Injectable()
export class MevDetectorService {
  private readonly logger = new Logger(MevDetectorService.name);
  private opportunities: Map<string, MEVOpportunity> = new Map();
  private detectionCriteria: MEVDetectionCriteria;
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly transactionPoolService: TransactionPoolService,
    private readonly poolService: PoolService, // TODO: 구체화 시 실제 풀 정보 조회에 사용
    private readonly eventEmitter: EventEmitter2,
  ) {
    // 기본 감지 기준 설정 (시뮬레이션에 맞게 조정)
    this.detectionCriteria = {
      minTransactionValue: 0.1, // 0.1 ETH 이상 (시뮬레이션 트랜잭션에 맞게 조정)
      minGasPrice: 50, // 50 gwei 이상 (시뮬레이션 트랜잭션에 맞게 조정)
      minSlippage: 0.5, // 0.5% 이상
      maxPoolImpact: 10.0, // 10% 이하
      minProfitThreshold: 0.01, // 0.01 ETH 이상 (시뮬레이션에 맞게 조정)
    };
    this.logger.log('[DEBUG] MevDetectorService 생성자 호출됨');
    this.logger.log('[DEBUG] MevDetectorService 초기화 완료');
  }

  /**
   * MEV 기회 감지 시작
   */
  startDetection(config: MEVBotConfig): void {
    this.logger.log('[DEBUG] startDetection 호출됨');
    if (this.isMonitoring) {
      this.logger.warn('MEV 감지가 이미 실행 중입니다');
      return;
    }

    this.isMonitoring = true;
    this.detectionCriteria = {
      minTransactionValue: Math.max(config.minProfit * 2, 0.1), // 설정 기반 조정, 최소 0.1 ETH
      minGasPrice: 50, // 50 gwei (시뮬레이션에 맞게 조정)
      minSlippage: 0.5,
      maxPoolImpact: 10.0,
      minProfitThreshold: Math.max(config.minProfit, 0.01), // 최소 0.01 ETH 보장 (시뮬레이션에 맞게 조정)
    };

    this.logger.log(
      `[DEBUG] 감지 기준 설정: minTransactionValue=${this.detectionCriteria.minTransactionValue}, minGasPrice=${this.detectionCriteria.minGasPrice}, minProfitThreshold=${this.detectionCriteria.minProfitThreshold}`,
    );

    // 1초마다 트랜잭션 풀 모니터링
    this.monitoringInterval = setInterval(() => {
      this.logger.debug(
        '[DEBUG] setInterval 콜백 실행됨 - scanPendingTransactions 호출',
      );
      this.scanPendingTransactions();
    }, 1000);

    this.logger.log('MEV 기회 감지가 시작되었습니다');
    this.logger.log(
      `[DEBUG] monitoringInterval 설정됨: ${!!this.monitoringInterval}`,
    );
    this.eventEmitter.emit('mev.detection.started', { config });
  }

  /**
   * MEV 기회 감지 중지
   */
  stopDetection(): void {
    if (!this.isMonitoring) {
      this.logger.warn('MEV 감지가 실행 중이 아닙니다');
      return;
    }

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.logger.log('MEV 기회 감지가 중지되었습니다');
    this.eventEmitter.emit('mev.detection.stopped');
  }

  /**
   * PENDING 트랜잭션 스캔
   */
  private async scanPendingTransactions(): Promise<void> {
    try {
      this.logger.debug('[DEBUG] scanPendingTransactions 시작');
      const pendingTxs = this.transactionPoolService.getPendingTransactions();
      this.logger.debug(
        `[DEBUG] 현재 Pending 트랜잭션 수: ${pendingTxs.length}`,
      );

      for (const tx of pendingTxs) {
        this.logger.debug(`[DEBUG] 트랜잭션 ${tx.id} 분석 중...`);
        // 이미 분석한 트랜잭션은 스킵
        if (this.opportunities.has(tx.id)) {
          this.logger.debug(`[DEBUG] 트랜잭션 ${tx.id}는 이미 분석됨. 스킵.`);
          continue;
        }

        // MEV 기회 감지 시도
        const opportunity = await this.detectOpportunity(tx);
        if (opportunity) {
          this.opportunities.set(opportunity.id, opportunity);
          this.logger.log(
            `MEV 기회 감지: ${opportunity.id} (${opportunity.strategy})`,
          );
          this.eventEmitter.emit('mev.opportunity.detected', opportunity);
        } else {
          this.logger.debug(`[DEBUG] 트랜잭션 ${tx.id}에서 MEV 기회 없음`);
        }
      }
    } catch (error) {
      this.logger.error('트랜잭션 스캔 중 오류 발생:', error);
    }
  }

  /**
   * 개별 트랜잭션에서 MEV 기회 감지
   */
  private async detectOpportunity(
    transaction: Transaction,
  ): Promise<MEVOpportunity | null> {
    try {
      this.logger.debug(`[DEBUG] detectOpportunity 시작: ${transaction.id}`);

      // 트랜잭션 타입이 SWAP이 아니면 스킵
      if (transaction.type !== TransactionType.SWAP) {
        this.logger.debug(
          `[DEBUG] 트랜잭션 ${transaction.id}는 SWAP이 아님: ${transaction.type}`,
        );
        return null;
      }

      // 파싱된 데이터 확인
      if (!transaction.parsedData) {
        this.logger.debug(
          `[DEBUG] 트랜잭션 ${transaction.id}에 parsedData 없음`,
        );
        return null;
      }

      // 기본 조건 확인
      if (!this.meetsBasicCriteria(transaction)) {
        this.logger.debug(
          `[DEBUG] 트랜잭션 ${transaction.id}가 기본 기준을 만족하지 못함`,
        );
        return null;
      }

      this.logger.debug(
        `[DEBUG] 트랜잭션 ${transaction.id} 기본 기준 통과, 기회 분석 시작`,
      );

      // 풀 정보 가져오기 (임시로 기본값 사용)
      // TODO: 구체화 시 this.poolService.getPoolInfo(transaction.to) 사용
      const poolInfo = {
        totalLiquidity: 1000, // 1000 ETH
        token0: 'ETH',
        token1: 'USDC',
      };

      // 기회 분석 수행
      const analysis = await this.analyzeOpportunity(transaction, poolInfo);
      if (!analysis || analysis.recommendedAction.action !== 'EXECUTE') {
        return null;
      }

      // MEV 기회 생성
      const opportunity: MEVOpportunity = {
        id: `mev_${transaction.id}_${Date.now()}`,
        targetTransactionId: transaction.id,
        targetPoolAddress: transaction.to,
        strategy: analysis.recommendedAction.strategy!,
        estimatedProfit:
          analysis.strategyAnalysis.find(
            (s) => s.strategy === analysis.recommendedAction.strategy,
          )?.expectedProfit || 0,
        riskLevel: analysis.detection.riskAssessment.score,
        gasCost:
          analysis.strategyAnalysis.find(
            (s) => s.strategy === analysis.recommendedAction.strategy,
          )?.gasCost || 0,
        netProfit:
          analysis.strategyAnalysis.find(
            (s) => s.strategy === analysis.recommendedAction.strategy,
          )?.netProfit || 0,
        confidence: analysis.confidence,
        status: MEVOpportunityStatus.DETECTED,
        detectedAt: new Date(),
        expiresAt: new Date(Date.now() + 30000), // 30초 후 만료
      };

      return opportunity;
    } catch (error) {
      this.logger.error(
        `MEV 기회 감지 중 오류 발생 (${transaction.id}):`,
        error,
      );
      return null;
    }
  }

  /**
   * 기본 감지 기준 확인
   */
  private meetsBasicCriteria(transaction: Transaction): boolean {
    // 트랜잭션 가치 확인 (DEX 스왑의 경우 parsedData에서 실제 스왑 금액을 가져옴)
    const txValue = transaction.parsedData?.params?.amountSpecified
      ? parseFloat(transaction.parsedData.params.amountSpecified) / 1e18
      : parseFloat(transaction.value) / 1e18;

    this.logger.debug(
      `[DEBUG] 트랜잭션 ${transaction.id} 가치: ${txValue.toFixed(4)} ETH (기준: ${this.detectionCriteria.minTransactionValue} ETH)`,
    );

    if (txValue < this.detectionCriteria.minTransactionValue) {
      this.logger.debug(
        `[DEBUG] 트랜잭션 ${transaction.id} 가치 부족: ${txValue.toFixed(4)} < ${this.detectionCriteria.minTransactionValue}`,
      );
      return false;
    }

    // 가스 가격 확인 (gwei 단위) - 디버깅 로그 추가
    this.logger.debug(
      `[DEBUG] 트랜잭션 ${transaction.id} 원본 gasPrice: ${transaction.gasPrice}`,
    );
    // transaction.gasPrice는 이미 gwei 단위이므로 변환 불필요
    const gasPriceGwei = transaction.gasPrice;
    this.logger.debug(
      `[DEBUG] 트랜잭션 ${transaction.id} 가스 가격: ${gasPriceGwei.toFixed(0)} gwei (기준: ${this.detectionCriteria.minGasPrice} gwei)`,
    );

    if (gasPriceGwei < this.detectionCriteria.minGasPrice) {
      this.logger.debug(
        `[DEBUG] 트랜잭션 ${transaction.id} 가스 가격 부족: ${gasPriceGwei.toFixed(0)} < ${this.detectionCriteria.minGasPrice}`,
      );
      return false;
    }

    this.logger.debug(`[DEBUG] 트랜잭션 ${transaction.id} 기본 기준 통과`);
    return true;
  }

  /**
   * 기회 분석 수행
   */
  private async analyzeOpportunity(
    transaction: Transaction,
    poolInfo: any,
  ): Promise<OpportunityAnalysis | null> {
    try {
      // 감지 정보 생성
      const detection: MEVOpportunityDetection = {
        id: `detection_${transaction.id}`,
        targetTransactionId: transaction.id,
        targetPoolAddress: transaction.to,
        detectedAt: new Date(),
        confidence: 0.8, // 기본 신뢰도
        potentialStrategies: [
          MEVStrategyType.FRONT_RUN,
          MEVStrategyType.BACK_RUN,
          MEVStrategyType.SANDWICH,
        ],
        estimatedProfit: 0,
        riskAssessment: this.assessRisk(transaction, poolInfo),
        marketImpact: this.calculateMarketImpact(transaction, poolInfo),
        executionWindow: this.calculateExecutionWindow(transaction),
      };

      // 전략 분석
      const strategyAnalysis: StrategyAnalysis[] = [];

      // Front-run 전략 분석
      const frontRunAnalysis = this.analyzeFrontRunStrategy(
        transaction,
        poolInfo,
      );
      if (frontRunAnalysis) {
        strategyAnalysis.push(frontRunAnalysis);
      }

      // Back-run 전략 분석
      const backRunAnalysis = this.analyzeBackRunStrategy(
        transaction,
        poolInfo,
      );
      if (backRunAnalysis) {
        strategyAnalysis.push(backRunAnalysis);
      }

      // Sandwich 전략 분석
      const sandwichAnalysis = this.analyzeSandwichStrategy(
        transaction,
        poolInfo,
      );
      if (sandwichAnalysis) {
        strategyAnalysis.push(sandwichAnalysis);
      }

      // 권장 액션 결정
      const recommendedAction =
        this.determineRecommendedAction(strategyAnalysis);

      return {
        detection,
        strategyAnalysis,
        recommendedAction,
        confidence: Math.max(
          ...strategyAnalysis.map((s) => s.successProbability),
        ),
        lastUpdated: new Date(),
      };
    } catch (error) {
      this.logger.error('기회 분석 중 오류 발생:', error);
      return null;
    }
  }

  /**
   * 리스크 평가
   */
  private assessRisk(transaction: Transaction, poolInfo: any): RiskAssessment {
    const factors: any[] = [];
    let totalRiskScore = 0;

    // 가스 가격 리스크
    const gasPriceRisk = Math.min(transaction.gasPrice / 1e9 / 100, 10);
    factors.push({
      type: 'GAS_PRICE',
      severity: gasPriceRisk,
      description: `높은 가스 가격: ${(transaction.gasPrice / 1e9).toFixed(0)} gwei`,
      impact: gasPriceRisk * 0.01,
    });
    totalRiskScore += gasPriceRisk;

    // 유동성 리스크
    const liquidityRisk = Math.max(0, 10 - poolInfo.totalLiquidity / 100);
    factors.push({
      type: 'LIQUIDITY',
      severity: liquidityRisk,
      description: `낮은 유동성: ${poolInfo.totalLiquidity.toFixed(2)} ETH`,
      impact: liquidityRisk * 0.05,
    });
    totalRiskScore += liquidityRisk;

    const riskLevel =
      totalRiskScore > 7 ? 'HIGH' : totalRiskScore > 4 ? 'MEDIUM' : 'LOW';

    return {
      level: riskLevel as any,
      score: Math.min(totalRiskScore, 10),
      factors,
      mitigation: ['가스 가격 모니터링', '유동성 확인', '슬리피지 제한'],
    };
  }

  /**
   * 시장 영향도 계산
   */
  private calculateMarketImpact(
    transaction: Transaction,
    poolInfo: any,
  ): MarketImpact {
    // DEX 스왑 트랜잭션의 경우 parsedData에서 실제 스왑 금액을 가져옴
    const txValue = transaction.parsedData?.params?.amountSpecified
      ? parseFloat(transaction.parsedData.params.amountSpecified) / 1e18
      : parseFloat(transaction.value) / 1e18;
    const priceImpact = (txValue / poolInfo.totalLiquidity) * 100;
    const liquidityImpact = Math.min(priceImpact * 2, 100);
    const volumeImpact = Math.min(priceImpact * 1.5, 100);

    return {
      priceImpact,
      liquidityImpact,
      volumeImpact,
      estimatedSlippage: Math.min(priceImpact * 0.5, 5),
    };
  }

  /**
   * 실행 윈도우 계산
   */
  private calculateExecutionWindow(transaction: Transaction): ExecutionWindow {
    const now = new Date();
    const endTime = new Date(now.getTime() + 30000); // 30초 후
    const urgency = transaction.gasPrice > 300e9 ? 'HIGH' : 'MEDIUM';

    return {
      startTime: now,
      endTime,
      duration: 30000,
      urgency: urgency as any,
      timeToExpiry: 30000,
    };
  }

  /**
   * Front-run 전략 분석
   */
  private analyzeFrontRunStrategy(
    transaction: Transaction,
    poolInfo: any,
  ): StrategyAnalysis | null {
    // DEX 스왑 트랜잭션의 경우 parsedData에서 실제 스왑 금액을 가져옴
    const txValue = transaction.parsedData?.params?.amountSpecified
      ? parseFloat(transaction.parsedData.params.amountSpecified) / 1e18
      : parseFloat(transaction.value) / 1e18;
    const expectedProfit = txValue * 0.02; // 2% 수익 가정 (실제 MEV와 유사)
    const gasCost = 0.01; // 0.01 ETH 가스비 가정 (실제 MEV와 유사)
    const netProfit = expectedProfit - gasCost;

    if (netProfit < this.detectionCriteria.minProfitThreshold) {
      return null;
    }

    return {
      strategy: MEVStrategyType.FRONT_RUN,
      feasibility: 0.8,
      expectedProfit,
      riskLevel: 6,
      gasCost,
      netProfit,
      executionComplexity: 'MODERATE',
      successProbability: 0.7,
      requirements: ['높은 가스 가격', '충분한 유동성'],
    };
  }

  /**
   * Back-run 전략 분석
   */
  private analyzeBackRunStrategy(
    transaction: Transaction,
    poolInfo: any,
  ): StrategyAnalysis | null {
    // DEX 스왑 트랜잭션의 경우 parsedData에서 실제 스왑 금액을 가져옴
    const txValue = transaction.parsedData?.params?.amountSpecified
      ? parseFloat(transaction.parsedData.params.amountSpecified) / 1e18
      : parseFloat(transaction.value) / 1e18;
    const expectedProfit = txValue * 0.015; // 1.5% 수익 가정 (실제 MEV와 유사)
    const gasCost = 0.008; // 0.008 ETH 가스비 가정 (실제 MEV와 유사)
    const netProfit = expectedProfit - gasCost;

    if (netProfit < this.detectionCriteria.minProfitThreshold) {
      return null;
    }

    return {
      strategy: MEVStrategyType.BACK_RUN,
      feasibility: 0.7,
      expectedProfit,
      riskLevel: 5,
      gasCost,
      netProfit,
      executionComplexity: 'SIMPLE',
      successProbability: 0.6,
      requirements: ['적절한 타이밍', '가격 하락 예측'],
    };
  }

  /**
   * Sandwich 전략 분석
   */
  private analyzeSandwichStrategy(
    transaction: Transaction,
    poolInfo: any,
  ): StrategyAnalysis | null {
    // DEX 스왑 트랜잭션의 경우 parsedData에서 실제 스왑 금액을 가져옴
    const txValue = transaction.parsedData?.params?.amountSpecified
      ? parseFloat(transaction.parsedData.params.amountSpecified) / 1e18
      : parseFloat(transaction.value) / 1e18;
    const expectedProfit = txValue * 0.03; // 3% 수익 가정 (실제 MEV와 유사)
    const gasCost = 0.02; // 0.02 ETH 가스비 가정 (실제 MEV와 유사)
    const netProfit = expectedProfit - gasCost;

    if (netProfit < this.detectionCriteria.minProfitThreshold) {
      return null;
    }

    return {
      strategy: MEVStrategyType.SANDWICH,
      feasibility: 0.6,
      expectedProfit,
      riskLevel: 8,
      gasCost,
      netProfit,
      executionComplexity: 'COMPLEX',
      successProbability: 0.5,
      requirements: ['정확한 타이밍', '높은 가스 가격', '충분한 자본'],
    };
  }

  /**
   * 권장 액션 결정
   */
  private determineRecommendedAction(
    strategyAnalysis: StrategyAnalysis[],
  ): RecommendedAction {
    if (strategyAnalysis.length === 0) {
      return {
        action: 'SKIP',
        reason: '실행 가능한 전략이 없습니다',
        confidence: 0,
        expectedOutcome: { profit: 0, risk: 0, timeToExecute: 0 },
      };
    }

    // 가장 높은 netProfit을 가진 전략 선택
    const bestStrategy = strategyAnalysis.reduce((best, current) =>
      current.netProfit > best.netProfit ? current : best,
    );

    if (bestStrategy.netProfit < this.detectionCriteria.minProfitThreshold) {
      return {
        action: 'SKIP',
        reason: '수익이 임계값보다 낮습니다',
        confidence: 0,
        expectedOutcome: { profit: 0, risk: 0, timeToExecute: 0 },
      };
    }

    return {
      action: 'EXECUTE',
      strategy: bestStrategy.strategy,
      reason: `최고 수익 전략: ${bestStrategy.strategy}`,
      confidence: bestStrategy.successProbability,
      expectedOutcome: {
        profit: bestStrategy.expectedProfit,
        risk: bestStrategy.riskLevel,
        timeToExecute: 5000, // 5초
      },
    };
  }

  /**
   * 감지된 기회 목록 조회
   */
  getOpportunities(): MEVOpportunity[] {
    return Array.from(this.opportunities.values());
  }

  /**
   * 특정 기회 조회
   */
  getOpportunity(id: string): MEVOpportunity | undefined {
    return this.opportunities.get(id);
  }

  /**
   * 기회 제거
   */
  removeOpportunity(id: string): boolean {
    return this.opportunities.delete(id);
  }

  /**
   * 감지 상태 조회
   */
  isDetectionActive(): boolean {
    return this.isMonitoring;
  }

  /**
   * 감지 기준 업데이트
   */
  updateDetectionCriteria(criteria: Partial<MEVDetectionCriteria>): void {
    this.detectionCriteria = { ...this.detectionCriteria, ...criteria };
    this.logger.log('MEV 감지 기준이 업데이트되었습니다');
  }
}
