import { Block } from '../blockchain/types/block.interface';
import { Transaction } from '../blockchain/types/transaction.interface';

/**
 * 블록체인 이벤트 정의
 *
 * 블록체인 동작 중 발생하는 모든 이벤트를 정의합니다.
 * MEV 봇이 이 이벤트들을 모니터링하여 공격 기회를 포착합니다.
 */

/**
 * 트랜잭션 제출 이벤트
 *
 * 트랜잭션이 풀에 제출될 때 발생합니다.
 * MEV 봇이 이 이벤트를 감지하여 프론트런 기회를 찾습니다.
 */
export interface TransactionPendingEvent {
  transaction: Transaction;
  poolStatus: {
    pendingCount: number;
    averageGasPrice: number;
  };
  timestamp: Date;
}

/**
 * 트랜잭션 블록 선택 이벤트
 *
 * 트랜잭션이 블록에 포함되도록 선택될 때 발생합니다.
 */
export interface TransactionSelectedEvent {
  transaction: Transaction;
  blockNumber: number;
  position: number;
  timestamp: Date;
}

/**
 * 트랜잭션 실행 이벤트
 *
 * 트랜잭션이 실행될 때 발생합니다.
 * MEV 봇이 이 이벤트를 감지하여 백런 기회를 찾습니다.
 */
export interface TransactionExecutedEvent {
  transaction: Transaction;
  blockNumber: number;
  gasUsed: number;
  success: boolean;
  result?: any;
  timestamp: Date;
}

/**
 * 트랜잭션 실패 이벤트
 */
export interface TransactionFailedEvent {
  transaction: Transaction;
  error: string;
  timestamp: Date;
}

/**
 * 블록 생성 시작 이벤트
 */
export interface BlockCreatingEvent {
  blockNumber: number;
  transactionCount: number;
  timestamp: Date;
}

/**
 * 블록 생성 완료 이벤트
 */
export interface BlockCreatedEvent {
  block: Block;
  timestamp: Date;
}

/**
 * 블록 실행 시작 이벤트
 */
export interface BlockExecutingEvent {
  block: Block;
  timestamp: Date;
}

/**
 * 블록 실행 완료 이벤트
 */
export interface BlockExecutedEvent {
  block: Block;
  executedCount: number;
  failedCount: number;
  totalGasUsed: number;
  executionTime: number;
  timestamp: Date;
}
