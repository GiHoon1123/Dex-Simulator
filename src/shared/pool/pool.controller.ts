import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  AddLiquidityDto,
  CreatePoolDto,
  ExecuteSwapDto,
  GetMEVOpportunitiesQueryDto,
  GetPoolsQueryDto,
  GetTWAPQueryDto,
  RemoveLiquidityDto,
  SimulateSwapDto,
  UpdateOracleConfigDto,
} from './dtos/pool.dto';
import { PoolOracleService } from './pool-oracle.service';
import { PoolService } from './pool.service';
import {
  MEVOpportunity,
  OracleStatus,
  PoolPrice,
  TWAPInfo,
} from './types/oracle.interface';
import { PoolSearchResult, PoolState, PoolStats } from './types/pool.interface';
import {
  AddLiquidityResult,
  RemoveLiquidityResult,
  SwapResult,
  SwapSimulation,
} from './types/swap.interface';

/**
 * 풀 컨트롤러
 *
 * 풀 관리, 스왑 실행, 유동성 관리, 오라클 기능 등의
 * API 엔드포인트를 제공합니다.
 */
@ApiTags('Pool')
@Controller('pool')
export class PoolController {
  constructor(
    private readonly poolService: PoolService,
    private readonly poolOracleService: PoolOracleService,
  ) {}

  // ========================================
  // 풀 관리 API
  // ========================================

  @Post('create')
  @ApiOperation({
    summary: '풀 생성',
    description: '새로운 AMM 풀을 생성합니다.',
  })
  @ApiResponse({
    status: 201,
    description: '풀이 성공적으로 생성되었습니다.',
  })
  @ApiResponse({
    status: 400,
    description: '잘못된 요청입니다.',
  })
  createPool(@Body() createPoolDto: CreatePoolDto): PoolState {
    return this.poolService.createPool(createPoolDto);
  }

  @Get('list')
  @ApiOperation({
    summary: '풀 목록 조회',
    description: '등록된 풀들의 목록을 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '풀 목록이 성공적으로 조회되었습니다.',
  })
  getPools(@Query() query: GetPoolsQueryDto): PoolSearchResult {
    return this.poolService.searchPools(query);
  }

  @Get(':poolAddress')
  @ApiOperation({
    summary: '풀 정보 조회',
    description: '특정 풀의 상세 정보를 조회합니다.',
  })
  @ApiParam({
    name: 'poolAddress',
    description: '풀 주소',
    example: '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8',
  })
  @ApiResponse({
    status: 200,
    description: '풀 정보가 성공적으로 조회되었습니다.',
  })
  @ApiResponse({
    status: 404,
    description: '풀을 찾을 수 없습니다.',
  })
  getPool(@Param('poolAddress') poolAddress: string): PoolState | null {
    return this.poolService.getPool(poolAddress);
  }

  @Get(':poolAddress/stats')
  @ApiOperation({
    summary: '풀 통계 조회',
    description: '특정 풀의 통계 정보를 조회합니다.',
  })
  @ApiParam({
    name: 'poolAddress',
    description: '풀 주소',
    example: '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8',
  })
  @ApiResponse({
    status: 200,
    description: '풀 통계가 성공적으로 조회되었습니다.',
  })
  getPoolStats(@Param('poolAddress') poolAddress: string): PoolStats | null {
    return this.poolService.getPoolStats(poolAddress);
  }

  @Get('stats/all')
  @ApiOperation({
    summary: '모든 풀 통계 조회',
    description: '모든 풀의 통계 정보를 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '모든 풀 통계가 성공적으로 조회되었습니다.',
  })
  getAllPoolStats(): PoolStats[] {
    return this.poolService.getAllPoolStats();
  }

  // ========================================
  // 스왑 API
  // ========================================

  @Post('swap/simulate')
  @ApiOperation({
    summary: '스왑 시뮬레이션',
    description: '스왑 실행 전 결과를 미리 계산합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '스왑 시뮬레이션이 성공적으로 실행되었습니다.',
  })
  simulateSwap(@Body() simulateSwapDto: SimulateSwapDto): SwapSimulation {
    // DTO를 SwapParams로 변환
    const swapParams = {
      poolAddress: simulateSwapDto.poolAddress,
      tokenIn: simulateSwapDto.tokenIn,
      tokenOut: simulateSwapDto.tokenOut,
      amountIn: simulateSwapDto.amountIn,
      amountOutMin: 0, // 시뮬레이션에서는 0으로 설정
      recipient: 'simulation',
      deadline: Math.floor(Date.now() / 1000) + 300,
      gasPrice: 100,
      gasLimit: 200000,
    };
    return this.poolService.simulateSwap(swapParams);
  }

  @Post('swap/execute')
  @ApiOperation({
    summary: '스왑 실행',
    description: '실제 스왑을 실행합니다.',
  })
  @ApiResponse({
    status: 201,
    description: '스왑이 성공적으로 실행되었습니다.',
  })
  @ApiResponse({
    status: 400,
    description: '스왑 실행에 실패했습니다.',
  })
  executeSwap(@Body() executeSwapDto: ExecuteSwapDto): SwapResult {
    // DTO를 SwapParams로 변환
    const swapParams = {
      poolAddress: executeSwapDto.poolAddress,
      tokenIn: executeSwapDto.tokenIn,
      tokenOut: executeSwapDto.tokenOut,
      amountIn: executeSwapDto.amountIn,
      amountOutMin: executeSwapDto.amountOutMin,
      recipient: executeSwapDto.recipient,
      deadline: executeSwapDto.deadline,
      gasPrice: executeSwapDto.gasPrice || 100,
      gasLimit: executeSwapDto.gasLimit || 200000,
    };
    return this.poolService.executeSwap(swapParams);
  }

  // ========================================
  // 유동성 관리 API
  // ========================================

  @Post('liquidity/add')
  @ApiOperation({
    summary: '유동성 추가',
    description: '풀에 유동성을 추가합니다.',
  })
  @ApiResponse({
    status: 201,
    description: '유동성이 성공적으로 추가되었습니다.',
  })
  @ApiResponse({
    status: 400,
    description: '유동성 추가에 실패했습니다.',
  })
  addLiquidity(@Body() addLiquidityDto: AddLiquidityDto): AddLiquidityResult {
    return this.poolService.addLiquidity(addLiquidityDto);
  }

  @Post('liquidity/remove')
  @ApiOperation({
    summary: '유동성 제거',
    description: '풀에서 유동성을 제거합니다.',
  })
  @ApiResponse({
    status: 201,
    description: '유동성이 성공적으로 제거되었습니다.',
  })
  @ApiResponse({
    status: 400,
    description: '유동성 제거에 실패했습니다.',
  })
  removeLiquidity(
    @Body() removeLiquidityDto: RemoveLiquidityDto,
  ): RemoveLiquidityResult {
    return this.poolService.removeLiquidity(removeLiquidityDto);
  }

  // ========================================
  // 오라클 API
  // ========================================

  @Get('oracle/status')
  @ApiOperation({
    summary: '오라클 상태 조회',
    description: '풀 오라클 서비스의 상태를 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '오라클 상태가 성공적으로 조회되었습니다.',
  })
  getOracleStatus(): OracleStatus {
    return this.poolOracleService.getOracleStatus();
  }

  @Get('oracle/prices')
  @ApiOperation({
    summary: '모든 풀 가격 조회',
    description: '모든 풀의 현재 가격 정보를 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '풀 가격 정보가 성공적으로 조회되었습니다.',
  })
  getAllPoolPrices(): PoolPrice[] {
    return this.poolOracleService.getAllPoolPrices();
  }

  @Get('oracle/price/:poolAddress')
  @ApiOperation({
    summary: '풀 가격 조회',
    description: '특정 풀의 현재 가격 정보를 조회합니다.',
  })
  @ApiParam({
    name: 'poolAddress',
    description: '풀 주소',
    example: '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8',
  })
  @ApiResponse({
    status: 200,
    description: '풀 가격 정보가 성공적으로 조회되었습니다.',
  })
  @ApiResponse({
    status: 404,
    description: '풀을 찾을 수 없습니다.',
  })
  getPoolPrice(@Param('poolAddress') poolAddress: string): PoolPrice | null {
    return this.poolOracleService.getPoolPrice(poolAddress);
  }

  @Get('oracle/twap')
  @ApiOperation({
    summary: 'TWAP 조회',
    description: '특정 풀의 TWAP(Time Weighted Average Price)을 조회합니다.',
  })
  @ApiQuery({
    name: 'poolAddress',
    description: '풀 주소',
    example: '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8',
  })
  @ApiQuery({
    name: 'period',
    description: 'TWAP 기간 (초)',
    example: 300,
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'TWAP 정보가 성공적으로 조회되었습니다.',
  })
  @ApiResponse({
    status: 404,
    description: '풀을 찾을 수 없습니다.',
  })
  getTWAP(@Query() query: GetTWAPQueryDto): TWAPInfo | null {
    return this.poolOracleService.calculateTWAP(
      query.poolAddress,
      query.period,
    );
  }

  @Post('oracle/config')
  @ApiOperation({
    summary: '오라클 설정 업데이트',
    description: '풀 오라클 서비스의 설정을 업데이트합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '오라클 설정이 성공적으로 업데이트되었습니다.',
  })
  updateOracleConfig(@Body() updateConfigDto: UpdateOracleConfigDto): {
    message: string;
  } {
    this.poolOracleService.updateConfig(updateConfigDto);
    return { message: '오라클 설정이 업데이트되었습니다' };
  }

  // ========================================
  // MEV 기회 API
  // ========================================

  @Get('mev/opportunities')
  @ApiOperation({
    summary: 'MEV 기회 조회',
    description: '현재 탐지된 MEV 기회들을 조회합니다.',
  })
  @ApiQuery({
    name: 'poolAddress',
    description: '풀 주소 (특정 풀만 조회)',
    example: '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8',
    required: false,
  })
  @ApiQuery({
    name: 'strategy',
    description: 'MEV 전략 타입',
    example: 'arbitrage',
    required: false,
  })
  @ApiQuery({
    name: 'minProfit',
    description: '최소 예상 수익률 (%)',
    example: 1.0,
    required: false,
  })
  @ApiQuery({
    name: 'maxRisk',
    description: '최대 위험도',
    example: 3,
    required: false,
  })
  @ApiQuery({
    name: 'executableOnly',
    description: '실행 가능한 기회만 조회',
    example: true,
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'MEV 기회가 성공적으로 조회되었습니다.',
  })
  getMEVOpportunities(
    @Query() query: GetMEVOpportunitiesQueryDto,
  ): MEVOpportunity[] {
    let opportunities = this.poolOracleService.getActiveOpportunities();

    // 필터링
    if (query.poolAddress) {
      opportunities = opportunities.filter(
        (opp) => opp.poolAddress === query.poolAddress,
      );
    }

    if (query.strategy) {
      opportunities = opportunities.filter(
        (opp) => opp.strategy === query.strategy,
      );
    }

    if (query.minProfit !== undefined) {
      opportunities = opportunities.filter(
        (opp) => opp.expectedProfit >= (query.minProfit || 0),
      );
    }

    if (query.maxRisk !== undefined) {
      opportunities = opportunities.filter(
        (opp) => opp.riskLevel <= (query.maxRisk || 5),
      );
    }

    if (query.executableOnly) {
      opportunities = opportunities.filter((opp) => opp.isExecutable);
    }

    return opportunities;
  }

  @Get('mev/opportunities/:opportunityId')
  @ApiOperation({
    summary: 'MEV 기회 상세 조회',
    description: '특정 MEV 기회의 상세 정보를 조회합니다.',
  })
  @ApiParam({
    name: 'opportunityId',
    description: 'MEV 기회 ID',
    example: 'mev_0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8_1759550728',
  })
  @ApiResponse({
    status: 200,
    description: 'MEV 기회 정보가 성공적으로 조회되었습니다.',
  })
  @ApiResponse({
    status: 404,
    description: 'MEV 기회를 찾을 수 없습니다.',
  })
  getMEVOpportunity(
    @Param('opportunityId') opportunityId: string,
  ): MEVOpportunity | null {
    const opportunities = this.poolOracleService.getActiveOpportunities();
    return (
      opportunities.find((opp) => opp.opportunityId === opportunityId) || null
    );
  }

  // ========================================
  // 시스템 관리 API
  // ========================================

  @Post('system/start')
  @ApiOperation({
    summary: '풀 시스템 시작',
    description: '풀 서비스와 오라클을 시작합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '풀 시스템이 성공적으로 시작되었습니다.',
  })
  startPoolSystem(): { message: string; status: string } {
    // 풀 오라클은 이미 자동으로 시작됨
    return {
      message: '풀 시스템이 시작되었습니다',
      status: 'running',
    };
  }

  @Post('system/stop')
  @ApiOperation({
    summary: '풀 시스템 중지',
    description: '풀 서비스와 오라클을 중지합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '풀 시스템이 성공적으로 중지되었습니다.',
  })
  stopPoolSystem(): { message: string; status: string } {
    this.poolOracleService.stop();
    return {
      message: '풀 시스템이 중지되었습니다',
      status: 'stopped',
    };
  }

  @Get('system/health')
  @ApiOperation({
    summary: '시스템 상태 확인',
    description: '풀 시스템의 전체 상태를 확인합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '시스템 상태가 성공적으로 조회되었습니다.',
  })
  getSystemHealth(): {
    pools: {
      total: number;
      active: number;
    };
    oracle: OracleStatus;
    lastUpdate: Date;
  } {
    const allPools = this.poolService.getAllPools();
    const activePools = allPools.filter((pool) => pool.isActive);
    const oracleStatus = this.poolOracleService.getOracleStatus();

    return {
      pools: {
        total: allPools.length,
        active: activePools.length,
      },
      oracle: oracleStatus,
      lastUpdate: new Date(),
    };
  }
}
