/**
 * MEV (Maximal Extractable Value) 관련 인터페이스 정의
 * MEV 공격 시뮬레이션을 위한 타입 정의
 */

export enum MEVStrategyType {
  FRONT_RUN = 'FRONT_RUN',
  BACK_RUN = 'BACK_RUN',
  SANDWICH = 'SANDWICH',
}

export enum MEVOpportunityStatus {
  DETECTED = 'DETECTED',
  ANALYZING = 'ANALYZING',
  EXECUTING = 'EXECUTING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
}

export enum MEVBotStatus {
  STOPPED = 'STOPPED',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  ERROR = 'ERROR',
}

/**
 * MEV 기회 정보
 */
export interface MEVOpportunity {
  id: string;
  targetTransactionId: string;
  targetPoolAddress: string;
  strategy: MEVStrategyType;
  estimatedProfit: number; // ETH 단위
  riskLevel: number; // 1-10 스케일
  gasCost: number; // ETH 단위
  netProfit: number; // estimatedProfit - gasCost
  confidence: number; // 0-1 스케일
  status: MEVOpportunityStatus;
  detectedAt: Date;
  expiresAt: Date;
  executionData?: MEVExecutionData;
  errorMessage?: string;
}

/**
 * MEV 실행 데이터
 */
export interface MEVExecutionData {
  frontRunTransaction?: TransactionData;
  backRunTransaction?: TransactionData;
  sandwichTransactions?: {
    frontRun: TransactionData;
    backRun: TransactionData;
  };
  expectedOutcome: {
    profit: number;
    gasUsed: number;
    slippage: number;
  };
}

/**
 * 트랜잭션 데이터 (MEV 공격용)
 */
export interface TransactionData {
  to: string;
  value: string;
  data: string;
  gasPrice: number;
  gasLimit: number;
  nonce: number;
}

/**
 * MEV 봇 설정
 */
export interface MEVBotConfig {
  minProfit: number; // 최소 수익 (ETH)
  maxRisk: number; // 최대 리스크 (ETH)
  gasPriceMultiplier: number; // 가스 가격 배수
  maxOpportunities: number; // 최대 동시 기회 수
  opportunityTimeout: number; // 기회 만료 시간 (ms)
  minConfidence: number; // 최소 신뢰도 (0-1)
  enabledStrategies: MEVStrategyType[]; // 활성화된 전략
}

/**
 * MEV 봇 상태
 */
export interface MEVBotState {
  status: MEVBotStatus;
  config: MEVBotConfig;
  activeOpportunities: MEVOpportunity[];
  totalOpportunities: number;
  successfulAttacks: number;
  totalProfit: number;
  averageProfit: number;
  successRate: number;
  lastActivity: Date;
  errorMessage?: string;
}

/**
 * MEV 통계
 */
export interface MEVStats {
  totalOpportunities: number;
  successfulAttacks: number;
  failedAttacks: number;
  totalProfit: number; // ETH
  totalGasSpent: number; // ETH
  netProfit: number; // totalProfit - totalGasSpent
  averageProfit: number; // ETH
  successRate: number; // 0-1
  strategyBreakdown: {
    [key in MEVStrategyType]: {
      count: number;
      profit: number;
      successRate: number;
    };
  };
  timeRange: {
    start: Date;
    end: Date;
  };
}

/**
 * MEV 기회 감지 조건
 */
export interface MEVDetectionCriteria {
  minTransactionValue: number; // 최소 트랜잭션 가치 (ETH)
  minGasPrice: number; // 최소 가스 가격 (gwei)
  minSlippage: number; // 최소 슬리피지 (%)
  maxPoolImpact: number; // 최대 풀 영향도 (%)
  minProfitThreshold: number; // 최소 수익 임계값 (ETH)
}

/**
 * MEV 전략 실행 결과
 */
export interface MEVStrategyResult {
  success: boolean;
  profit: number;
  gasUsed: number;
  netProfit: number;
  executionTime: number; // ms
  errorMessage?: string;
  transactionHashes?: string[];
}
