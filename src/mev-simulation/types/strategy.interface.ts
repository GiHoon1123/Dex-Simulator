/**
 * MEV 전략 관련 인터페이스 정의
 * 각 MEV 전략의 구체적인 구현을 위한 타입 정의
 */

import { MEVStrategyType, MEVOpportunity, TransactionData } from './mev.interface';

/**
 * MEV 전략 기본 인터페이스
 */
export interface MEVStrategy {
  type: MEVStrategyType;
  name: string;
  description: string;
  canExecute(opportunity: MEVOpportunity): boolean;
  calculateProfit(opportunity: MEVOpportunity): number;
  generateTransactions(opportunity: MEVOpportunity): TransactionData[];
  estimateGasCost(opportunity: MEVOpportunity): number;
}

/**
 * Front-running 전략
 * 피해자 트랜잭션보다 먼저 실행하여 가격 상승 후 매도
 */
export interface FrontRunStrategy extends MEVStrategy {
  type: MEVStrategyType.FRONT_RUN;
  buyAmount: number; // 매수할 토큰 양
  expectedPriceIncrease: number; // 예상 가격 상승률
  sellThreshold: number; // 매도 임계값
}

/**
 * Back-running 전략
 * 피해자 트랜잭션 실행 후 가격 하락을 이용하여 매수
 */
export interface BackRunStrategy extends MEVStrategy {
  type: MEVStrategyType.BACK_RUN;
  waitTime: number; // 대기 시간 (ms)
  buyAmount: number; // 매수할 토큰 양
  expectedPriceDecrease: number; // 예상 가격 하락률
}

/**
 * Sandwich 공격 전략
 * 피해자 트랜잭션 앞뒤로 거래하여 슬리피지 수익
 */
export interface SandwichStrategy extends MEVStrategy {
  type: MEVStrategyType.SANDWICH;
  frontRunAmount: number; // 프론트런 거래량
  backRunAmount: number; // 백런 거래량
  maxSlippage: number; // 최대 허용 슬리피지
  minProfitMargin: number; // 최소 수익 마진
}

/**
 * 전략 실행 컨텍스트
 */
export interface StrategyExecutionContext {
  opportunity: MEVOpportunity;
  currentPoolState: any; // 풀 현재 상태
  marketConditions: MarketConditions;
  gasPrice: number;
  blockNumber: number;
  timestamp: Date;
}

/**
 * 시장 조건
 */
export interface MarketConditions {
  volatility: number; // 변동성 (0-1)
  liquidity: number; // 유동성 (ETH)
  tradingVolume: number; // 거래량 (ETH)
  priceTrend: 'UP' | 'DOWN' | 'SIDEWAYS'; // 가격 추세
}

/**
 * 전략 실행 결과
 */
export interface StrategyExecutionResult {
  strategy: MEVStrategyType;
  success: boolean;
  profit: number;
  gasUsed: number;
  netProfit: number;
  executionTime: number;
  transactions: {
    submitted: TransactionData[];
    confirmed: string[]; // 트랜잭션 해시
    failed: string[];
  };
  errorMessage?: string;
  metadata: {
    poolAddress: string;
    targetTransactionId: string;
    strategyParams: any;
  };
}

/**
 * 전략 성능 메트릭
 */
export interface StrategyMetrics {
  strategy: MEVStrategyType;
  totalExecutions: number;
  successfulExecutions: number;
  totalProfit: number;
  averageProfit: number;
  successRate: number;
  averageExecutionTime: number;
  bestProfit: number;
  worstLoss: number;
  lastExecution: Date;
}

/**
 * 전략 비교 결과
 */
export interface StrategyComparison {
  opportunity: MEVOpportunity;
  strategies: {
    [key in MEVStrategyType]: {
      canExecute: boolean;
      estimatedProfit: number;
      riskLevel: number;
      confidence: number;
      gasCost: number;
      netProfit: number;
    };
  };
  recommendedStrategy: MEVStrategyType;
  reason: string;
}
