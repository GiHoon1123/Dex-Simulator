import { Injectable, Logger } from '@nestjs/common';
import {
  AutoSwapParams,
  AutoSwapResult,
  MultiHopSwapParams,
  Route,
  RouteComparison,
  RouteSearchOptions,
  RouteSearchResult,
} from '../types/router.interface';
import { SingletonContractService } from './singleton-contract.service';

/**
 * 라우터 컨트랙트 서비스
 *
 * 멀티홉 최적화 라우터를 시뮬레이션합니다.
 * 여러 풀을 거쳐가는 최적 경로를 찾아줍니다.
 *
 * 핵심 기능:
 * 1. BFS 알고리즘으로 모든 가능한 경로 탐색
 * 2. 각 경로의 출력량 계산
 * 3. 가스비, 슬리피지 고려하여 최적 경로 선택
 * 4. 멀티홉 스왑 실행
 *
 * 시뮬레이터 목표:
 * - 직접 경로 vs 멀티홉 비교
 * - 싱글톤 컨트랙트의 가스 효율성 시연
 */
@Injectable()
export class RouterContractService {
  private readonly logger = new Logger(RouterContractService.name);

  /** 가스비 상수 (Mock) */
  private readonly GAS_PER_HOP = 50000; // 홉당 50,000 gas
  private readonly BASE_GAS = 100000; // 기본 100,000 gas

  /** 경로 카운터 */
  private routeCounter = 0;

  /** 스왑 카운터 */
  private swapCounter = 0;

  constructor(private readonly singletonService: SingletonContractService) {}

  /**
   * 자동 스왑
   *
   * 최적 경로를 자동으로 찾아서 스왑을 실행합니다.
   * 사용자는 토큰과 수량만 입력하면 됩니다.
   *
   * @param params 스왑 파라미터
   * @returns 스왑 결과
   */
  autoSwap(params: AutoSwapParams): AutoSwapResult {
    const startTime = Date.now();

    this.logger.log(
      `자동 스왑 시작: ${params.amountIn} ${params.tokenIn} → ${params.tokenOut}`,
    );

    // 1. 최적 경로 찾기
    const routes = this.findAllRoutes(
      params.tokenIn,
      params.tokenOut,
      params.amountIn,
      params.options,
    );

    if (routes.length === 0) {
      return {
        swapId: '',
        routeUsed: {} as Route,
        hopsExecuted: [],
        finalAmountOut: 0,
        totalPriceImpact: 0,
        totalGasUsed: 0,
        totalFee: 0,
        executionTime: Date.now() - startTime,
        success: false,
        timestamp: new Date(),
        error: '가능한 경로를 찾을 수 없습니다',
      };
    }

    const bestRoute = this.selectBestRoute(routes, params.slippageTolerance);

    if (!bestRoute.feasible) {
      return {
        swapId: '',
        routeUsed: bestRoute,
        hopsExecuted: [],
        finalAmountOut: 0,
        totalPriceImpact: 0,
        totalGasUsed: 0,
        totalFee: 0,
        executionTime: Date.now() - startTime,
        success: false,
        timestamp: new Date(),
        error: bestRoute.errors.join(', '),
      };
    }

    // 2. 멀티홉 스왑 실행
    const result = this.executeMultiHopSwap({
      route: bestRoute,
      minAmountOut: params.minAmountOut || 0,
      recipient: params.recipient,
    });

    const executionTime = Date.now() - startTime;

    this.logger.log(
      `자동 스왑 완료: ${result.finalAmountOut.toFixed(6)} ${params.tokenOut} (${bestRoute.type}, ${executionTime}ms)`,
    );

    return {
      ...result,
      executionTime,
    };
  }

  /**
   * 모든 가능한 경로 찾기
   *
   * BFS 알고리즘으로 토큰 A에서 토큰 B로 가는
   * 모든 경로를 탐색합니다.
   *
   * @param tokenIn 입력 토큰
   * @param tokenOut 출력 토큰
   * @param amountIn 입력 수량
   * @param options 탐색 옵션
   * @returns 발견된 모든 경로
   */
  findAllRoutes(
    tokenIn: string,
    tokenOut: string,
    amountIn: number,
    options?: RouteSearchOptions,
  ): Route[] {
    const maxHops = options?.maxHops || 3;
    const startTime = Date.now();

    this.logger.log(
      `경로 탐색 시작: ${tokenIn} → ${tokenOut} (최대 ${maxHops}홉)`,
    );

    // BFS로 모든 경로 찾기
    const paths = this.searchPaths(tokenIn, tokenOut, maxHops);

    this.logger.log(`${paths.length}개 경로 발견`);

    // 각 경로의 출력량 계산 및 Route 객체 생성
    const routes = paths
      .map((path) => this.calculateRoute(path, amountIn, options))
      .filter((route) => route !== null) as Route[];

    const searchTime = Date.now() - startTime;
    this.logger.log(`경로 계산 완료 (${searchTime}ms)`);

    return routes;
  }

  /**
   * BFS로 경로 탐색
   *
   * 너비 우선 탐색으로 모든 가능한 경로를 찾습니다.
   *
   * @param tokenIn 시작 토큰
   * @param tokenOut 목적지 토큰
   * @param maxHops 최대 홉 수
   * @returns 토큰 경로 목록
   */
  private searchPaths(
    tokenIn: string,
    tokenOut: string,
    maxHops: number,
  ): string[][] {
    const paths: string[][] = [];
    const queue: Array<{
      current: string;
      path: string[];
      visited: Set<string>;
    }> = [
      {
        current: tokenIn,
        path: [tokenIn],
        visited: new Set([tokenIn]),
      },
    ];

    while (queue.length > 0) {
      const { current, path, visited } = queue.shift()!;

      // 목적지에 도착했으면 경로 저장
      if (current === tokenOut) {
        paths.push(path);
        continue;
      }

      // 최대 홉 수 초과하면 스킵
      if (path.length > maxHops) {
        continue;
      }

      // 현재 토큰과 연결된 모든 풀 찾기
      const allPools = this.singletonService.getAllPools();
      const connectedPools = allPools.filter(
        (pool) =>
          (pool.tokenA === current || pool.tokenB === current) &&
          !visited.has(this.getOtherToken(pool, current)),
      );

      // 다음 홉 추가
      for (const pool of connectedPools) {
        const nextToken = this.getOtherToken(pool, current);
        queue.push({
          current: nextToken,
          path: [...path, nextToken],
          visited: new Set([...visited, nextToken]),
        });
      }
    }

    return paths;
  }

  /**
   * 풀에서 다른 토큰 가져오기
   *
   * @param pool 풀
   * @param currentToken 현재 토큰
   * @returns 다른 토큰
   */
  private getOtherToken(
    pool: { tokenA: string; tokenB: string },
    currentToken: string,
  ): string {
    return pool.tokenA === currentToken ? pool.tokenB : pool.tokenA;
  }

  /**
   * 경로 계산
   *
   * 토큰 경로를 받아서 실제 출력량, 가스비 등을 계산합니다.
   *
   * @param path 토큰 경로
   * @param amountIn 입력 수량
   * @param options 옵션
   * @returns Route 객체 또는 null
   */
  private calculateRoute(
    path: string[],
    amountIn: number,
    options?: RouteSearchOptions,
  ): Route | null {
    const routeId = `route_${++this.routeCounter}_${Date.now()}`;
    const hops = path.length - 1;
    const type = hops === 1 ? 'direct' : 'multi-hop';

    // 각 홉별 풀 찾기
    const pools: string[] = [];
    for (let i = 0; i < path.length - 1; i++) {
      const pool = this.singletonService.findPoolByTokens(path[i], path[i + 1]);
      if (!pool) {
        return null; // 풀이 없으면 불가능한 경로
      }
      pools.push(pool.poolId);
    }

    // 각 홉 시뮬레이션
    let currentAmountIn = amountIn;
    const hopsDetail: Route['hopsDetail'] = [];
    let totalFee = 0;
    let totalPriceImpact = 0;
    const warnings: string[] = [];
    const errors: string[] = [];

    for (let i = 0; i < pools.length; i++) {
      const poolId = pools[i];
      const tokenIn = path[i];
      const tokenOut = path[i + 1];

      // 싱글톤 서비스로 시뮬레이션
      const simulation = this.singletonService.simulateSwap({
        poolId,
        tokenIn,
        tokenOut,
        amountIn: currentAmountIn,
        minAmountOut: 0,
        recipient: '0x0',
        slippageTolerance: options?.slippageTolerance || 100,
      });

      if (!simulation.isExecutable) {
        errors.push(...simulation.errors);
      }

      warnings.push(...simulation.warnings);

      hopsDetail.push({
        poolId,
        tokenIn,
        tokenOut,
        amountIn: currentAmountIn,
        amountOut: simulation.expectedAmountOut,
        priceImpact: simulation.priceImpact,
      });

      totalFee += simulation.fee;
      totalPriceImpact += simulation.priceImpact;

      // 다음 홉의 입력은 이번 홉의 출력
      currentAmountIn = simulation.expectedAmountOut;
    }

    const expectedAmountOut = currentAmountIn;

    // 가스비 추정
    const gasEstimate = this.estimateGas(hops);

    // 실행 가능성 판단
    const slippageTolerance = options?.slippageTolerance || 0.5;
    let feasible = errors.length === 0;
    let reason = '';

    if (totalPriceImpact > slippageTolerance) {
      warnings.push(
        `총 가격 임팩트가 슬리피지 허용 범위를 초과합니다: ${totalPriceImpact.toFixed(2)}% > ${slippageTolerance}%`,
      );
    }

    if (totalPriceImpact > 10) {
      feasible = false;
      errors.push('가격 임팩트가 너무 높습니다 (10% 초과)');
      reason = '가격 임팩트 너무 높음';
    }

    // 추천 여부는 나중에 selectBestRoute에서 결정
    const recommended = false;

    return {
      routeId,
      path,
      pools,
      type,
      hops,
      expectedAmountOut,
      priceImpact: totalPriceImpact,
      hopsDetail,
      gasEstimate,
      totalFee,
      feasible,
      warnings,
      errors,
      recommended,
      reason,
    };
  }

  /**
   * 가스비 추정 (싱글톤 컨트랙트)
   *
   * 홉 수에 따라 가스비를 계산합니다.
   * 싱글톤은 한 번의 컨트랙트 호출로 여러 풀에 접근합니다.
   *
   * 계산식:
   * - 1-hop: 100,000 + 50,000 = 150,000 gas
   * - 2-hop: 100,000 + 100,000 = 200,000 gas
   * - 3-hop: 100,000 + 150,000 = 250,000 gas
   *
   * @param hops 홉 수
   * @returns 가스비
   */
  private estimateGas(hops: number): number {
    return this.BASE_GAS + hops * this.GAS_PER_HOP;
  }

  /**
   * 일반 DEX 가스비 추정 (비교용)
   *
   * 일반 DEX는 각 풀이 별도의 컨트랙트이므로
   * 홉마다 새로운 컨트랙트를 호출해야 합니다.
   *
   * 차이점:
   * - 1-hop: 싱글톤과 거의 동일 (같은 컨트랙트 1번 호출)
   * - 2-hop 이상: 홉마다 컨트랙트 호출 (비용 증가!)
   *
   * 계산식:
   * - 1-hop: 150,000 gas (싱글톤과 동일)
   * - 2-hop: 150,000 * 2 = 300,000 gas (각 풀마다 별도 호출)
   * - 3-hop: 150,000 * 3 = 450,000 gas
   *
   * @param hops 홉 수
   * @returns 가스비
   */
  private estimateRegularDexGas(hops: number): number {
    if (hops === 1) {
      // 1-hop일 때는 싱글톤과 거의 동일
      // (둘 다 컨트랙트 1번만 호출)
      return this.BASE_GAS + this.GAS_PER_HOP;
    } else {
      // 멀티홉일 때는 각 홉마다 별도 컨트랙트 호출
      // 각 호출마다 기본 가스 + 실행 가스 필요
      return (this.BASE_GAS + this.GAS_PER_HOP) * hops;
    }
  }

  /**
   * 최적 경로 선택
   *
   * 여러 경로 중에서 가장 좋은 경로를 선택합니다.
   *
   * 선택 기준:
   * 1. 실행 가능한 경로만
   * 2. 출력량이 많을수록 좋음
   * 3. 가스비가 적을수록 좋음
   * 4. 가격 임팩트가 적을수록 좋음
   *
   * @param routes 경로 목록
   * @param slippageTolerance 슬리피지 허용 범위
   * @returns 최적 경로
   */
  private selectBestRoute(routes: Route[], slippageTolerance: number): Route {
    // 실행 가능한 경로만 필터링
    const feasibleRoutes = routes.filter((route) => route.feasible);

    if (feasibleRoutes.length === 0) {
      // 실행 가능한 경로가 없으면 가장 덜 나쁜 것 선택
      return routes.sort(
        (a, b) => b.expectedAmountOut - a.expectedAmountOut,
      )[0];
    }

    // 출력량 기준으로 정렬
    const sortedRoutes = feasibleRoutes.sort(
      (a, b) => b.expectedAmountOut - a.expectedAmountOut,
    );

    const bestRoute = sortedRoutes[0];
    bestRoute.recommended = true;
    bestRoute.reason = `최대 출력량: ${bestRoute.expectedAmountOut.toFixed(6)}`;

    return bestRoute;
  }

  /**
   * 경로 비교
   *
   * 직접 경로 vs 멀티홉 경로를 비교합니다.
   * 시뮬레이터의 핵심 기능!
   *
   * @param tokenIn 입력 토큰
   * @param tokenOut 출력 토큰
   * @param amountIn 입력 수량
   * @param options 옵션
   * @returns 비교 결과
   */
  compareRoutes(
    tokenIn: string,
    tokenOut: string,
    amountIn: number,
    options?: RouteSearchOptions,
  ): RouteComparison {
    // 모든 경로 찾기
    const allRoutes = this.findAllRoutes(tokenIn, tokenOut, amountIn, options);

    if (allRoutes.length === 0) {
      throw new Error('가능한 경로를 찾을 수 없습니다');
    }

    // 최적 경로 선택
    const bestRoute = this.selectBestRoute(
      allRoutes,
      options?.slippageTolerance || 0.5,
    );

    // 직접 경로 찾기
    const directRoute = allRoutes.find((route) => route.type === 'direct');

    // 최고의 멀티홉 경로 찾기
    const multiHopRoutes = allRoutes.filter(
      (route) => route.type === 'multi-hop' && route.feasible,
    );
    const bestMultiHopRoute =
      multiHopRoutes.length > 0
        ? multiHopRoutes.sort(
            (a, b) => b.expectedAmountOut - a.expectedAmountOut,
          )[0]
        : undefined;

    // 직접 vs 멀티홉 비교
    let comparison: RouteComparison['comparison'] | undefined;
    if (directRoute && bestMultiHopRoute) {
      const outputDiff =
        bestMultiHopRoute.expectedAmountOut - directRoute.expectedAmountOut;
      const outputDiffPercent =
        (outputDiff / directRoute.expectedAmountOut) * 100;
      const impactDiff =
        directRoute.priceImpact - bestMultiHopRoute.priceImpact;
      const gasDiff = bestMultiHopRoute.gasEstimate - directRoute.gasEstimate;

      let recommendation: 'direct' | 'multi-hop';
      let reason: string;

      if (outputDiff > 0 && Math.abs(outputDiffPercent) > 5) {
        recommendation = 'multi-hop';
        reason = `멀티홉이 ${outputDiffPercent.toFixed(1)}% 더 많은 출력량 제공`;
      } else if (gasDiff > 50000) {
        recommendation = 'direct';
        reason = `가스비 ${gasDiff.toLocaleString()} 절약`;
      } else if (impactDiff > 5) {
        recommendation = 'multi-hop';
        reason = `가격 임팩트 ${impactDiff.toFixed(1)}% 낮음`;
      } else {
        recommendation = outputDiff > 0 ? 'multi-hop' : 'direct';
        reason = '출력량 기준';
      }

      comparison = {
        outputDiff,
        outputDiffPercent,
        impactDiff,
        gasDiff,
        recommendation,
        reason,
      };
    }

    // 싱글톤 vs 일반 DEX 가스비 비교
    const singletonGas = bestRoute.gasEstimate;
    const regularDexGas = this.estimateRegularDexGas(bestRoute.hops);
    const gasSaved = regularDexGas - singletonGas;
    const gasSavedPercent = (gasSaved / regularDexGas) * 100;

    return {
      tokenIn,
      tokenOut,
      amountIn,
      allRoutes,
      bestRoute,
      directRoute,
      bestMultiHopRoute,
      comparison,
      singletonAdvantage: {
        singletonGas,
        regularDexGas,
        gasSaved,
        gasSavedPercent,
      },
    };
  }

  /**
   * 경로 탐색 (실행 없이 조회만)
   *
   * @param tokenIn 입력 토큰
   * @param tokenOut 출력 토큰
   * @param amountIn 입력 수량
   * @param options 옵션
   * @returns 탐색 결과
   */
  searchRoutes(
    tokenIn: string,
    tokenOut: string,
    amountIn: number,
    options?: RouteSearchOptions,
  ): RouteSearchResult {
    const startTime = Date.now();

    const routes = this.findAllRoutes(tokenIn, tokenOut, amountIn, options);

    const directRoutes = routes.filter((r) => r.type === 'direct').length;
    const twoHopRoutes = routes.filter((r) => r.hops === 2).length;
    const threeHopRoutes = routes.filter((r) => r.hops === 3).length;

    const searchTime = Date.now() - startTime;

    return {
      tokenIn,
      tokenOut,
      amountIn,
      routes,
      totalRoutes: routes.length,
      directRoutes,
      twoHopRoutes,
      threeHopRoutes,
      searchTime,
    };
  }

  /**
   * 멀티홉 스왑 실행
   *
   * 주어진 경로대로 스왑을 실행합니다.
   *
   * @param params 멀티홉 스왑 파라미터
   * @returns 스왑 결과
   */
  executeMultiHopSwap(params: MultiHopSwapParams): AutoSwapResult {
    const swapId = `multiswap_${++this.swapCounter}_${Date.now()}`;
    const startTime = Date.now();

    const { route, minAmountOut, recipient } = params;

    this.logger.log(
      `멀티홉 스왑 실행: ${route.path.join(' → ')} (${route.hops}홉)`,
    );

    // 각 홉 실행
    let currentAmountIn = route.hopsDetail[0].amountIn;
    const hopsExecuted: AutoSwapResult['hopsExecuted'] = [];
    let totalGasUsed = 0;
    let totalFee = 0;

    for (const hopDetail of route.hopsDetail) {
      // 싱글톤 서비스로 실제 스왑 실행
      const swapResult = this.singletonService.executeSwap({
        poolId: hopDetail.poolId,
        tokenIn: hopDetail.tokenIn,
        tokenOut: hopDetail.tokenOut,
        amountIn: currentAmountIn,
        minAmountOut: 0, // 각 홉에서는 체크 안 함
        recipient,
        slippageTolerance: 100, // 전체 경로에서 체크
      });

      if (!swapResult.success) {
        return {
          swapId,
          routeUsed: route,
          hopsExecuted,
          finalAmountOut: 0,
          totalPriceImpact: 0,
          totalGasUsed: 0,
          totalFee: 0,
          executionTime: Date.now() - startTime,
          success: false,
          timestamp: new Date(),
          error: swapResult.error,
        };
      }

      hopsExecuted.push({
        poolId: hopDetail.poolId,
        swapId: swapResult.swapId,
        tokenIn: hopDetail.tokenIn,
        tokenOut: hopDetail.tokenOut,
        amountIn: currentAmountIn,
        amountOut: swapResult.amountOut,
        priceImpact: swapResult.priceImpact,
        timestamp: swapResult.timestamp,
      });

      totalFee += swapResult.fee;
      totalGasUsed += route.gasEstimate / route.hops; // 균등 분배

      // 다음 홉의 입력은 이번 홉의 출력
      currentAmountIn = swapResult.amountOut;
    }

    const finalAmountOut = currentAmountIn;

    // 최소 출력량 체크
    if (finalAmountOut < minAmountOut) {
      return {
        swapId,
        routeUsed: route,
        hopsExecuted,
        finalAmountOut,
        totalPriceImpact: route.priceImpact,
        totalGasUsed,
        totalFee,
        executionTime: Date.now() - startTime,
        success: false,
        timestamp: new Date(),
        error: `최소 출력량 미달: ${finalAmountOut.toFixed(6)} < ${minAmountOut}`,
      };
    }

    const executionTime = Date.now() - startTime;

    this.logger.log(
      `멀티홉 스왑 완료: ${finalAmountOut.toFixed(6)} (${executionTime}ms)`,
    );

    return {
      swapId,
      routeUsed: route,
      hopsExecuted,
      finalAmountOut,
      totalPriceImpact: route.priceImpact,
      totalGasUsed,
      totalFee,
      executionTime,
      success: true,
      timestamp: new Date(),
    };
  }
}
