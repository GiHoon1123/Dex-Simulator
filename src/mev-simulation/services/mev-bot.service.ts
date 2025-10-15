/**
 * MEV 봇 서비스
 * MEV 기회를 감지하고 전략을 실행하는 자동화된 봇
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  MEVBotConfig,
  MEVBotState,
  MEVBotStatus,
  MEVOpportunity,
  MEVOpportunityStatus,
  MEVStats,
} from '../types/mev.interface';
import { StrategyExecutionResult } from '../types/strategy.interface';
import { MevDetectorService } from './mev-detector.service';
import { MevStrategyService } from './mev-strategy.service';

@Injectable()
export class MevBotService {
  private readonly logger = new Logger(MevBotService.name);
  private botState: MEVBotState;
  private executionQueue: MEVOpportunity[] = [];
  private isProcessing = false;
  private stats: MEVStats;
  private statsLogCounter = 0; // 통계 로그 출력 카운터

  constructor(
    private readonly mevDetector: MevDetectorService,
    private readonly mevStrategy: MevStrategyService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.logger.log('[DEBUG] MevBotService 생성자 호출됨');
    this.logger.log(`[DEBUG] mevDetector 주입됨: ${!!this.mevDetector}`);
    this.logger.log(`[DEBUG] mevStrategy 주입됨: ${!!this.mevStrategy}`);
    this.initializeBot();
  }

  /**
   * 봇 초기화
   */
  private initializeBot(): void {
    const defaultConfig: MEVBotConfig = {
      minProfit: 0.1, // 0.1 ETH
      maxRisk: 5.0, // 5 ETH
      gasPriceMultiplier: 1.2,
      maxOpportunities: 10,
      opportunityTimeout: 30000, // 30초
      minConfidence: 0.6,
      enabledStrategies: ['FRONT_RUN', 'BACK_RUN', 'SANDWICH'] as any,
    };

    this.botState = {
      status: MEVBotStatus.STOPPED,
      config: defaultConfig,
      activeOpportunities: [],
      totalOpportunities: 0,
      successfulAttacks: 0,
      totalProfit: 0,
      averageProfit: 0,
      successRate: 0,
      lastActivity: new Date(),
    };

    this.stats = {
      totalOpportunities: 0,
      successfulAttacks: 0,
      failedAttacks: 0,
      totalProfit: 0,
      totalGasSpent: 0,
      netProfit: 0,
      averageProfit: 0,
      successRate: 0,
      strategyBreakdown: {
        FRONT_RUN: { count: 0, profit: 0, successRate: 0 },
        BACK_RUN: { count: 0, profit: 0, successRate: 0 },
        SANDWICH: { count: 0, profit: 0, successRate: 0 },
      },
      timeRange: {
        start: new Date(),
        end: new Date(),
      },
    };

    this.logger.log('MEV 봇이 초기화되었습니다');
  }

  /**
   * 봇 시작
   */
  async startBot(config?: Partial<MEVBotConfig>): Promise<void> {
    if (this.botState.status === MEVBotStatus.RUNNING) {
      this.logger.warn('MEV 봇이 이미 실행 중입니다');
      return;
    }

    try {
      // 설정 업데이트
      if (config) {
        this.botState.config = { ...this.botState.config, ...config };
      }

      // 봇 상태 업데이트
      this.botState.status = MEVBotStatus.RUNNING;
      this.botState.lastActivity = new Date();

      // MEV 감지 시작
      this.logger.log('[DEBUG] MevDetectorService.startDetection 호출 시작');
      this.logger.log(`[DEBUG] mevDetector 객체: ${this.mevDetector}`);
      this.logger.log(
        `[DEBUG] config: ${JSON.stringify(this.botState.config)}`,
      );
      this.mevDetector.startDetection(this.botState.config);
      this.logger.log('[DEBUG] MevDetectorService.startDetection 호출 완료');

      // 기회 처리 시작
      this.startOpportunityProcessing();

      // 이벤트 리스너 등록
      this.registerEventListeners();

      this.logger.log('MEV 봇이 시작되었습니다');
      this.eventEmitter.emit('mev.bot.started', {
        config: this.botState.config,
      });
    } catch (error) {
      this.logger.error('MEV 봇 시작 중 오류 발생:', error);
      this.botState.status = MEVBotStatus.ERROR;
      this.botState.errorMessage = error.message;
      throw error;
    }
  }

  /**
   * 봇 중지
   */
  async stopBot(): Promise<void> {
    if (this.botState.status === MEVBotStatus.STOPPED) {
      this.logger.warn('MEV 봇이 이미 중지되어 있습니다');
      return;
    }

    try {
      // 봇 상태 업데이트
      this.botState.status = MEVBotStatus.STOPPED;
      this.botState.lastActivity = new Date();

      // MEV 감지 중지
      this.mevDetector.stopDetection();

      // 기회 처리 중지
      this.stopOpportunityProcessing();

      // 이벤트 리스너 제거
      this.unregisterEventListeners();

      // 활성 기회 정리
      this.cleanupActiveOpportunities();

      this.logger.log('MEV 봇이 중지되었습니다');
      this.eventEmitter.emit('mev.bot.stopped');
    } catch (error) {
      this.logger.error('MEV 봇 중지 중 오류 발생:', error);
      this.botState.status = MEVBotStatus.ERROR;
      this.botState.errorMessage = error.message;
      throw error;
    }
  }

  /**
   * 봇 일시정지
   */
  pauseBot(): void {
    if (this.botState.status !== MEVBotStatus.RUNNING) {
      this.logger.warn('실행 중인 봇만 일시정지할 수 있습니다');
      return;
    }

    this.botState.status = MEVBotStatus.PAUSED;
    this.botState.lastActivity = new Date();

    this.logger.log('MEV 봇이 일시정지되었습니다');
    this.eventEmitter.emit('mev.bot.paused');
  }

  /**
   * 봇 재개
   */
  resumeBot(): void {
    if (this.botState.status !== MEVBotStatus.PAUSED) {
      this.logger.warn('일시정지된 봇만 재개할 수 있습니다');
      return;
    }

    this.botState.status = MEVBotStatus.RUNNING;
    this.botState.lastActivity = new Date();

    this.logger.log('MEV 봇이 재개되었습니다');
    this.eventEmitter.emit('mev.bot.resumed');
  }

  /**
   * 기회 처리 시작
   */
  private startOpportunityProcessing(): void {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    this.processOpportunityQueue();
  }

  /**
   * 기회 처리 중지
   */
  private stopOpportunityProcessing(): void {
    this.isProcessing = false;
  }

  /**
   * 기회 큐 처리
   */
  private async processOpportunityQueue(): Promise<void> {
    while (this.isProcessing && this.botState.status === MEVBotStatus.RUNNING) {
      try {
        // 만료된 기회 정리
        this.cleanupExpiredOpportunities();

        // 새로운 기회 확인
        const newOpportunities = this.mevDetector.getOpportunities();
        for (const opportunity of newOpportunities) {
          if (
            !this.botState.activeOpportunities.find(
              (o) => o.id === opportunity.id,
            )
          ) {
            this.addOpportunityToQueue(opportunity);
          }
        }

        // 큐에서 기회 처리
        if (this.executionQueue.length > 0) {
          const opportunity = this.executionQueue.shift()!;
          await this.executeOpportunity(opportunity);
        }

        // 30초마다 통계 로그 출력
        this.statsLogCounter++;
        if (this.statsLogCounter >= 30) {
          this.logger.log(
            `📊 MEV 통계 | 기회: ${this.stats.totalOpportunities} | 성공: ${this.stats.successfulAttacks} (${this.stats.successRate.toFixed(1)}%) | 순수익: ${this.stats.netProfit.toFixed(4)} ETH`,
          );
          this.statsLogCounter = 0;
        }

        // 1초 대기
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        this.logger.error('기회 처리 중 오류 발생:', error);
        await new Promise((resolve) => setTimeout(resolve, 5000)); // 5초 대기 후 재시도
      }
    }
  }

  /**
   * 기회를 큐에 추가
   */
  private addOpportunityToQueue(opportunity: MEVOpportunity): void {
    // 설정 조건 확인
    if (!this.shouldExecuteOpportunity(opportunity)) {
      return;
    }

    // 최대 기회 수 확인
    if (
      this.botState.activeOpportunities.length >=
      this.botState.config.maxOpportunities
    ) {
      this.logger.warn('최대 기회 수에 도달했습니다');
      return;
    }

    // 큐에 추가
    this.executionQueue.push(opportunity);
    this.botState.activeOpportunities.push(opportunity);
    this.botState.totalOpportunities++;

    this.eventEmitter.emit('mev.opportunity.queued', opportunity);
  }

  /**
   * 기회 실행 여부 결정
   */
  private shouldExecuteOpportunity(opportunity: MEVOpportunity): boolean {
    // 최소 수익 확인
    if (opportunity.estimatedProfit < this.botState.config.minProfit) {
      return false;
    }

    // 최대 리스크 확인
    if (opportunity.riskLevel > this.botState.config.maxRisk) {
      return false;
    }

    // 최소 신뢰도 확인
    if (opportunity.confidence < this.botState.config.minConfidence) {
      return false;
    }

    // 활성화된 전략 확인
    if (
      !this.botState.config.enabledStrategies.includes(opportunity.strategy)
    ) {
      return false;
    }

    return true;
  }

  /**
   * 기회 실행
   */
  private async executeOpportunity(opportunity: MEVOpportunity): Promise<void> {
    try {
      this.logger.debug(
        `기회 실행 시작: ${opportunity.id} (${opportunity.strategy})`,
      );

      // 기회 상태 업데이트
      opportunity.status = MEVOpportunityStatus.EXECUTING;

      // 전략 실행
      const result = await this.mevStrategy.executeStrategy(opportunity);

      // 결과 처리
      await this.processExecutionResult(opportunity, result);

      // 기회 상태 업데이트
      opportunity.status = result.success
        ? MEVOpportunityStatus.COMPLETED
        : MEVOpportunityStatus.FAILED;

      // 성공한 경우에만 로그 출력 (5번에 1번만)
      if (result.success && Math.random() < 0.2) {
        this.logger.log(
          `✅ MEV 성공: ${opportunity.strategy} - 수익: ${result.netProfit.toFixed(4)} ETH`,
        );
      }
    } catch (error) {
      this.logger.error(`기회 실행 중 오류 발생 (${opportunity.id}):`, error);
      opportunity.status = MEVOpportunityStatus.FAILED;
      opportunity.errorMessage = error.message;
    } finally {
      // 활성 기회 목록에서 제거
      this.botState.activeOpportunities =
        this.botState.activeOpportunities.filter(
          (o) => o.id !== opportunity.id,
        );

      // MevDetectorService의 opportunities Map에서도 제거 (메모리 누수 방지)
      this.mevDetector.removeOpportunity(opportunity.id);
    }
  }

  /**
   * 실행 결과 처리
   */
  private async processExecutionResult(
    opportunity: MEVOpportunity,
    result: StrategyExecutionResult,
  ): Promise<void> {
    // 통계 업데이트
    this.updateStats(opportunity, result);

    // 봇 상태 업데이트
    this.updateBotState(opportunity, result);

    // 이벤트 발생
    this.eventEmitter.emit('mev.opportunity.executed', {
      opportunity,
      result,
    });
  }

  /**
   * 통계 업데이트
   */
  private updateStats(
    opportunity: MEVOpportunity,
    result: StrategyExecutionResult,
  ): void {
    this.stats.totalOpportunities++;

    if (result.success) {
      this.stats.successfulAttacks++;
      this.stats.totalProfit += result.profit;
      this.stats.totalGasSpent += result.gasUsed;
      this.stats.netProfit += result.netProfit;

      // 전략별 통계 업데이트
      const strategyStats = this.stats.strategyBreakdown[opportunity.strategy];
      strategyStats.count++;
      strategyStats.profit += result.profit;
      strategyStats.successRate =
        strategyStats.count > 0
          ? (strategyStats.count / this.stats.totalOpportunities) * 100
          : 0;
    } else {
      this.stats.failedAttacks++;
    }

    // 전체 통계 업데이트
    this.stats.averageProfit =
      this.stats.totalOpportunities > 0
        ? this.stats.totalProfit / this.stats.totalOpportunities
        : 0;
    this.stats.successRate =
      this.stats.totalOpportunities > 0
        ? (this.stats.successfulAttacks / this.stats.totalOpportunities) * 100
        : 0;
    this.stats.timeRange.end = new Date();
  }

  /**
   * 봇 상태 업데이트
   */
  private updateBotState(
    opportunity: MEVOpportunity,
    result: StrategyExecutionResult,
  ): void {
    if (result.success) {
      this.botState.successfulAttacks++;
      this.botState.totalProfit += result.netProfit;
    }

    this.botState.averageProfit =
      this.botState.totalOpportunities > 0
        ? this.botState.totalProfit / this.botState.totalOpportunities
        : 0;
    this.botState.successRate =
      this.botState.totalOpportunities > 0
        ? (this.botState.successfulAttacks / this.botState.totalOpportunities) *
          100
        : 0;
    this.botState.lastActivity = new Date();
  }

  /**
   * 만료된 기회 정리
   */
  private cleanupExpiredOpportunities(): void {
    const now = new Date();
    const expiredOpportunities = this.botState.activeOpportunities.filter(
      (o) => o.expiresAt < now,
    );

    for (const opportunity of expiredOpportunities) {
      opportunity.status = MEVOpportunityStatus.EXPIRED;
      this.botState.activeOpportunities =
        this.botState.activeOpportunities.filter(
          (o) => o.id !== opportunity.id,
        );

      // MevDetectorService의 opportunities Map에서도 제거 (메모리 누수 방지)
      this.mevDetector.removeOpportunity(opportunity.id);

      this.logger.debug(`만료된 기회 제거: ${opportunity.id}`);
    }
  }

  /**
   * 활성 기회 정리
   */
  private cleanupActiveOpportunities(): void {
    for (const opportunity of this.botState.activeOpportunities) {
      opportunity.status = MEVOpportunityStatus.EXPIRED;
      // MevDetectorService의 opportunities Map에서도 제거 (메모리 누수 방지)
      this.mevDetector.removeOpportunity(opportunity.id);
    }
    this.botState.activeOpportunities = [];
    this.executionQueue = [];
  }

  /**
   * 이벤트 리스너 등록
   */
  private registerEventListeners(): void {
    this.eventEmitter.on(
      'mev.opportunity.detected',
      (opportunity: MEVOpportunity) => {
        this.logger.log(`새로운 MEV 기회 감지: ${opportunity.id}`);
      },
    );
  }

  /**
   * 이벤트 리스너 제거
   */
  private unregisterEventListeners(): void {
    this.eventEmitter.removeAllListeners('mev.opportunity.detected');
  }

  /**
   * 봇 상태 조회
   */
  getBotState(): MEVBotState {
    return { ...this.botState };
  }

  /**
   * 봇 통계 조회
   */
  getStats(): MEVStats {
    return { ...this.stats };
  }

  /**
   * 봇 설정 업데이트
   */
  updateConfig(config: Partial<MEVBotConfig>): void {
    this.botState.config = { ...this.botState.config, ...config };
    this.logger.log('봇 설정이 업데이트되었습니다');
    this.eventEmitter.emit('mev.bot.config.updated', {
      config: this.botState.config,
    });
  }

  /**
   * 활성 기회 목록 조회
   */
  getActiveOpportunities(): MEVOpportunity[] {
    return [...this.botState.activeOpportunities];
  }

  /**
   * 실행 큐 상태 조회
   */
  getQueueStatus(): { queueLength: number; isProcessing: boolean } {
    return {
      queueLength: this.executionQueue.length,
      isProcessing: this.isProcessing,
    };
  }
}
