/**
 * 스왑 관련 타입 정의
 *
 * 풀에서 실행되는 스왑 거래와 관련된 모든 타입을 정의합니다.
 */

/**
 * 스왑 파라미터
 *
 * 스왑 실행에 필요한 파라미터를 정의합니다.
 */
export interface SwapParams {
  /** 풀 주소 */
  poolAddress: string;

  /** 입력 토큰 심볼 */
  tokenIn: string;

  /** 출력 토큰 심볼 */
  tokenOut: string;

  /** 입력 토큰 수량 */
  amountIn: number;

  /** 최소 출력 토큰 수량 (슬리피지 보호) */
  amountOutMin: number;

  /** 수신자 주소 */
  recipient: string;

  /** 데드라인 (타임스탬프) */
  deadline: number;

  /** 가스 가격 */
  gasPrice: number;

  /** 가스 한도 */
  gasLimit: number;
}

/**
 * 스왑 결과
 *
 * 스왑 실행 결과를 나타냅니다.
 */
export interface SwapResult {
  /** 스왑 ID */
  swapId: string;

  /** 풀 주소 */
  poolAddress: string;

  /** 입력 토큰 */
  tokenIn: string;

  /** 출력 토큰 */
  tokenOut: string;

  /** 실제 입력 수량 */
  amountIn: number;

  /** 실제 출력 수량 */
  amountOut: number;

  /** 예상 출력 수량 */
  expectedAmountOut: number;

  /** 슬리피지 (%) */
  slippage: number;

  /** 수수료 */
  fee: number;

  /** 수수료 토큰 */
  feeToken: string;

  /** 가스 사용량 */
  gasUsed: number;

  /** 가스 비용 */
  gasCost: number;

  /** 실행 시간 */
  timestamp: Date;

  /** 성공 여부 */
  success: boolean;

  /** 에러 메시지 (실패 시) */
  error?: string;

  /** 거래 해시 */
  txHash?: string;
}

/**
 * 스왑 시뮬레이션 결과
 *
 * 실제 실행 전 스왑 결과를 미리 계산합니다.
 */
export interface SwapSimulation {
  /** 예상 출력 수량 */
  expectedAmountOut: number;

  /** 최대 슬리피지 (%) */
  maxSlippage: number;

  /** 예상 수수료 */
  estimatedFee: number;

  /** 가격 임팩트 (%) */
  priceImpact: number;

  /** 실행 가능 여부 */
  isExecutable: boolean;

  /** 경고 메시지 */
  warnings: string[];

  /** 에러 메시지 */
  errors: string[];
}

/**
 * 유동성 공급 파라미터
 */
export interface AddLiquidityParams {
  /** 풀 주소 */
  poolAddress: string;

  /** 토큰 A 수량 */
  amountA: number;

  /** 토큰 B 수량 */
  amountB: number;

  /** 최소 토큰 A 수량 */
  amountAMin: number;

  /** 최소 토큰 B 수량 */
  amountBMin: number;

  /** 수신자 주소 */
  recipient: string;

  /** 데드라인 */
  deadline: number;
}

/**
 * 유동성 공급 결과
 */
export interface AddLiquidityResult {
  /** 유동성 토큰 수량 */
  liquidityAmount: number;

  /** 실제 토큰 A 수량 */
  actualAmountA: number;

  /** 실제 토큰 B 수량 */
  actualAmountB: number;

  /** 실행 시간 */
  timestamp: Date;

  /** 성공 여부 */
  success: boolean;

  /** 에러 메시지 */
  error?: string;
}

/**
 * 유동성 제거 파라미터
 */
export interface RemoveLiquidityParams {
  /** 풀 주소 */
  poolAddress: string;

  /** 유동성 토큰 수량 */
  liquidityAmount: number;

  /** 최소 토큰 A 수량 */
  amountAMin: number;

  /** 최소 토큰 B 수량 */
  amountBMin: number;

  /** 수신자 주소 */
  recipient: string;

  /** 데드라인 */
  deadline: number;
}

/**
 * 유동성 제거 결과
 */
export interface RemoveLiquidityResult {
  /** 반환된 토큰 A 수량 */
  amountA: number;

  /** 반환된 토큰 B 수량 */
  amountB: number;

  /** 실행 시간 */
  timestamp: Date;

  /** 성공 여부 */
  success: boolean;

  /** 에러 메시지 */
  error?: string;
}

/**
 * 가격 임팩트 계산 결과
 */
export interface PriceImpact {
  /** 가격 임팩트 (%) */
  impact: number;

  /** 입력 수량 */
  amountIn: number;

  /** 출력 수량 */
  amountOut: number;

  /** 풀 내부 가격 */
  poolPrice: number;

  /** 실행 후 예상 가격 */
  expectedPrice: number;

  /** 임팩트 레벨 */
  level: 'low' | 'medium' | 'high' | 'extreme';
}

/**
 * 슬리피지 계산 결과
 */
export interface SlippageInfo {
  /** 슬리피지 (%) */
  slippage: number;

  /** 예상 출력 수량 */
  expectedAmountOut: number;

  /** 실제 출력 수량 */
  actualAmountOut: number;

  /** 슬리피지 원인 */
  causes: ('price_impact' | 'liquidity_depth' | 'market_volatility')[];

  /** 권장 최대 슬리피지 (%) */
  recommendedMaxSlippage: number;
}
