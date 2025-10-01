/**
 * Transaction 타입 정의
 *
 * 블록체인 트랜잭션의 기본 구조를 정의합니다.
 * MEV 시뮬레이션을 위해 가스 가격 기반 우선순위를 지원합니다.
 */

/**
 * 트랜잭션 타입 열거형
 */
export enum TransactionType {
  SWAP = 'swap',
  ADD_LIQUIDITY = 'addLiquidity',
  REMOVE_LIQUIDITY = 'removeLiquidity',
  TRANSFER = 'transfer',
  MEV_FRONTRUN = 'mevFrontrun',
  MEV_BACKRUN = 'mevBackrun',
  MEV_SANDWICH = 'mevSandwich',
}

/**
 * 트랜잭션 상태 열거형
 */
export enum TransactionStatus {
  PENDING = 'pending', // 트랜잭션 풀에서 대기 중
  SELECTED = 'selected', // 블록에 선택됨
  EXECUTING = 'executing', // 실행 중
  COMPLETED = 'completed', // 실행 완료
  FAILED = 'failed', // 실행 실패
  DROPPED = 'dropped', // 드롭됨 (가스 부족, 타임아웃 등)
}

/**
 * 트랜잭션 인터페이스
 *
 * 블록체인 트랜잭션의 모든 정보를 포함합니다.
 */
export interface Transaction {
  // 기본 정보
  id: string;
  type: TransactionType;

  // 발신자/수신자
  from: string;
  to: string;

  // 트랜잭션 데이터
  data: TransactionData;

  // 가스 관련 (MEV 우선순위 결정에 핵심)
  gasPrice: number;
  gasLimit: number;
  gasUsed?: number;

  // 상태 및 순서
  status: TransactionStatus;
  nonce: number;

  // 시간 정보
  timestamp: Date;
  blockNumber?: number;
  blockTimestamp?: Date;

  // 실행 결과
  result?: TransactionResult;
  error?: string;
}

/**
 * 트랜잭션 데이터
 *
 * 각 트랜잭션 타입별 데이터를 포함합니다.
 */
export interface TransactionData {
  // 스왑 거래 데이터
  swap?: {
    from: 'ETH' | 'BTC';
    to: 'ETH' | 'BTC';
    amountIn: number;
  };

  // 유동성 추가 데이터
  addLiquidity?: {
    ethAmount: number;
    btcAmount: number;
  };

  // 유동성 제거 데이터
  removeLiquidity?: {
    shareAmount: number;
  };

  // MEV 관련 메타데이터
  mev?: {
    targetTransactionId?: string;
    strategy?: string;
    expectedProfit?: number;
  };
}

/**
 * 트랜잭션 실행 결과
 */
export interface TransactionResult {
  success: boolean;
  poolBefore?: PoolState;
  poolAfter?: PoolState;
  output?: any;
  gasUsed: number;
  effectiveGasPrice: number;
}

/**
 * 풀 상태 (트랜잭션 실행 전후)
 */
export interface PoolState {
  eth: number;
  btc: number;
  k: number;
}

/**
 * 트랜잭션 풀 상태
 */
export interface TransactionPoolStatus {
  pendingCount: number;
  totalTransactions: number;
  averageGasPrice: number;
  highestGasPrice: number;
  lowestGasPrice: number;
}
