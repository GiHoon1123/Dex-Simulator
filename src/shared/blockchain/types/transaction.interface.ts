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
 * 실제 이더리움 트랜잭션 구조를 기반으로 합니다.
 * MEV 시뮬레이션을 위해 가스 가격 기반 우선순위를 지원합니다.
 */
export interface Transaction {
  // 기본 정보
  id: string;
  type: TransactionType;

  // 발신자/수신자 (실제 이더리움 구조)
  from: string;
  to: string; // 풀 컨트랙트 주소
  value: string; // ETH 전송량 (wei 단위)

  // 트랜잭션 데이터 (실제 이더리움 구조)
  data: string; // 함수 호출 데이터 (hex)

  // 가스 관련 (MEV 우선순위 결정에 핵심)
  gasPrice: number; // 가스 가격 (gwei)
  gasLimit: number; // 가스 한도
  gasUsed?: number; // 실제 사용된 가스

  // 상태 및 순서
  status: TransactionStatus;
  nonce: number; // 트랜잭션 순서

  // 시간 정보
  timestamp: Date;
  blockNumber?: number;
  blockTimestamp?: Date;

  // 실행 결과
  result?: TransactionResult;
  error?: string;

  // 파싱된 데이터 (MEV 봇이 사용)
  parsedData?: ParsedTransactionData;
}

/**
 * 파싱된 트랜잭션 데이터
 *
 * ABI를 통해 파싱된 함수 호출 정보를 포함합니다.
 * MEV 봇이 트랜잭션을 분석할 때 사용합니다.
 */
export interface ParsedTransactionData {
  // 호출된 함수명
  function: string;

  // 함수 파라미터
  params: {
    recipient?: string; // 수신자 주소
    zeroForOne?: boolean; // 토큰0→토큰1 방향
    amountSpecified?: string; // 거래량
    sqrtPriceLimitX96?: string; // 가격 한도
    data?: string; // 추가 데이터
  };
}

/**
 * 트랜잭션 데이터 (레거시 - 하위 호환성용)
 *
 * 기존 코드와의 호환성을 위해 유지됩니다.
 * 새로운 코드에서는 parsedData를 사용해야 합니다.
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
 *
 * 다양한 토큰 페어를 지원하도록 확장되었습니다.
 */
export interface PoolState {
  // 풀 식별 정보
  address: string; // 풀 컨트랙트 주소
  pair: string; // 토큰 페어 (예: 'ETH_USDC')

  // 토큰 정보
  tokenA: string; // 토큰 A 심볼 (예: 'ETH')
  tokenB: string; // 토큰 B 심볼 (예: 'USDC')
  amountA: number; // 토큰 A 수량
  amountB: number; // 토큰 B 수량

  // AMM 상수
  k: number; // 곱 불변식 (amountA * amountB)

  // 수수료 정보
  feeRate: number; // 수수료율
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
