/**
 * 풀 관련 이벤트 정의
 *
 * 풀 상태 변경, 스왑 실행, MEV 기회 탐지 등의
 * 이벤트를 정의합니다.
 */

import { MEVOpportunity, PriceDeviation } from '../pool/types/oracle.interface';
import { PoolState, PoolStats } from '../pool/types/pool.interface';
import {
  AddLiquidityResult,
  RemoveLiquidityResult,
  SwapResult,
} from '../pool/types/swap.interface';

/**
 * 풀 생성 이벤트
 */
export interface PoolCreatedEvent {
  /** 이벤트 ID */
  eventId: string;

  /** 이벤트 타입 */
  type: 'pool.created';

  /** 풀 정보 */
  pool: PoolState;

  /** 이벤트 발생 시간 */
  timestamp: Date;

  /** 이벤트 메타데이터 */
  metadata: {
    creator: string;
    initialLiquidity: number;
    gasUsed: number;
  };
}

/**
 * 풀 상태 업데이트 이벤트
 */
export interface PoolUpdatedEvent {
  /** 이벤트 ID */
  eventId: string;

  /** 이벤트 타입 */
  type: 'pool.updated';

  /** 풀 주소 */
  poolAddress: string;

  /** 이전 상태 */
  previousState: PoolState;

  /** 현재 상태 */
  currentState: PoolState;

  /** 변경 사항 */
  changes: {
    reserveA?: { from: number; to: number };
    reserveB?: { from: number; to: number };
    totalVolume?: { from: number; to: number };
    volume24h?: { from: number; to: number };
  };

  /** 이벤트 발생 시간 */
  timestamp: Date;

  /** 업데이트 원인 */
  reason: 'swap' | 'liquidity_add' | 'liquidity_remove' | 'manual';
}

/**
 * 스왑 실행 이벤트
 */
export interface SwapExecutedEvent {
  /** 이벤트 ID */
  eventId: string;

  /** 이벤트 타입 */
  type: 'swap.executed';

  /** 스왑 결과 */
  swapResult: SwapResult;

  /** 풀 상태 (스왑 후) */
  poolState: PoolState;

  /** 이벤트 발생 시간 */
  timestamp: Date;

  /** 관련 트랜잭션 해시 */
  txHash?: string;

  /** MEV 기회 여부 */
  isMEVOpportunity: boolean;

  /** MEV 기회 ID (해당하는 경우) */
  mevOpportunityId?: string;
}

/**
 * 유동성 추가 이벤트
 */
export interface LiquidityAddedEvent {
  /** 이벤트 ID */
  eventId: string;

  /** 이벤트 타입 */
  type: 'liquidity.added';

  /** 유동성 추가 결과 */
  addLiquidityResult: AddLiquidityResult;

  /** 풀 상태 (유동성 추가 후) */
  poolState: PoolState;

  /** 이벤트 발생 시간 */
  timestamp: Date;

  /** 관련 트랜잭션 해시 */
  txHash?: string;
}

/**
 * 유동성 제거 이벤트
 */
export interface LiquidityRemovedEvent {
  /** 이벤트 ID */
  eventId: string;

  /** 이벤트 타입 */
  type: 'liquidity.removed';

  /** 유동성 제거 결과 */
  removeLiquidityResult: RemoveLiquidityResult;

  /** 풀 상태 (유동성 제거 후) */
  poolState: PoolState;

  /** 이벤트 발생 시간 */
  timestamp: Date;

  /** 관련 트랜잭션 해시 */
  txHash?: string;
}

/**
 * 가격 편차 탐지 이벤트
 */
export interface PriceDeviationDetectedEvent {
  /** 이벤트 ID */
  eventId: string;

  /** 이벤트 타입 */
  type: 'price.deviation.detected';

  /** 가격 편차 정보 */
  priceDeviation: PriceDeviation;

  /** 이벤트 발생 시간 */
  timestamp: Date;

  /** 심각도 */
  severity: 'low' | 'medium' | 'high' | 'critical';

  /** 알림 필요 여부 */
  requiresNotification: boolean;
}

/**
 * MEV 기회 탐지 이벤트
 */
export interface MEVOpportunityDetectedEvent {
  /** 이벤트 ID */
  eventId: string;

  /** 이벤트 타입 */
  type: 'mev.opportunity.detected';

  /** MEV 기회 정보 */
  mevOpportunity: MEVOpportunity;

  /** 이벤트 발생 시간 */
  timestamp: Date;

  /** 우선순위 */
  priority: 'low' | 'medium' | 'high' | 'urgent';

  /** 자동 실행 가능 여부 */
  autoExecutable: boolean;
}

/**
 * MEV 기회 만료 이벤트
 */
export interface MEVOpportunityExpiredEvent {
  /** 이벤트 ID */
  eventId: string;

  /** 이벤트 타입 */
  type: 'mev.opportunity.expired';

  /** 만료된 MEV 기회 ID */
  mevOpportunityId: string;

  /** 풀 주소 */
  poolAddress: string;

  /** 이벤트 발생 시간 */
  timestamp: Date;

  /** 만료 사유 */
  reason: 'timeout' | 'executed' | 'invalidated' | 'manual';
}

/**
 * 풀 통계 업데이트 이벤트
 */
export interface PoolStatsUpdatedEvent {
  /** 이벤트 ID */
  eventId: string;

  /** 이벤트 타입 */
  type: 'pool.stats.updated';

  /** 풀 주소 */
  poolAddress: string;

  /** 풀 통계 */
  poolStats: PoolStats;

  /** 이벤트 발생 시간 */
  timestamp: Date;

  /** 업데이트 주기 */
  updateInterval: number;
}

/**
 * 풀 오라클 상태 변경 이벤트
 */
export interface OracleStatusChangedEvent {
  /** 이벤트 ID */
  eventId: string;

  /** 이벤트 타입 */
  type: 'oracle.status.changed';

  /** 풀 주소 */
  poolAddress: string;

  /** 이전 상태 */
  previousStatus: 'active' | 'inactive' | 'error';

  /** 현재 상태 */
  currentStatus: 'active' | 'inactive' | 'error';

  /** 이벤트 발생 시간 */
  timestamp: Date;

  /** 상태 변경 사유 */
  reason: string;

  /** 에러 메시지 (에러 상태인 경우) */
  errorMessage?: string;
}

/**
 * 풀 이벤트 유니온 타입
 */
export type PoolEvent =
  | PoolCreatedEvent
  | PoolUpdatedEvent
  | SwapExecutedEvent
  | LiquidityAddedEvent
  | LiquidityRemovedEvent
  | PriceDeviationDetectedEvent
  | MEVOpportunityDetectedEvent
  | MEVOpportunityExpiredEvent
  | PoolStatsUpdatedEvent
  | OracleStatusChangedEvent;

/**
 * 이벤트 타입 매핑
 */
export const POOL_EVENT_TYPES = {
  POOL_CREATED: 'pool.created',
  POOL_UPDATED: 'pool.updated',
  SWAP_EXECUTED: 'swap.executed',
  LIQUIDITY_ADDED: 'liquidity.added',
  LIQUIDITY_REMOVED: 'liquidity.removed',
  PRICE_DEVIATION_DETECTED: 'price.deviation.detected',
  MEV_OPPORTUNITY_DETECTED: 'mev.opportunity.detected',
  MEV_OPPORTUNITY_EXPIRED: 'mev.opportunity.expired',
  POOL_STATS_UPDATED: 'pool.stats.updated',
  ORACLE_STATUS_CHANGED: 'oracle.status.changed',
} as const;

/**
 * 이벤트 타입
 */
export type PoolEventType =
  (typeof POOL_EVENT_TYPES)[keyof typeof POOL_EVENT_TYPES];
