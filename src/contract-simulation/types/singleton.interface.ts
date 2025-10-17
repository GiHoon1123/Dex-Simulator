/**
 * 싱글톤 컨트랙트 인터페이스 정의
 *
 * Uniswap V4 스타일의 싱글톤 패턴을 시뮬레이션합니다.
 * 모든 풀이 하나의 컨트랙트 내부에서 관리되어 가스비를 절약합니다.
 *
 * 핵심 개념:
 * - AMM (Automated Market Maker): x * y = k 공식
 * - 유동성 풀: 두 토큰의 교환 비율을 자동으로 결정
 * - 가격 임팩트: 거래량이 클수록 가격이 불리하게 변동
 */

/**
 * 싱글톤 컨트랙트 내부의 풀
 *
 * 각 풀은 두 토큰 간의 교환 비율과 유동성을 관리합니다.
 */
export interface SingletonPool {
  /** 풀 고유 ID (예: "pool_eth_usdc") */
  poolId: string;

  /** 토큰 A (예: "ETH") */
  tokenA: string;

  /** 토큰 B (예: "USDC") */
  tokenB: string;

  /**
   * 토큰 A의 유동성 (리저브)
   * 예: 1000 ETH
   *
   * 이 값이 클수록 가격 안정성이 높아집니다.
   */
  reserveA: number;

  /**
   * 토큰 B의 유동성 (리저브)
   * 예: 2,000,000 USDC
   */
  reserveB: number;

  /**
   * AMM 불변량 (k = x * y)
   * 예: 1000 * 2,000,000 = 2,000,000,000
   *
   * 스왑 시 이 값은 일정하게 유지됩니다 (수수료 제외).
   * 수수료로 인해 시간이 지날수록 k 값은 증가합니다.
   */
  k: number;

  /**
   * 수수료율
   * 예: 0.003 = 0.3%
   *
   * 일반 토큰: 0.3%
   * 스테이블 코인: 0.01% (변동성 낮음)
   */
  feeRate: number;

  /**
   * 현재 가격 (tokenB per tokenA)
   * 예: 2000 = 1 ETH당 2000 USDC
   *
   * 계산: reserveB / reserveA
   */
  currentPrice: number;

  /**
   * 누적 거래량 (tokenA 기준)
   * 예: 1000 ETH
   */
  totalVolume: number;

  /** 스왑 실행 횟수 */
  swapCount: number;

  /** 풀 생성 시간 */
  createdAt: Date;

  /** 마지막 업데이트 시간 */
  lastUpdated: Date;
}

/**
 * 풀 생성 파라미터
 */
export interface CreateSingletonPoolParams {
  /** 토큰 A */
  tokenA: string;

  /** 토큰 B */
  tokenB: string;

  /**
   * 토큰 A 초기 유동성
   * 예: 1000 ETH
   *
   * 초기 유동성이 클수록 가격 안정성이 높습니다.
   */
  initialReserveA: number;

  /**
   * 토큰 B 초기 유동성
   * 예: 2,000,000 USDC
   */
  initialReserveB: number;

  /**
   * 수수료율
   * 예: 0.003 = 0.3%
   */
  feeRate: number;
}

/**
 * 싱글톤 컨트랙트 스왑 파라미터
 */
export interface SingletonSwapParams {
  /** 풀 ID (예: "pool_eth_usdc") */
  poolId: string;

  /** 입력 토큰 (예: "ETH") */
  tokenIn: string;

  /** 출력 토큰 (예: "USDC") */
  tokenOut: string;

  /**
   * 입력 수량
   * 예: 100 ETH
   */
  amountIn: number;

  /**
   * 최소 출력 수량 (슬리피지 보호)
   * 예: 190,000 USDC
   *
   * 실제 출력량이 이 값보다 적으면 거래 실패합니다.
   */
  minAmountOut: number;

  /** 수신자 주소 */
  recipient: string;

  /**
   * 슬리피지 허용 범위 (%)
   * 예: 0.5 = 0.5%
   *
   * 가격 임팩트가 이 값을 초과하면 경고합니다.
   */
  slippageTolerance: number;
}

/**
 * 스왑 시뮬레이션 결과
 *
 * 실제 스왑을 실행하지 않고 결과를 미리 계산합니다.
 * 라우터가 최적 경로를 찾을 때 사용합니다.
 */
export interface SingletonSwapSimulation {
  /**
   * 예상 출력 수량
   * 예: 181,818 USDC
   *
   * AMM 공식으로 계산:
   * amountOut = reserveOut - k / (reserveIn + amountInAfterFee)
   */
  expectedAmountOut: number;

  /**
   * 수수료 (입력 토큰)
   * 예: 0.3 ETH (100 ETH * 0.003)
   */
  fee: number;

  /**
   * 수수료 제외 입력량
   * 예: 99.7 ETH
   *
   * 실제 AMM 계산에 사용되는 값입니다.
   */
  amountInAfterFee: number;

  /**
   * 가격 임팩트 (%)
   * 예: 9.0%
   *
   * 내 거래로 인해 가격이 얼마나 움직이는가?
   * - 0.1% 미만: 안전
   * - 1% 미만: 적정
   * - 5% 미만: 높음
   * - 5% 이상: 매우 높음 (위험)
   */
  priceImpact: number;

  /**
   * 실행 전 가격
   * 예: 2000 USDC/ETH
   */
  priceBefore: number;

  /**
   * 실행 후 가격
   * 예: 1653 USDC/ETH
   *
   * 큰 거래일수록 가격이 불리하게 변합니다.
   */
  priceAfter: number;

  /** 실행 가능 여부 */
  isExecutable: boolean;

  /**
   * 경고 메시지
   * 예: ["높은 가격 임팩트: 9.00%"]
   */
  warnings: string[];

  /**
   * 에러 메시지
   * 예: ["슬리피지 초과", "최소 출력량 미달"]
   */
  errors: string[];
}

/**
 * 스왑 실행 결과
 */
export interface SingletonSwapResult {
  /** 스왑 ID */
  swapId: string;

  /** 풀 ID */
  poolId: string;

  /** 입력 토큰 */
  tokenIn: string;

  /** 출력 토큰 */
  tokenOut: string;

  /** 입력 수량 */
  amountIn: number;

  /** 실제 출력 수량 */
  amountOut: number;

  /** 수수료 */
  fee: number;

  /** 가격 임팩트 (%) */
  priceImpact: number;

  /**
   * 실행 전 풀 상태
   *
   * 스왑 전후 비교를 위해 저장합니다.
   */
  poolStateBefore: {
    reserveA: number;
    reserveB: number;
    k: number;
    price: number;
  };

  /**
   * 실행 후 풀 상태
   *
   * 스왑으로 인해 리저브가 변경됩니다.
   */
  poolStateAfter: {
    reserveA: number;
    reserveB: number;
    k: number;
    price: number;
  };

  /** 실행 시간 */
  timestamp: Date;

  /** 성공 여부 */
  success: boolean;

  /** 에러 메시지 (실패 시) */
  error?: string;
}

/**
 * 풀 조회 쿼리
 */
export interface SingletonPoolQuery {
  /** 토큰 필터 (해당 토큰이 포함된 풀만) */
  token?: string;

  /** 최소 유동성 필터 (USD) */
  minLiquidity?: number;

  /** 정렬 기준 */
  sortBy?: 'liquidity' | 'volume' | 'price' | 'created';

  /** 정렬 순서 */
  sortOrder?: 'asc' | 'desc';
}

/**
 * 풀 통계
 */
export interface SingletonPoolStats {
  /** 전체 풀 개수 */
  totalPools: number;

  /** 전체 유동성 (USD) */
  totalLiquidity: number;

  /** 전체 거래량 (USD) */
  totalVolume: number;

  /** 전체 스왑 횟수 */
  totalSwaps: number;

  /** 평균 풀 크기 (USD) */
  averagePoolSize: number;

  /** 가장 활발한 풀 ID */
  mostActivePool: string;
}

/**
 * 가격 임팩트 분석
 *
 * 거래량에 따른 가격 임팩트를 분석합니다.
 */
export interface PriceImpactAnalysis {
  /** 입력 수량 */
  amountIn: number;

  /** 예상 출력 수량 */
  amountOut: number;

  /**
   * 가격 임팩트 (%)
   *
   * 계산: (현재가격 - 예상가격) / 현재가격 * 100
   */
  impact: number;

  /**
   * 임팩트 레벨
   * - low: 0.1% 미만
   * - medium: 0.1~1%
   * - high: 1~5%
   * - extreme: 5% 이상
   */
  level: 'low' | 'medium' | 'high' | 'extreme';

  /** 현재 가격 */
  currentPrice: number;

  /** 예상 가격 (거래 후) */
  expectedPrice: number;

  /** 권장사항 */
  recommendation: string;
}
