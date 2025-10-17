/**
 * 라우터 컨트랙트 인터페이스 정의
 *
 * 멀티홉 최적화 라우터를 시뮬레이션합니다.
 * 여러 풀을 거쳐가는 최적 경로를 찾아줍니다.
 *
 * 핵심 개념:
 * - 경로 탐색: BFS 알고리즘으로 모든 가능한 경로 찾기
 * - 최적화: 출력량, 가스비, 슬리피지를 종합 고려
 * - 멀티홉: 여러 풀을 거쳐 더 좋은 가격 얻기
 */

/**
 * 경로 정보
 *
 * 토큰 A에서 토큰 B로 가는 하나의 경로를 나타냅니다.
 */
export interface Route {
  /** 경로 ID */
  routeId: string;

  /**
   * 토큰 경로
   * 예: ["ETH", "USDC", "DAI"]
   */
  path: string[];

  /**
   * 사용할 풀 ID 목록
   * 예: ["pool_eth_usdc", "pool_usdc_dai"]
   */
  pools: string[];

  /**
   * 경로 타입
   * - direct: 직접 경로 (1-hop)
   * - multi-hop: 여러 풀을 거치는 경로 (2-hop 이상)
   */
  type: 'direct' | 'multi-hop';

  /**
   * 홉 수 (거치는 풀의 개수)
   * 예: 1, 2, 3...
   */
  hops: number;

  // ==========================================
  // 출력 정보
  // ==========================================

  /**
   * 예상 출력 수량
   * 예: 181,818 DAI
   */
  expectedAmountOut: number;

  /**
   * 전체 가격 임팩트 (%)
   * 각 홉의 임팩트가 누적됩니다.
   */
  priceImpact: number;

  /**
   * 각 홉별 상세 정보
   */
  hopsDetail: Array<{
    poolId: string;
    tokenIn: string;
    tokenOut: string;
    amountIn: number;
    amountOut: number;
    priceImpact: number;
  }>;

  // ==========================================
  // 비용 정보
  // ==========================================

  /**
   * 예상 가스비
   * 홉이 많을수록 가스비가 증가합니다.
   */
  gasEstimate: number;

  /**
   * 총 수수료 (각 풀의 수수료 합)
   */
  totalFee: number;

  // ==========================================
  // 실행 가능성
  // ==========================================

  /** 실행 가능 여부 */
  feasible: boolean;

  /** 경고 메시지 */
  warnings: string[];

  /** 에러 메시지 (실행 불가능한 경우) */
  errors: string[];

  /** 이 경로가 추천되는지 여부 */
  recommended: boolean;

  /** 추천/비추천 이유 */
  reason?: string;
}

/**
 * 경로 탐색 옵션
 */
export interface RouteSearchOptions {
  /**
   * 최대 홉 수
   * 기본값: 3
   *
   * 너무 많으면 계산 시간과 가스비가 증가합니다.
   */
  maxHops?: number;

  /**
   * 슬리피지 허용 범위 (%)
   * 기본값: 0.5
   */
  slippageTolerance?: number;

  /**
   * 가스 가격 (gwei)
   * 가스비 계산에 사용됩니다.
   */
  gasPrice?: number;

  /**
   * 최소 유동성 필터
   * 이 값보다 작은 풀은 제외합니다.
   */
  minPoolLiquidity?: number;
}

/**
 * 자동 스왑 파라미터
 */
export interface AutoSwapParams {
  /** 입력 토큰 */
  tokenIn: string;

  /** 출력 토큰 */
  tokenOut: string;

  /** 입력 수량 */
  amountIn: number;

  /** 최소 출력 수량 (선택사항) */
  minAmountOut?: number;

  /** 슬리피지 허용 범위 (%) */
  slippageTolerance: number;

  /** 수신자 주소 */
  recipient: string;

  /** 탐색 옵션 (선택사항) */
  options?: RouteSearchOptions;
}

/**
 * 자동 스왑 결과
 */
export interface AutoSwapResult {
  /** 스왑 ID */
  swapId: string;

  /** 사용된 경로 */
  routeUsed: Route;

  /** 각 홉의 실행 결과 */
  hopsExecuted: Array<{
    poolId: string;
    swapId: string;
    tokenIn: string;
    tokenOut: string;
    amountIn: number;
    amountOut: number;
    priceImpact: number;
    timestamp: Date;
  }>;

  /** 최종 출력 수량 */
  finalAmountOut: number;

  /** 총 가격 임팩트 */
  totalPriceImpact: number;

  /** 총 가스 사용량 */
  totalGasUsed: number;

  /** 총 수수료 */
  totalFee: number;

  /** 실행 시간 */
  executionTime: number;

  /** 성공 여부 */
  success: boolean;

  /** 타임스탬프 */
  timestamp: Date;

  /** 에러 메시지 (실패 시) */
  error?: string;
}

/**
 * 경로 비교 결과
 *
 * 직접 경로 vs 멀티홉 경로를 비교합니다.
 * 시뮬레이터의 핵심 기능!
 */
export interface RouteComparison {
  /** 입력 토큰 */
  tokenIn: string;

  /** 출력 토큰 */
  tokenOut: string;

  /** 입력 수량 */
  amountIn: number;

  /** 모든 발견된 경로 */
  allRoutes: Route[];

  /** 최적 경로 */
  bestRoute: Route;

  /** 직접 경로 (있는 경우) */
  directRoute?: Route;

  /** 최고의 멀티홉 경로 */
  bestMultiHopRoute?: Route;

  /**
   * 직접 vs 멀티홉 비교
   *
   * 시뮬레이터의 주요 시연 포인트!
   */
  comparison?: {
    /** 출력량 차이 */
    outputDiff: number;

    /** 출력량 차이 비율 (%) */
    outputDiffPercent: number;

    /** 가격 임팩트 차이 */
    impactDiff: number;

    /** 가스비 차이 */
    gasDiff: number;

    /** 추천 경로 */
    recommendation: 'direct' | 'multi-hop';

    /** 추천 이유 */
    reason: string;
  };

  /**
   * 싱글톤 vs 일반 DEX 가스비 비교
   *
   * 싱글톤 컨트랙트의 장점을 보여줍니다.
   */
  singletonAdvantage: {
    /** 싱글톤 가스비 */
    singletonGas: number;

    /** 일반 DEX 가스비 */
    regularDexGas: number;

    /** 절약된 가스비 */
    gasSaved: number;

    /** 절약 비율 (%) */
    gasSavedPercent: number;
  };
}

/**
 * 경로 탐색 결과
 */
export interface RouteSearchResult {
  /** 입력 토큰 */
  tokenIn: string;

  /** 출력 토큰 */
  tokenOut: string;

  /** 입력 수량 */
  amountIn: number;

  /** 발견된 모든 경로 */
  routes: Route[];

  /** 경로 개수 */
  totalRoutes: number;

  /** 1-hop 경로 개수 */
  directRoutes: number;

  /** 2-hop 경로 개수 */
  twoHopRoutes: number;

  /** 3-hop 경로 개수 */
  threeHopRoutes: number;

  /** 탐색 시간 (ms) */
  searchTime: number;
}

/**
 * 멀티홉 스왑 파라미터
 */
export interface MultiHopSwapParams {
  /** 실행할 경로 */
  route: Route;

  /** 최소 출력 수량 */
  minAmountOut: number;

  /** 수신자 주소 */
  recipient: string;
}
