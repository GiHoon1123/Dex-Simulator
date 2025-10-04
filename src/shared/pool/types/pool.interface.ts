/**
 * 풀 관련 타입 정의
 *
 * 실제 Uniswap V3 스타일의 AMM 풀을 시뮬레이션합니다.
 * MEV, Routing, Singleton 시뮬레이션에서 공통으로 사용됩니다.
 */

/**
 * 풀 상태 정보
 *
 * 실제 Uniswap V3 풀의 상태를 나타냅니다.
 */
export interface PoolState {
  /** 풀 컨트랙트 주소 */
  address: string;

  /** 토큰 페어 (예: 'ETH/USDC') */
  pair: string;

  /** 토큰 A 심볼 */
  tokenA: string;

  /** 토큰 B 심볼 */
  tokenB: string;

  /** 토큰 A 잔고 */
  reserveA: number;

  /** 토큰 B 잔고 */
  reserveB: number;

  /** 상수 곱 (K = reserveA * reserveB) */
  k: number;

  /** 수수료율 (예: 0.003 = 0.3%) */
  feeRate: number;

  /** 풀 생성 시간 */
  createdAt: Date;

  /** 마지막 업데이트 시간 */
  lastUpdated: Date;

  /** 총 거래량 (USD 기준) */
  totalVolume: number;

  /** 24시간 거래량 (USD 기준) */
  volume24h: number;

  /** 활성 상태 */
  isActive: boolean;
}

/**
 * 풀 생성 파라미터
 */
export interface CreatePoolParams {
  /** 풀 주소 */
  address: string;

  /** 토큰 페어 */
  pair: string;

  /** 토큰 A 심볼 */
  tokenA: string;

  /** 토큰 B 심볼 */
  tokenB: string;

  /** 초기 토큰 A 잔고 */
  initialReserveA: number;

  /** 초기 토큰 B 잔고 */
  initialReserveB: number;

  /** 수수료율 */
  feeRate: number;
}

/**
 * 풀 상태 업데이트 파라미터
 */
export interface UpdatePoolParams {
  /** 새로운 토큰 A 잔고 */
  reserveA?: number;

  /** 새로운 토큰 B 잔고 */
  reserveB?: number;

  /** 총 거래량 업데이트 */
  volumeUpdate?: number;
}

/**
 * 풀 통계 정보
 */
export interface PoolStats {
  /** 풀 주소 */
  address: string;

  /** 토큰 페어 */
  pair: string;

  /** 현재 가격 (토큰 A 기준 토큰 B 가격) */
  currentPrice: number;

  /** 24시간 가격 변동률 (%) */
  priceChange24h: number;

  /** 24시간 거래량 (USD) */
  volume24h: number;

  /** 총 거래량 (USD) */
  totalVolume: number;

  /** 총 유동성 (USD) */
  totalLiquidity: number;

  /** 활성 상태 */
  isActive: boolean;

  /** 마지막 업데이트 시간 */
  lastUpdated: Date;
}

/**
 * 풀 목록 조회 쿼리
 */
export interface PoolListQuery {
  /** 활성 풀만 조회 */
  activeOnly?: boolean;

  /** 특정 토큰 포함 풀만 조회 */
  token?: string;

  /** 정렬 기준 */
  sortBy?: 'volume' | 'liquidity' | 'price' | 'created';

  /** 정렬 방향 */
  sortOrder?: 'asc' | 'desc';

  /** 페이지 크기 */
  limit?: number;

  /** 오프셋 */
  offset?: number;
}

/**
 * 풀 검색 결과
 */
export interface PoolSearchResult {
  /** 풀 목록 */
  pools: PoolState[];

  /** 총 개수 */
  total: number;

  /** 현재 페이지 */
  page: number;

  /** 페이지 크기 */
  pageSize: number;

  /** 다음 페이지 존재 여부 */
  hasNext: boolean;
}
