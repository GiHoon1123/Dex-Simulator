import { Transaction } from './transaction.interface';

/**
 * Block 타입 정의
 *
 * 블록체인 블록의 기본 구조를 정의합니다.
 * 트랜잭션들을 묶어서 순서대로 실행하는 단위입니다.
 */

/**
 * 블록 상태 열거형
 */
export enum BlockStatus {
  PENDING = 'pending', // 생성 대기 중
  EXECUTING = 'executing', // 실행 중
  COMPLETED = 'completed', // 실행 완료
  FAILED = 'failed', // 실행 실패
}

/**
 * 블록 인터페이스
 *
 * 이더리움 블록 구조를 간소화한 버전입니다.
 */
export interface Block {
  // 블록 식별 정보
  blockNumber: number;
  hash: string;
  previousHash: string;

  // 시간 정보
  timestamp: Date;

  // 트랜잭션 정보
  transactions: Transaction[];
  transactionCount: number;

  // 가스 정보
  gasUsed: number;
  gasLimit: number;

  // 상태
  status: BlockStatus;

  // 블록 생성자 (시뮬레이션용, 실제로는 validator)
  producer?: string;
}

/**
 * 블록 실행 결과
 */
export interface BlockResult {
  block: Block;
  executedTransactions: Transaction[];
  failedTransactions: Transaction[];
  totalGasUsed: number;
  totalFees: number;
  executionTime: number;
}

/**
 * 블록체인 상태
 */
export interface BlockchainStatus {
  latestBlockNumber: number;
  totalBlocks: number;
  totalTransactions: number;
  averageBlockTime: number;
  averageTransactionsPerBlock: number;
}
