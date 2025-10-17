import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RouterContractService } from '../services/router-contract.service';
import { SingletonContractService } from '../services/singleton-contract.service';
import {
  CreateSingletonPoolParams,
  SingletonPoolQuery,
  SingletonSwapParams,
} from '../types/singleton.interface';
import { AutoSwapParams, RouteSearchOptions } from '../types/router.interface';

/**
 * 컨트랙트 시뮬레이션 컨트롤러
 *
 * 싱글톤 컨트랙트와 라우터 컨트랙트의 API를 제공합니다.
 *
 * 주요 기능:
 * 1. 풀 조회 및 통계
 * 2. 스왑 시뮬레이션 (견적)
 * 3. 스왑 실행
 * 4. 가격 임팩트 분석
 * 5. 멀티홉 라우팅 (라우터)
 * 6. 경로 비교 (직접 vs 멀티홉)
 */
@ApiTags('Contract Simulation')
@Controller('contract-simulation')
export class ContractSimulationController {
  constructor(
    private readonly singletonService: SingletonContractService,
    private readonly routerService: RouterContractService,
  ) {}

  // ==========================================
  // 풀 관련 API
  // ==========================================

  /**
   * 모든 풀 조회
   *
   * GET /contract-simulation/pools
   * GET /contract-simulation/pools?token=ETH
   * GET /contract-simulation/pools?sortBy=liquidity&sortOrder=desc
   */
  @Get('pools')
  @ApiTags('Singleton Contract - Pool Management')
  @ApiOperation({ summary: '모든 풀 조회' })
  getAllPools(@Query() query: SingletonPoolQuery) {
    return this.singletonService.getAllPools(query);
  }

  /**
   * 특정 풀 조회
   *
   * GET /contract-simulation/pools/:poolId
   */
  @Get('pools/:poolId')
  @ApiTags('Singleton Contract - Pool Management')
  @ApiOperation({ summary: '특정 풀 조회' })
  getPool(@Param('poolId') poolId: string) {
    const pool = this.singletonService.getPool(poolId);
    if (!pool) {
      return {
        success: false,
        error: '풀을 찾을 수 없습니다',
      };
    }
    return {
      success: true,
      pool,
    };
  }

  /**
   * 토큰 쌍으로 풀 찾기
   *
   * GET /contract-simulation/pools/find?tokenA=ETH&tokenB=USDC
   */
  @Get('pools/find/by-tokens')
  @ApiTags('Singleton Contract - Pool Management')
  @ApiOperation({ summary: '토큰 쌍으로 풀 찾기' })
  findPoolByTokens(
    @Query('tokenA') tokenA: string,
    @Query('tokenB') tokenB: string,
  ) {
    const pool = this.singletonService.findPoolByTokens(tokenA, tokenB);
    if (!pool) {
      return {
        success: false,
        error: '풀을 찾을 수 없습니다',
      };
    }
    return {
      success: true,
      pool,
    };
  }

  /**
   * 풀 생성
   *
   * POST /contract-simulation/pools
   * {
   *   "tokenA": "USDT",
   *   "tokenB": "USDC",
   *   "initialReserveA": 1000000,
   *   "initialReserveB": 1000000,
   *   "feeRate": 0.0001
   * }
   */
  @Post('pools')
  @ApiTags('Singleton Contract - Pool Management')
  @ApiOperation({ summary: '새로운 풀 생성' })
  createPool(@Body() params: CreateSingletonPoolParams) {
    try {
      const pool = this.singletonService.createPool(params);
      return {
        success: true,
        pool,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 풀 통계 조회
   *
   * GET /contract-simulation/stats
   */
  @Get('stats')
  @ApiTags('Singleton Contract - Pool Management')
  @ApiOperation({ summary: '전체 풀 통계 조회' })
  getPoolStats() {
    return this.singletonService.getPoolStats();
  }

  // ==========================================
  // 스왑 관련 API
  // ==========================================

  /**
   * 스왑 시뮬레이션 (견적)
   *
   * 실제 스왑을 실행하지 않고 예상 결과만 계산합니다.
   * 라우터가 최적 경로를 찾을 때 사용합니다.
   *
   * POST /contract-simulation/simulate-swap
   * {
   *   "poolId": "pool_eth_usdc",
   *   "tokenIn": "ETH",
   *   "tokenOut": "USDC",
   *   "amountIn": 100,
   *   "minAmountOut": 190000,
   *   "recipient": "0x123...",
   *   "slippageTolerance": 0.5
   * }
   */
  @Post('simulate-swap')
  @ApiTags('Singleton Contract - Swap')
  @ApiOperation({
    summary: '스왑 시뮬레이션',
    description: '실제 실행 없이 예상 결과만 계산',
  })
  simulateSwap(@Body() params: SingletonSwapParams) {
    const simulation = this.singletonService.simulateSwap(params);
    return {
      success: simulation.isExecutable,
      simulation,
    };
  }

  /**
   * 스왑 실행
   *
   * 실제로 풀의 상태를 변경하여 스왑을 실행합니다.
   *
   * POST /contract-simulation/swap
   * {
   *   "poolId": "pool_eth_usdc",
   *   "tokenIn": "ETH",
   *   "tokenOut": "USDC",
   *   "amountIn": 100,
   *   "minAmountOut": 190000,
   *   "recipient": "0x123...",
   *   "slippageTolerance": 0.5
   * }
   */
  @Post('swap')
  @ApiTags('Singleton Contract - Swap')
  @ApiOperation({
    summary: '스왑 실행',
    description: '실제로 풀 상태를 변경하여 스왑 실행',
  })
  executeSwap(@Body() params: SingletonSwapParams) {
    const result = this.singletonService.executeSwap(params);
    return result;
  }

  // ==========================================
  // 분석 API
  // ==========================================

  /**
   * 가격 임팩트 분석
   *
   * 특정 거래량에 대한 가격 임팩트를 상세히 분석합니다.
   *
   * GET /contract-simulation/analyze-price-impact
   *   ?poolId=pool_eth_usdc
   *   &tokenIn=ETH
   *   &amountIn=100
   */
  @Get('analyze-price-impact')
  @ApiTags('Singleton Contract - Analysis')
  @ApiOperation({
    summary: '가격 임팩트 분석',
    description: '거래량에 따른 가격 임팩트 상세 분석',
  })
  analyzePriceImpact(
    @Query('poolId') poolId: string,
    @Query('tokenIn') tokenIn: string,
    @Query('amountIn') amountIn: string,
  ) {
    try {
      const analysis = this.singletonService.analyzePriceImpact(
        poolId,
        tokenIn,
        parseFloat(amountIn),
      );
      return {
        success: true,
        analysis,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 여러 거래량에 대한 가격 임팩트 비교
   *
   * 작은 거래 vs 큰 거래의 임팩트 차이를 보여줍니다.
   *
   * GET /contract-simulation/compare-price-impacts
   *   ?poolId=pool_eth_usdc
   *   &tokenIn=ETH
   *   &amounts=1,10,100,500
   */
  @Get('compare-price-impacts')
  @ApiTags('Singleton Contract - Analysis')
  @ApiOperation({
    summary: '여러 거래량에 대한 가격 임팩트 비교',
    description: '거래량에 따른 임팩트 변화 시각화',
  })
  comparePriceImpacts(
    @Query('poolId') poolId: string,
    @Query('tokenIn') tokenIn: string,
    @Query('amounts') amounts: string, // "1,10,100,500"
  ) {
    try {
      const amountList = amounts.split(',').map((a) => parseFloat(a.trim()));
      const comparisons = amountList.map((amount) => {
        const analysis = this.singletonService.analyzePriceImpact(
          poolId,
          tokenIn,
          amount,
        );
        return {
          amountIn: amount,
          priceImpact: analysis.impact,
          level: analysis.level,
          amountOut: analysis.amountOut,
        };
      });

      return {
        success: true,
        poolId,
        tokenIn,
        comparisons,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ==========================================
  // 유틸리티 API
  // ==========================================

  /**
   * 풀 리셋
   *
   * 모든 풀을 초기 상태로 되돌립니다.
   * 테스트/디버깅 용도입니다.
   *
   * POST /contract-simulation/reset
   */
  @Post('reset')
  @ApiTags('Singleton Contract - Utility')
  @ApiOperation({
    summary: '풀 리셋',
    description: '모든 풀을 초기 상태로 되돌림 (테스트용)',
  })
  resetPools() {
    this.singletonService.resetPools();
    return {
      success: true,
      message: '모든 풀이 초기화되었습니다',
    };
  }

  // ==========================================
  // 라우터 API (멀티홉)
  // ==========================================

  /**
   * 자동 스왑 (라우터)
   *
   * 최적 경로를 자동으로 찾아서 스왑을 실행합니다.
   * 사용자는 토큰과 수량만 입력하면 됩니다!
   *
   * POST /contract-simulation/auto-swap
   * {
   *   "tokenIn": "ETH",
   *   "tokenOut": "DAI",
   *   "amountIn": 100,
   *   "slippageTolerance": 0.5,
   *   "recipient": "0x123...",
   *   "options": {
   *     "maxHops": 3
   *   }
   * }
   */
  @Post('auto-swap')
  @ApiTags('Router Contract - Auto Swap')
  @ApiOperation({
    summary: '자동 스왑 (최적 경로)',
    description: '라우터가 자동으로 최적 경로를 찾아서 스왑 실행',
  })
  autoSwap(@Body() params: AutoSwapParams) {
    try {
      const result = this.routerService.autoSwap(params);
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 경로 비교
   *
   * 직접 경로 vs 멀티홉 경로를 비교합니다.
   * 시뮬레이터의 핵심 기능! 🎯
   *
   * POST /contract-simulation/compare-routes
   * {
   *   "tokenIn": "ETH",
   *   "tokenOut": "DAI",
   *   "amountIn": 100,
   *   "options": {
   *     "maxHops": 3,
   *     "slippageTolerance": 0.5
   *   }
   * }
   */
  @Post('compare-routes')
  @ApiTags('Router Contract - Route Comparison')
  @ApiOperation({
    summary: '경로 비교 (직접 vs 멀티홉)',
    description: '직접 스왑과 멀티홉 스왑을 비교하여 어느 것이 더 나은지 분석',
  })
  compareRoutes(
    @Body()
    body: {
      tokenIn: string;
      tokenOut: string;
      amountIn: number;
      options?: RouteSearchOptions;
    },
  ) {
    try {
      const comparison = this.routerService.compareRoutes(
        body.tokenIn,
        body.tokenOut,
        body.amountIn,
        body.options,
      );
      return {
        success: true,
        comparison,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 경로 탐색
   *
   * 모든 가능한 경로를 찾아서 보여줍니다.
   * 실행하지 않고 조회만 합니다.
   *
   * GET /contract-simulation/find-routes
   *   ?tokenIn=ETH
   *   &tokenOut=DAI
   *   &amountIn=100
   *   &maxHops=3
   */
  @Get('find-routes')
  @ApiTags('Router Contract - Route Search')
  @ApiOperation({
    summary: '경로 탐색',
    description: '모든 가능한 경로를 찾아서 반환 (실행 안 함)',
  })
  findRoutes(
    @Query('tokenIn') tokenIn: string,
    @Query('tokenOut') tokenOut: string,
    @Query('amountIn') amountIn: string,
    @Query('maxHops') maxHops?: string,
    @Query('slippageTolerance') slippageTolerance?: string,
  ) {
    try {
      const options: RouteSearchOptions = {
        maxHops: maxHops ? parseInt(maxHops) : 3,
        slippageTolerance: slippageTolerance
          ? parseFloat(slippageTolerance)
          : 0.5,
      };

      const result = this.routerService.searchRoutes(
        tokenIn,
        tokenOut,
        parseFloat(amountIn),
        options,
      );

      return {
        success: true,
        result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
