import { Injectable, Logger } from '@nestjs/common';
import {
  CreateSingletonPoolParams,
  PriceImpactAnalysis,
  SingletonPool,
  SingletonPoolQuery,
  SingletonPoolStats,
  SingletonSwapParams,
  SingletonSwapResult,
  SingletonSwapSimulation,
} from '../types/singleton.interface';

/**
 * 싱글톤 컨트랙트 서비스
 *
 * Uniswap V4 스타일의 싱글톤 패턴을 시뮬레이션합니다.
 * 모든 풀이 하나의 컨트랙트 내부에서 관리됩니다.
 *
 * 핵심 개념:
 * 1. 단일 컨트랙트에 모든 풀 관리 (가스비 절약)
 * 2. AMM 공식 (x * y = k) 직접 구현
 * 3. 각 풀은 독립적인 상태 유지
 *
 * 시뮬레이션 목표:
 * - 직접 스왑 vs 멀티홉 비교
 * - 유동성에 따른 가격 임팩트 분석
 * - 최적 경로 탐색을 위한 견적 제공
 */
@Injectable()
export class SingletonContractService {
  private readonly logger = new Logger(SingletonContractService.name);

  /**
   * 싱글톤 컨트랙트 내부의 모든 풀
   *
   * Map 구조로 빠른 조회 가능
   * Key: poolId (예: "pool_eth_usdc")
   * Value: SingletonPool 객체
   */
  private pools: Map<string, SingletonPool> = new Map();

  /** 스왑 카운터 (고유 ID 생성용) */
  private swapCounter = 0;

  /**
   * Mock 토큰 가격 (USD 기준)
   *
   * 실제 서비스에서는 오라클에서 가져옵니다.
   * 시뮬레이터에서는 고정 값 사용.
   */
  private readonly TOKEN_PRICES: Record<string, number> = {
    ETH: 2000,
    BTC: 40000,
    USDC: 1,
    DAI: 1,
    WETH: 2000,
    USDT: 1,
  };

  constructor() {
    // 서비스 시작 시 기본 풀들을 자동 생성
    this.initializeDefaultPools();
  }

  /**
   * 기본 풀 초기화
   *
   * 시뮬레이터 시작 시 멀티홉 경로 탐색을 위한 풀들을 자동 생성합니다.
   *
   * 풀 구성 전략:
   * 1. 메인 풀 (높은 유동성) - ETH, BTC, USDC
   * 2. 스테이블 풀 (낮은 수수료) - USDC, DAI, USDT
   * 3. 직접 경로 (소형) - 멀티홉과 비교용
   *
   * 이 구성으로 다양한 경로를 테스트할 수 있습니다:
   * - ETH → DAI: 직접 vs ETH → USDC → DAI
   * - BTC → DAI: BTC → USDC → DAI vs BTC → ETH → USDC → DAI
   */
  private initializeDefaultPools(): void {
    const defaultPools: CreateSingletonPoolParams[] = [
      // ==========================================
      // 메인 풀 (높은 유동성)
      // ==========================================

      // 1. ETH/USDC - 가장 큰 풀 (메인 경로)
      {
        tokenA: 'ETH',
        tokenB: 'USDC',
        initialReserveA: 10000, // 10,000 ETH
        initialReserveB: 20000000, // 20M USDC
        feeRate: 0.003, // 0.3%
      },

      // 2. BTC/USDC - 대형 풀
      {
        tokenA: 'BTC',
        tokenB: 'USDC',
        initialReserveA: 500, // 500 BTC
        initialReserveB: 20000000, // 20M USDC
        feeRate: 0.003, // 0.3%
      },

      // 3. BTC/ETH - 중형 풀
      {
        tokenA: 'BTC',
        tokenB: 'ETH',
        initialReserveA: 250, // 250 BTC
        initialReserveB: 5000, // 5000 ETH
        feeRate: 0.003, // 0.3%
      },

      // ==========================================
      // 스테이블 풀 (낮은 수수료, 높은 유동성)
      // ==========================================

      // 4. USDC/DAI - 스테이블 메인
      {
        tokenA: 'USDC',
        tokenB: 'DAI',
        initialReserveA: 10000000, // 10M USDC
        initialReserveB: 10000000, // 10M DAI
        feeRate: 0.0001, // 0.01% (낮은 변동성)
      },

      // 5. USDC/USDT - 스테이블
      {
        tokenA: 'USDC',
        tokenB: 'USDT',
        initialReserveA: 5000000, // 5M USDC
        initialReserveB: 5000000, // 5M USDT
        feeRate: 0.0001, // 0.01%
      },

      // 6. DAI/USDT - 스테이블
      {
        tokenA: 'DAI',
        tokenB: 'USDT',
        initialReserveA: 3000000, // 3M DAI
        initialReserveB: 3000000, // 3M USDT
        feeRate: 0.0001, // 0.01%
      },

      // ==========================================
      // 직접 경로 (소형) - 멀티홉과 비교용
      // ==========================================

      // 7. ETH/DAI - 직접 경로 (소형, 높은 임팩트)
      {
        tokenA: 'ETH',
        tokenB: 'DAI',
        initialReserveA: 500, // 500 ETH (소형!)
        initialReserveB: 1000000, // 1M DAI
        feeRate: 0.003, // 0.3%
      },

      // 8. BTC/DAI - 직접 경로 (소형)
      {
        tokenA: 'BTC',
        tokenB: 'DAI',
        initialReserveA: 25, // 25 BTC (소형!)
        initialReserveB: 1000000, // 1M DAI
        feeRate: 0.003, // 0.3%
      },

      // ==========================================
      // 추가 경로
      // ==========================================

      // 9. WETH/USDC - Wrapped ETH
      {
        tokenA: 'WETH',
        tokenB: 'USDC',
        initialReserveA: 2000, // 2000 WETH
        initialReserveB: 4000000, // 4M USDC
        feeRate: 0.0005, // 0.05%
      },

      // 10. WETH/ETH - Wrapping 풀
      {
        tokenA: 'WETH',
        tokenB: 'ETH',
        initialReserveA: 1000, // 1000 WETH
        initialReserveB: 1000, // 1000 ETH (1:1)
        feeRate: 0.0001, // 0.01% (거의 동일한 자산)
      },
    ];

    for (const params of defaultPools) {
      this.createPool(params);
    }

    this.logger.log(
      `싱글톤 컨트랙트 초기화 완료: ${this.pools.size}개 풀 생성`,
    );
    this.logger.log(`멀티홉 경로 테스트 가능:`);
    this.logger.log(`  - ETH → DAI (직접 vs 2-hop)`);
    this.logger.log(`  - BTC → DAI (2-hop vs 3-hop)`);
    this.logger.log(`  - ETH → USDT (다양한 경로)`);
  }

  /**
   * 풀 생성
   *
   * 새로운 유동성 풀을 생성합니다.
   *
   * @param params 풀 생성 파라미터
   * @returns 생성된 풀 객체
   * @throws 동일한 풀이 이미 존재하는 경우
   */
  createPool(params: CreateSingletonPoolParams): SingletonPool {
    // 풀 ID 생성 (알파벳 순 정렬)
    const poolId = this.generatePoolId(params.tokenA, params.tokenB);

    // 중복 체크
    if (this.pools.has(poolId)) {
      throw new Error(`풀이 이미 존재합니다: ${poolId}`);
    }

    const now = new Date();

    // AMM 불변량 계산: k = x * y
    const k = params.initialReserveA * params.initialReserveB;

    // 현재 가격 계산: tokenB per tokenA
    const currentPrice = params.initialReserveB / params.initialReserveA;

    const pool: SingletonPool = {
      poolId,
      tokenA: params.tokenA,
      tokenB: params.tokenB,
      reserveA: params.initialReserveA,
      reserveB: params.initialReserveB,
      k,
      feeRate: params.feeRate,
      currentPrice,
      totalVolume: 0,
      swapCount: 0,
      createdAt: now,
      lastUpdated: now,
    };

    // Map에 풀 저장
    this.pools.set(poolId, pool);

    this.logger.log(
      `풀 생성: ${poolId} | ${params.tokenA}/${params.tokenB} | 유동성: ${params.initialReserveA} / ${params.initialReserveB}`,
    );

    return pool;
  }

  /**
   * 풀 ID 생성
   *
   * 토큰 쌍을 알파벳 순으로 정렬하여 일관성 있는 ID를 생성합니다.
   * 예: ETH-USDC와 USDC-ETH는 같은 풀입니다.
   *
   * @param tokenA 토큰 A
   * @param tokenB 토큰 B
   * @returns 풀 ID (예: "pool_eth_usdc")
   */
  private generatePoolId(tokenA: string, tokenB: string): string {
    // 알파벳 순으로 정렬하여 일관성 유지
    const [first, second] =
      tokenA.toLowerCase() < tokenB.toLowerCase()
        ? [tokenA, tokenB]
        : [tokenB, tokenA];
    return `pool_${first.toLowerCase()}_${second.toLowerCase()}`;
  }

  /**
   * 풀 조회
   *
   * @param poolId 풀 ID
   * @returns 풀 객체 또는 null
   */
  getPool(poolId: string): SingletonPool | null {
    return this.pools.get(poolId) || null;
  }

  /**
   * 토큰 쌍으로 풀 찾기
   *
   * 라우터가 경로를 찾을 때 사용합니다.
   *
   * @param tokenA 토큰 A
   * @param tokenB 토큰 B
   * @returns 풀 객체 또는 null
   */
  findPoolByTokens(tokenA: string, tokenB: string): SingletonPool | null {
    const poolId = this.generatePoolId(tokenA, tokenB);
    return this.getPool(poolId);
  }

  /**
   * 모든 풀 조회
   *
   * 선택적으로 필터링 및 정렬 가능합니다.
   *
   * @param query 조회 옵션
   * @returns 풀 목록
   */
  getAllPools(query?: SingletonPoolQuery): SingletonPool[] {
    let pools = Array.from(this.pools.values());

    // 토큰 필터: 특정 토큰이 포함된 풀만
    if (query?.token) {
      pools = pools.filter(
        (pool) => pool.tokenA === query.token || pool.tokenB === query.token,
      );
    }

    // 최소 유동성 필터
    if (query?.minLiquidity !== undefined) {
      pools = pools.filter((pool) => {
        const liquidity = this.calculatePoolLiquidity(pool);
        return liquidity >= query.minLiquidity!;
      });
    }

    // 정렬
    if (query?.sortBy) {
      pools.sort((a, b) => {
        let aValue: number, bValue: number;

        switch (query.sortBy) {
          case 'liquidity':
            aValue = this.calculatePoolLiquidity(a);
            bValue = this.calculatePoolLiquidity(b);
            break;
          case 'volume':
            aValue = a.totalVolume;
            bValue = b.totalVolume;
            break;
          case 'price':
            aValue = a.currentPrice;
            bValue = b.currentPrice;
            break;
          case 'created':
            aValue = a.createdAt.getTime();
            bValue = b.createdAt.getTime();
            break;
          default:
            return 0;
        }

        return query.sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
      });
    }

    return pools;
  }

  /**
   * 풀 유동성 계산 (USD 환산)
   *
   * 두 토큰의 USD 가치를 합산합니다.
   *
   * @param pool 풀 객체
   * @returns 유동성 (USD)
   */
  private calculatePoolLiquidity(pool: SingletonPool): number {
    const priceA = this.TOKEN_PRICES[pool.tokenA] || 1;
    const priceB = this.TOKEN_PRICES[pool.tokenB] || 1;
    return pool.reserveA * priceA + pool.reserveB * priceB;
  }

  /**
   * 스왑 시뮬레이션
   *
   * 실제로 스왑을 실행하지 않고 결과를 미리 계산합니다.
   * 라우터가 여러 경로를 비교할 때 사용합니다.
   *
   * AMM 공식:
   * (reserveIn + amountInAfterFee) * (reserveOut - amountOut) = k
   * amountOut = reserveOut - k / (reserveIn + amountInAfterFee)
   *
   * @param params 스왑 파라미터
   * @returns 시뮬레이션 결과
   */
  simulateSwap(params: SingletonSwapParams): SingletonSwapSimulation {
    const pool = this.getPool(params.poolId);

    // 풀이 존재하지 않는 경우
    if (!pool) {
      return {
        expectedAmountOut: 0,
        fee: 0,
        amountInAfterFee: 0,
        priceImpact: 0,
        priceBefore: 0,
        priceAfter: 0,
        isExecutable: false,
        warnings: [],
        errors: ['풀을 찾을 수 없습니다'],
      };
    }

    // 입력/출력 토큰 방향 확인
    const isTokenAInput = params.tokenIn === pool.tokenA;
    if (!isTokenAInput && params.tokenIn !== pool.tokenB) {
      return {
        expectedAmountOut: 0,
        fee: 0,
        amountInAfterFee: 0,
        priceImpact: 0,
        priceBefore: 0,
        priceAfter: 0,
        isExecutable: false,
        warnings: [],
        errors: ['잘못된 토큰 쌍입니다'],
      };
    }

    // 리저브 설정
    const reserveIn = isTokenAInput ? pool.reserveA : pool.reserveB;
    const reserveOut = isTokenAInput ? pool.reserveB : pool.reserveA;

    // ==========================================
    // 1단계: 수수료 계산
    // ==========================================
    // 예: 100 ETH * 0.003 = 0.3 ETH
    const fee = params.amountIn * pool.feeRate;
    const amountInAfterFee = params.amountIn - fee;

    // ==========================================
    // 2단계: AMM 공식으로 출력량 계산
    // ==========================================
    // (reserveIn + amountInAfterFee) * (reserveOut - amountOut) = k
    // amountOut = reserveOut - k / (reserveIn + amountInAfterFee)
    //
    // 예: ETH/USDC 풀 (1000 ETH, 2M USDC)
    //     100 ETH 입력 시
    //     amountOut = 2,000,000 - 2,000,000,000 / (1000 + 99.7)
    //               = 2,000,000 - 1,818,978
    //               = 181,022 USDC
    const amountOut = reserveOut - pool.k / (reserveIn + amountInAfterFee);

    // ==========================================
    // 3단계: 가격 임팩트 계산
    // ==========================================
    // 거래 전 가격
    const priceBefore = reserveOut / reserveIn;

    // 거래 후 상태
    const newReserveIn = reserveIn + amountInAfterFee;
    const newReserveOut = reserveOut - amountOut;

    // 거래 후 가격
    const priceAfter = newReserveOut / newReserveIn;

    // 가격 임팩트 (%)
    // 예: (2000 - 1653) / 2000 * 100 = 17.4%
    const priceImpact =
      Math.abs((priceAfter - priceBefore) / priceBefore) * 100;

    // ==========================================
    // 4단계: 검증 및 경고/에러 생성
    // ==========================================
    const warnings: string[] = [];
    const errors: string[] = [];

    // 높은 가격 임팩트 경고
    if (priceImpact > 5) {
      warnings.push(`높은 가격 임팩트: ${priceImpact.toFixed(2)}%`);
    }

    // 슬리피지 초과 체크
    if (priceImpact > params.slippageTolerance) {
      errors.push(
        `슬리피지 초과: ${priceImpact.toFixed(2)}% > ${params.slippageTolerance}%`,
      );
    }

    // 최소 출력량 미달 체크
    if (amountOut < params.minAmountOut) {
      errors.push(
        `최소 출력량 미달: ${amountOut.toFixed(6)} < ${params.minAmountOut}`,
      );
    }

    // 유동성 부족 체크 (풀의 90% 이상 빼가려고 하면)
    if (amountOut > reserveOut * 0.9) {
      errors.push('출력량이 풀 유동성의 90%를 초과합니다');
    }

    const isExecutable = errors.length === 0;

    return {
      expectedAmountOut: amountOut,
      fee,
      amountInAfterFee,
      priceImpact,
      priceBefore,
      priceAfter,
      isExecutable,
      warnings,
      errors,
    };
  }

  /**
   * 스왑 실행
   *
   * 실제로 풀의 상태를 변경하여 스왑을 실행합니다.
   *
   * 프로세스:
   * 1. 시뮬레이션 실행 (검증)
   * 2. 풀 상태 업데이트
   * 3. k 값 재계산 (수수료로 인해 증가)
   * 4. 결과 반환
   *
   * @param params 스왑 파라미터
   * @returns 스왑 결과
   */
  executeSwap(params: SingletonSwapParams): SingletonSwapResult {
    const pool = this.getPool(params.poolId);

    // 풀이 존재하지 않는 경우
    if (!pool) {
      return this.createFailedSwapResult(
        params,
        { reserveA: 0, reserveB: 0, k: 0, price: 0 },
        '풀을 찾을 수 없습니다',
      );
    }

    // ==========================================
    // 1단계: 시뮬레이션으로 검증
    // ==========================================
    const simulation = this.simulateSwap(params);
    if (!simulation.isExecutable) {
      return this.createFailedSwapResult(
        params,
        {
          reserveA: pool.reserveA,
          reserveB: pool.reserveB,
          k: pool.k,
          price: pool.currentPrice,
        },
        simulation.errors.join(', '),
      );
    }

    // ==========================================
    // 2단계: 스왑 ID 생성 및 실행 전 상태 저장
    // ==========================================
    const swapId = `swap_${++this.swapCounter}_${Date.now()}`;

    const poolStateBefore = {
      reserveA: pool.reserveA,
      reserveB: pool.reserveB,
      k: pool.k,
      price: pool.currentPrice,
    };

    // ==========================================
    // 3단계: 풀 상태 업데이트
    // ==========================================
    const isTokenAInput = params.tokenIn === pool.tokenA;

    if (isTokenAInput) {
      // ETH를 팔고 USDC를 사는 경우
      pool.reserveA += params.amountIn; // ETH 증가
      pool.reserveB -= simulation.expectedAmountOut; // USDC 감소
    } else {
      // USDC를 팔고 ETH를 사는 경우
      pool.reserveB += params.amountIn; // USDC 증가
      pool.reserveA -= simulation.expectedAmountOut; // ETH 감소
    }

    // ==========================================
    // 4단계: k 값 및 가격 업데이트
    // ==========================================
    // 수수료로 인해 k 값은 증가합니다!
    // 예: 거래 전 k = 2,000,000,000
    //     거래 후 k = 2,000,876,976 (0.04% 증가)
    pool.k = pool.reserveA * pool.reserveB;
    pool.currentPrice = pool.reserveB / pool.reserveA;
    pool.totalVolume += params.amountIn;
    pool.swapCount += 1;
    pool.lastUpdated = new Date();

    // 실행 후 상태
    const poolStateAfter = {
      reserveA: pool.reserveA,
      reserveB: pool.reserveB,
      k: pool.k,
      price: pool.currentPrice,
    };

    this.logger.log(
      `스왑 실행: ${swapId} | ${params.amountIn} ${params.tokenIn} → ${simulation.expectedAmountOut.toFixed(6)} ${params.tokenOut} | 임팩트: ${simulation.priceImpact.toFixed(2)}%`,
    );

    return {
      swapId,
      poolId: params.poolId,
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      amountIn: params.amountIn,
      amountOut: simulation.expectedAmountOut,
      fee: simulation.fee,
      priceImpact: simulation.priceImpact,
      poolStateBefore,
      poolStateAfter,
      timestamp: new Date(),
      success: true,
    };
  }

  /**
   * 실패한 스왑 결과 생성 (헬퍼 메서드)
   */
  private createFailedSwapResult(
    params: SingletonSwapParams,
    poolState: { reserveA: number; reserveB: number; k: number; price: number },
    error: string,
  ): SingletonSwapResult {
    return {
      swapId: '',
      poolId: params.poolId,
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      amountIn: 0,
      amountOut: 0,
      fee: 0,
      priceImpact: 0,
      poolStateBefore: poolState,
      poolStateAfter: poolState,
      timestamp: new Date(),
      success: false,
      error,
    };
  }

  /**
   * 가격 임팩트 분석
   *
   * 특정 거래량에 대한 가격 임팩트를 상세히 분석합니다.
   *
   * @param poolId 풀 ID
   * @param tokenIn 입력 토큰
   * @param amountIn 입력 수량
   * @returns 가격 임팩트 분석 결과
   */
  analyzePriceImpact(
    poolId: string,
    tokenIn: string,
    amountIn: number,
  ): PriceImpactAnalysis {
    const pool = this.getPool(poolId);
    if (!pool) {
      throw new Error('풀을 찾을 수 없습니다');
    }

    // 시뮬레이션 실행
    const simulation = this.simulateSwap({
      poolId,
      tokenIn,
      tokenOut: tokenIn === pool.tokenA ? pool.tokenB : pool.tokenA,
      amountIn,
      minAmountOut: 0,
      recipient: '0x0',
      slippageTolerance: 100, // 검증 스킵
    });

    // 임팩트 레벨 판정
    let level: 'low' | 'medium' | 'high' | 'extreme';
    let recommendation: string;

    if (simulation.priceImpact < 0.1) {
      level = 'low';
      recommendation = '안전한 거래량입니다';
    } else if (simulation.priceImpact < 1) {
      level = 'medium';
      recommendation = '적정 거래량입니다';
    } else if (simulation.priceImpact < 5) {
      level = 'high';
      recommendation = '거래량을 줄이는 것을 권장합니다';
    } else {
      level = 'extreme';
      recommendation = '거래량을 대폭 줄이거나 다른 경로를 찾으세요';
    }

    return {
      amountIn,
      amountOut: simulation.expectedAmountOut,
      impact: simulation.priceImpact,
      level,
      currentPrice: simulation.priceBefore,
      expectedPrice: simulation.priceAfter,
      recommendation,
    };
  }

  /**
   * 풀 통계 조회
   *
   * 싱글톤 컨트랙트 전체의 통계를 반환합니다.
   *
   * @returns 풀 통계
   */
  getPoolStats(): SingletonPoolStats {
    const pools = Array.from(this.pools.values());

    // 전체 유동성 (USD)
    const totalLiquidity = pools.reduce(
      (sum, pool) => sum + this.calculatePoolLiquidity(pool),
      0,
    );

    // 전체 거래량 (USD)
    const totalVolume = pools.reduce((sum, pool) => {
      const tokenPrice = this.TOKEN_PRICES[pool.tokenA] || 1;
      return sum + pool.totalVolume * tokenPrice;
    }, 0);

    // 전체 스왑 횟수
    const totalSwaps = pools.reduce((sum, pool) => sum + pool.swapCount, 0);

    // 평균 풀 크기
    const averagePoolSize = totalLiquidity / pools.length;

    // 가장 활발한 풀
    const mostActivePool =
      pools.sort((a, b) => b.swapCount - a.swapCount)[0]?.poolId || '';

    return {
      totalPools: pools.length,
      totalLiquidity,
      totalVolume,
      totalSwaps,
      averagePoolSize,
      mostActivePool,
    };
  }

  /**
   * 풀 리셋 (테스트/디버깅용)
   *
   * 모든 풀을 초기 상태로 되돌립니다.
   */
  resetPools(): void {
    this.pools.clear();
    this.swapCounter = 0;
    this.initializeDefaultPools();
    this.logger.log('모든 풀이 초기화되었습니다');
  }
}
