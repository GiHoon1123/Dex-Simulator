/**
 * 풀 오라클 관련 타입 정의
 *
 * 풀 내부 가격과 외부 가격을 관리하고
 * MEV 기회를 탐지하는 오라클 시스템을 정의합니다.
 */

/**
 * 풀 가격 정보
 *
 * 특정 풀의 가격 정보를 나타냅니다.
 */
export interface PoolPrice {
  /** 풀 주소 */
  poolAddress: string;

  /** 토큰 페어 */
  pair: string;

  /** 토큰 A 심볼 */
  tokenA: string;

  /** 토큰 B 심볼 */
  tokenB: string;

  /** 풀 내부 가격 (토큰 A 기준 토큰 B 가격) */
  price: number;

  /** 역가격 (토큰 B 기준 토큰 A 가격) */
  inversePrice: number;

  /** 가격 업데이트 시간 */
  timestamp: Date;

  /** 가격 신뢰도 (0-1) */
  confidence: number;
}

/**
 * TWAP (Time Weighted Average Price) 정보
 */
export interface TWAPInfo {
  /** 풀 주소 */
  poolAddress: string;

  /** TWAP 가격 */
  twapPrice: number;

  /** TWAP 기간 (초) */
  period: number;

  /** 샘플 개수 */
  sampleCount: number;

  /** 계산 시작 시간 */
  startTime: Date;

  /** 계산 종료 시간 */
  endTime: Date;

  /** 가중치 합계 */
  totalWeight: number;
}

/**
 * 가격 편차 정보
 *
 * 풀 내부 가격과 외부 가격 간의 차이를 나타냅니다.
 */
export interface PriceDeviation {
  /** 풀 주소 */
  poolAddress: string;

  /** 풀 내부 가격 */
  poolPrice: number;

  /** 외부 가격 (오라클) */
  externalPrice: number;

  /** 절대 차이 */
  absoluteDifference: number;

  /** 상대 차이 (%) */
  relativeDifference: number;

  /** 편차 방향 */
  direction: 'pool_higher' | 'external_higher' | 'equal';

  /** 탐지 시간 */
  detectedAt: Date;

  /** MEV 기회 여부 */
  isMEVOpportunity: boolean;
}

/**
 * MEV 기회 정보
 */
export interface MEVOpportunity {
  /** 기회 ID */
  opportunityId: string;

  /** 풀 주소 */
  poolAddress: string;

  /** 토큰 페어 */
  pair: string;

  /** MEV 전략 타입 */
  strategy: 'front_run' | 'back_run' | 'sandwich' | 'arbitrage';

  /** 예상 수익률 (%) */
  expectedProfit: number;

  /** 예상 수익 (USD) */
  expectedProfitUSD: number;

  /** 필요한 가스 비용 */
  gasCost: number;

  /** 순 수익 (USD) */
  netProfit: number;

  /** 기회 탐지 시간 */
  detectedAt: Date;

  /** 만료 시간 */
  expiresAt: Date;

  /** 실행 가능 여부 */
  isExecutable: boolean;

  /** 위험도 (1-5) */
  riskLevel: number;
}

/**
 * 오라클 설정
 */
export interface OracleConfig {
  /** TWAP 계산 기간 (초) */
  twapPeriod: number;

  /** 가격 업데이트 간격 (초) */
  updateInterval: number;

  /** MEV 기회 탐지 임계값 (%) */
  mevThreshold: number;

  /** 가격 신뢰도 임계값 */
  confidenceThreshold: number;

  /** 최대 가격 편차 (%) */
  maxDeviation: number;

  /** 자동 실행 여부 */
  autoExecute: boolean;
}

/**
 * 가격 히스토리 항목
 */
export interface PriceHistoryItem {
  /** 가격 */
  price: number;

  /** 타임스탬프 */
  timestamp: Date;

  /** 거래량 */
  volume: number;

  /** 가중치 */
  weight: number;
}

/**
 * 오라클 상태 정보
 */
export interface OracleStatus {
  /** 활성 상태 */
  isActive: boolean;

  /** 마지막 업데이트 시간 */
  lastUpdate: Date;

  /** 총 풀 개수 */
  totalPools: number;

  /** 모니터링 중인 풀 개수 */
  monitoredPools: number;

  /** 활성 MEV 기회 개수 */
  activeOpportunities: number;

  /** 평균 가격 신뢰도 */
  averageConfidence: number;

  /** 시스템 상태 */
  systemStatus: 'healthy' | 'warning' | 'error';
}
