/**
 * MEV 기회 감지 관련 인터페이스 정의
 * MEV 기회를 감지하고 분석하기 위한 타입 정의
 */

import { MEVStrategyType, MEVOpportunityStatus } from './mev.interface';

/**
 * MEV 기회 감지 결과
 */
export interface MEVOpportunityDetection {
  id: string;
  targetTransactionId: string;
  targetPoolAddress: string;
  detectedAt: Date;
  confidence: number; // 0-1 스케일
  potentialStrategies: MEVStrategyType[];
  estimatedProfit: number;
  riskAssessment: RiskAssessment;
  marketImpact: MarketImpact;
  executionWindow: ExecutionWindow;
}

/**
 * 리스크 평가
 */
export interface RiskAssessment {
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  score: number; // 1-10 스케일
  factors: RiskFactor[];
  mitigation: string[];
}

/**
 * 리스크 요소
 */
export interface RiskFactor {
  type:
    | 'GAS_PRICE'
    | 'SLIPPAGE'
    | 'LIQUIDITY'
    | 'MARKET_VOLATILITY'
    | 'COMPETITION';
  severity: number; // 1-10 스케일
  description: string;
  impact: number; // 예상 손실 (ETH)
}

/**
 * 시장 영향도
 */
export interface MarketImpact {
  priceImpact: number; // 가격 영향도 (%)
  liquidityImpact: number; // 유동성 영향도 (%)
  volumeImpact: number; // 거래량 영향도 (%)
  estimatedSlippage: number; // 예상 슬리피지 (%)
}

/**
 * 실행 윈도우
 */
export interface ExecutionWindow {
  startTime: Date;
  endTime: Date;
  duration: number; // ms
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timeToExpiry: number; // ms
}

/**
 * 기회 분석 결과
 */
export interface OpportunityAnalysis {
  detection: MEVOpportunityDetection;
  strategyAnalysis: StrategyAnalysis[];
  recommendedAction: RecommendedAction;
  confidence: number;
  lastUpdated: Date;
}

/**
 * 전략 분석
 */
export interface StrategyAnalysis {
  strategy: MEVStrategyType;
  feasibility: number; // 0-1 스케일
  expectedProfit: number;
  riskLevel: number; // 1-10 스케일
  gasCost: number;
  netProfit: number;
  executionComplexity: 'SIMPLE' | 'MODERATE' | 'COMPLEX';
  successProbability: number; // 0-1 스케일
  requirements: string[];
}

/**
 * 권장 액션
 */
export interface RecommendedAction {
  action: 'EXECUTE' | 'WAIT' | 'SKIP' | 'MONITOR';
  strategy?: MEVStrategyType;
  reason: string;
  confidence: number;
  expectedOutcome: {
    profit: number;
    risk: number;
    timeToExecute: number;
  };
}

/**
 * 기회 모니터링 설정
 */
export interface OpportunityMonitoringConfig {
  enabled: boolean;
  detectionInterval: number; // ms
  maxOpportunities: number;
  minConfidence: number;
  maxRiskLevel: number;
  minProfitThreshold: number;
  monitoringPools: string[]; // 풀 주소 목록
  alertThresholds: {
    highProfit: number; // ETH
    highRisk: number; // 1-10 스케일
    lowLiquidity: number; // ETH
  };
}

/**
 * 기회 알림
 */
export interface OpportunityAlert {
  id: string;
  type: 'NEW_OPPORTUNITY' | 'OPPORTUNITY_EXPIRED' | 'HIGH_PROFIT' | 'HIGH_RISK';
  opportunityId: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  timestamp: Date;
  data: any;
}

/**
 * 기회 통계
 */
export interface OpportunityStats {
  totalDetected: number;
  totalAnalyzed: number;
  totalExecuted: number;
  totalExpired: number;
  averageConfidence: number;
  averageProfit: number;
  detectionRate: number; // 기회/시간
  successRate: number; // 실행 성공률
  timeRange: {
    start: Date;
    end: Date;
  };
  breakdown: {
    byStrategy: {
      [key in MEVStrategyType]: {
        detected: number;
        executed: number;
        successRate: number;
        averageProfit: number;
      };
    };
    byPool: {
      [poolAddress: string]: {
        detected: number;
        executed: number;
        successRate: number;
        averageProfit: number;
      };
    };
  };
}
