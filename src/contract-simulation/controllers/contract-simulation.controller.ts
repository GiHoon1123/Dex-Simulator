import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SingletonContractService } from '../services/singleton-contract.service';
import {
  CreateSingletonPoolParams,
  SingletonPoolQuery,
  SingletonSwapParams,
} from '../types/singleton.interface';

/**
 * 컨트랙트 시뮬레이션 컨트롤러
 *
 * 싱글톤 컨트랙트의 API를 제공합니다.
 *
 * 주요 기능:
 * 1. 풀 조회 및 통계
 * 2. 스왑 시뮬레이션 (견적)
 * 3. 스왑 실행
 * 4. 가격 임팩트 분석
 */
@ApiTags('Contract Simulation')
@Controller('contract-simulation')
export class ContractSimulationController {
  constructor(private readonly singletonService: SingletonContractService) {}

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
}
