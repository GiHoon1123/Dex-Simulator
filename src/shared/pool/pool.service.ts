import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  LiquidityAddedEvent,
  LiquidityRemovedEvent,
  POOL_EVENT_TYPES,
  PoolCreatedEvent,
  PoolStatsUpdatedEvent,
  PoolTransactionCreatedEvent,
  PoolUpdatedEvent,
  SwapExecutedEvent,
} from '../events/pool.events';
import {
  CreatePoolParams,
  PoolListQuery,
  PoolSearchResult,
  PoolState,
  PoolStats,
} from './types/pool.interface';
import {
  AddLiquidityParams,
  AddLiquidityResult,
  PriceImpact,
  RemoveLiquidityParams,
  RemoveLiquidityResult,
  SwapParams,
  SwapResult,
  SwapSimulation,
} from './types/swap.interface';

/**
 * 풀 관리 서비스
 *
 * 풀 생성, 상태 관리, 스왑 실행, 유동성 관리 등의
 * 핵심 AMM 기능을 제공합니다.
 */
@Injectable()
export class PoolService {
  private readonly logger = new Logger(PoolService.name);

  /** 풀 상태 저장소 */
  private pools: Map<string, PoolState> = new Map();

  /** 풀 통계 저장소 */
  private poolStats: Map<string, PoolStats> = new Map();

  /** 스왑 카운터 */
  private swapCounter = 0;

  /** 유동성 카운터 */
  private liquidityCounter = 0;

  constructor(private readonly eventEmitter: EventEmitter2) {
    this.initializeDefaultPools();
  }

  /**
   * 기본 풀 초기화
   */
  private initializeDefaultPools(): void {
    const defaultPools: CreatePoolParams[] = [
      {
        address: '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8',
        pair: 'ETH/USDC',
        tokenA: 'ETH',
        tokenB: 'USDC',
        initialReserveA: 1000, // 1000 ETH
        initialReserveB: 2000000, // 2,000,000 USDC
        feeRate: 0.003, // 0.3%
      },
      {
        address: '0x4585FE77225b41b697C938B018E2Ac67Ac5a20c0',
        pair: 'BTC/ETH',
        tokenA: 'BTC',
        tokenB: 'ETH',
        initialReserveA: 50, // 50 BTC
        initialReserveB: 1000, // 1000 ETH
        feeRate: 0.003, // 0.3%
      },
      {
        address: '0x5777d92f208679DB4b9778590Fa3CAB3aC9e2168',
        pair: 'DAI/USDC',
        tokenA: 'DAI',
        tokenB: 'USDC',
        initialReserveA: 1000000, // 1,000,000 DAI
        initialReserveB: 1000000, // 1,000,000 USDC
        feeRate: 0.0001, // 0.01%
      },
      {
        address: '0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640',
        pair: 'WETH/USDC',
        tokenA: 'WETH',
        tokenB: 'USDC',
        initialReserveA: 1000, // 1000 WETH
        initialReserveB: 2000000, // 2,000,000 USDC
        feeRate: 0.0005, // 0.05%
      },
    ];

    for (const poolParams of defaultPools) {
      this.createPool(poolParams);
    }
  }

  /**
   * 풀 생성
   */
  createPool(params: CreatePoolParams): PoolState {
    const now = new Date();

    const pool: PoolState = {
      address: params.address,
      pair: params.pair,
      tokenA: params.tokenA,
      tokenB: params.tokenB,
      reserveA: params.initialReserveA,
      reserveB: params.initialReserveB,
      k: params.initialReserveA * params.initialReserveB,
      feeRate: params.feeRate,
      createdAt: now,
      lastUpdated: now,
      totalVolume: 0,
      volume24h: 0,
      isActive: true,
    };

    this.pools.set(params.address, pool);
    this.initializePoolStats(pool);

    // 풀 생성 이벤트 발생
    this.emitPoolCreated(pool);

    this.logger.log(`풀 생성됨: ${params.address} (${params.pair})`);
    return pool;
  }

  /**
   * 풀 통계 초기화
   */
  private initializePoolStats(pool: PoolState): void {
    const stats: PoolStats = {
      address: pool.address,
      pair: pool.pair,
      currentPrice: pool.reserveB / pool.reserveA,
      priceChange24h: 0,
      volume24h: 0,
      totalVolume: 0,
      totalLiquidity: this.calculateTotalLiquidity(pool),
      isActive: pool.isActive,
      lastUpdated: new Date(),
    };

    this.poolStats.set(pool.address, stats);
  }

  /**
   * 총 유동성 계산 (USD 기준)
   */
  private calculateTotalLiquidity(pool: PoolState): number {
    // 실제로는 토큰별 USD 가격을 가져와야 함
    const mockPrices: Record<string, number> = {
      ETH: 2000,
      BTC: 40000,
      USDC: 1,
      DAI: 1,
      WETH: 2000,
    };

    const priceA = mockPrices[pool.tokenA] || 1;
    const priceB = mockPrices[pool.tokenB] || 1;

    return pool.reserveA * priceA + pool.reserveB * priceB;
  }

  /**
   * 풀 조회
   */
  getPool(poolAddress: string): PoolState | null {
    return this.pools.get(poolAddress) || null;
  }

  /**
   * 모든 풀 조회
   */
  getAllPools(): PoolState[] {
    return Array.from(this.pools.values());
  }

  /**
   * 풀 검색
   */
  searchPools(query: PoolListQuery): PoolSearchResult {
    let pools = Array.from(this.pools.values());

    // 활성 풀만 필터링
    if (query.activeOnly) {
      pools = pools.filter((pool) => pool.isActive);
    }

    // 특정 토큰 포함 필터링
    if (query.token) {
      pools = pools.filter(
        (pool) => pool.tokenA === query.token || pool.tokenB === query.token,
      );
    }

    // 정렬
    if (query.sortBy) {
      pools.sort((a, b) => {
        let aValue: number, bValue: number;

        switch (query.sortBy) {
          case 'volume':
            aValue = a.totalVolume;
            bValue = b.totalVolume;
            break;
          case 'liquidity':
            aValue = this.calculateTotalLiquidity(a);
            bValue = this.calculateTotalLiquidity(b);
            break;
          case 'price':
            aValue = a.reserveB / a.reserveA;
            bValue = b.reserveB / b.reserveA;
            break;
          case 'created':
            aValue = a.createdAt.getTime();
            bValue = b.createdAt.getTime();
            break;
          default:
            return 0;
        }

        if (query.sortOrder === 'desc') {
          return bValue - aValue;
        } else {
          return aValue - bValue;
        }
      });
    }

    // 페이지네이션
    const limit = query.limit || 10;
    const offset = query.offset || 0;
    const total = pools.length;
    const paginatedPools = pools.slice(offset, offset + limit);

    return {
      pools: paginatedPools,
      total,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
      hasNext: offset + limit < total,
    };
  }

  /**
   * 스왑 시뮬레이션
   */
  simulateSwap(params: SwapParams): SwapSimulation {
    const pool = this.getPool(params.poolAddress);
    if (!pool) {
      return {
        expectedAmountOut: 0,
        maxSlippage: 0,
        estimatedFee: 0,
        priceImpact: 0,
        isExecutable: false,
        warnings: [],
        errors: ['풀을 찾을 수 없습니다'],
      };
    }

    // 입력 토큰이 토큰 A인지 B인지 확인
    const isTokenA = params.tokenIn === pool.tokenA;
    const reserveIn = isTokenA ? pool.reserveA : pool.reserveB;
    const reserveOut = isTokenA ? pool.reserveB : pool.reserveA;

    // 수수료 계산
    const fee = params.amountIn * pool.feeRate;
    const amountInAfterFee = params.amountIn - fee;

    // AMM 공식으로 출력 수량 계산 (x * y = k)
    const amountOut =
      (amountInAfterFee * reserveOut) / (reserveIn + amountInAfterFee);

    // 슬리피지 계산
    const slippage = ((params.amountOutMin - amountOut) / amountOut) * 100;

    // 가격 임팩트 계산
    const priceImpact = this.calculatePriceImpact(
      pool,
      params.amountIn,
      isTokenA,
    );

    // 실행 가능 여부 확인
    const isExecutable =
      amountOut >= params.amountOutMin &&
      new Date().getTime() < params.deadline * 1000;

    // 경고 및 에러 메시지
    const warnings: string[] = [];
    const errors: string[] = [];

    if (priceImpact.impact > 5) {
      warnings.push('높은 가격 임팩트가 예상됩니다');
    }

    if (slippage > 5) {
      warnings.push('높은 슬리피지가 예상됩니다');
    }

    if (!isExecutable) {
      if (amountOut < params.amountOutMin) {
        errors.push('최소 출력 수량을 충족하지 않습니다');
      }
      if (new Date().getTime() >= params.deadline * 1000) {
        errors.push('거래 데드라인이 만료되었습니다');
      }
    }

    return {
      expectedAmountOut: amountOut,
      maxSlippage: Math.abs(slippage),
      estimatedFee: fee,
      priceImpact: priceImpact.impact,
      isExecutable,
      warnings,
      errors,
    };
  }

  /**
   * 스왑 실행
   */
  executeSwap(params: SwapParams): SwapResult {
    const pool = this.getPool(params.poolAddress);
    if (!pool) {
      return {
        swapId: '',
        poolAddress: params.poolAddress,
        tokenIn: params.tokenIn,
        tokenOut: params.tokenOut,
        amountIn: 0,
        amountOut: 0,
        expectedAmountOut: 0,
        slippage: 0,
        fee: 0,
        feeToken: params.tokenIn,
        gasUsed: 0,
        gasCost: 0,
        timestamp: new Date(),
        success: false,
        error: '풀을 찾을 수 없습니다',
      };
    }

    // 시뮬레이션 실행
    const simulation = this.simulateSwap(params);
    if (!simulation.isExecutable) {
      return {
        swapId: '',
        poolAddress: params.poolAddress,
        tokenIn: params.tokenIn,
        tokenOut: params.tokenOut,
        amountIn: 0,
        amountOut: 0,
        expectedAmountOut: 0,
        slippage: 0,
        fee: 0,
        feeToken: params.tokenIn,
        gasUsed: 0,
        gasCost: 0,
        timestamp: new Date(),
        success: false,
        error: simulation.errors.join(', '),
      };
    }

    // 스왑 실행
    const swapId = `swap_${++this.swapCounter}_${Date.now()}`;
    const isTokenA = params.tokenIn === pool.tokenA;

    // 풀 상태 업데이트
    const previousState = { ...pool };

    if (isTokenA) {
      pool.reserveA += params.amountIn;
      pool.reserveB -= simulation.expectedAmountOut;
    } else {
      pool.reserveB += params.amountIn;
      pool.reserveA -= simulation.expectedAmountOut;
    }

    // K 값 업데이트
    pool.k = pool.reserveA * pool.reserveB;
    pool.lastUpdated = new Date();
    pool.totalVolume += params.amountIn;
    pool.volume24h += params.amountIn;

    this.pools.set(params.poolAddress, pool);

    // 스왑 결과 생성
    const swapResult: SwapResult = {
      swapId,
      poolAddress: params.poolAddress,
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      amountIn: params.amountIn,
      amountOut: simulation.expectedAmountOut,
      expectedAmountOut: simulation.expectedAmountOut,
      slippage: simulation.maxSlippage,
      fee: simulation.estimatedFee,
      feeToken: params.tokenIn,
      gasUsed: params.gasLimit,
      gasCost: params.gasLimit * params.gasPrice,
      timestamp: new Date(),
      success: true,
    };

    // 트랜잭션 생성 및 제출
    this.createAndSubmitSwapTransaction(params, swapResult, pool);

    // 이벤트 발생
    this.emitSwapExecuted(swapResult, pool);
    this.emitPoolUpdated(previousState, pool, 'swap');

    this.logger.log(
      `스왑 실행됨: ${swapId} - ${params.amountIn} ${params.tokenIn} → ${simulation.expectedAmountOut} ${params.tokenOut}`,
    );

    return swapResult;
  }

  /**
   * 유동성 추가
   */
  addLiquidity(params: AddLiquidityParams): AddLiquidityResult {
    const pool = this.getPool(params.poolAddress);
    if (!pool) {
      return {
        liquidityAmount: 0,
        actualAmountA: 0,
        actualAmountB: 0,
        timestamp: new Date(),
        success: false,
        error: '풀을 찾을 수 없습니다',
      };
    }

    // 비율 확인 및 조정
    const currentRatio = pool.reserveA / pool.reserveB;
    const inputRatio = params.amountA / params.amountB;

    let actualAmountA = params.amountA;
    let actualAmountB = params.amountB;

    if (inputRatio > currentRatio) {
      // 토큰 A가 많음, 토큰 B 기준으로 조정
      actualAmountA = params.amountB * currentRatio;
    } else if (inputRatio < currentRatio) {
      // 토큰 B가 많음, 토큰 A 기준으로 조정
      actualAmountB = params.amountA / currentRatio;
    }

    // 최소 수량 확인
    if (
      actualAmountA < params.amountAMin ||
      actualAmountB < params.amountBMin
    ) {
      return {
        liquidityAmount: 0,
        actualAmountA: 0,
        actualAmountB: 0,
        timestamp: new Date(),
        success: false,
        error: '최소 유동성 수량을 충족하지 않습니다',
      };
    }

    // 유동성 토큰 수량 계산
    const liquidityAmount = Math.sqrt(actualAmountA * actualAmountB);

    // 풀 상태 업데이트
    const previousState = { ...pool };
    pool.reserveA += actualAmountA;
    pool.reserveB += actualAmountB;
    pool.k = pool.reserveA * pool.reserveB;
    pool.lastUpdated = new Date();

    this.pools.set(params.poolAddress, pool);

    const result: AddLiquidityResult = {
      liquidityAmount,
      actualAmountA,
      actualAmountB,
      timestamp: new Date(),
      success: true,
    };

    // 이벤트 발생
    this.emitLiquidityAdded(result, pool);
    this.emitPoolUpdated(previousState, pool, 'liquidity_add');

    this.logger.log(
      `유동성 추가됨: ${params.poolAddress} - ${actualAmountA} ${pool.tokenA} + ${actualAmountB} ${pool.tokenB}`,
    );

    return result;
  }

  /**
   * 유동성 제거
   */
  removeLiquidity(params: RemoveLiquidityParams): RemoveLiquidityResult {
    const pool = this.getPool(params.poolAddress);
    if (!pool) {
      return {
        amountA: 0,
        amountB: 0,
        timestamp: new Date(),
        success: false,
        error: '풀을 찾을 수 없습니다',
      };
    }

    // 유동성 비율 계산
    const totalLiquidity = Math.sqrt(pool.reserveA * pool.reserveB);
    const liquidityRatio = params.liquidityAmount / totalLiquidity;

    const amountA = pool.reserveA * liquidityRatio;
    const amountB = pool.reserveB * liquidityRatio;

    // 최소 수량 확인
    if (amountA < params.amountAMin || amountB < params.amountBMin) {
      return {
        amountA: 0,
        amountB: 0,
        timestamp: new Date(),
        success: false,
        error: '최소 출력 수량을 충족하지 않습니다',
      };
    }

    // 풀 상태 업데이트
    const previousState = { ...pool };
    pool.reserveA -= amountA;
    pool.reserveB -= amountB;
    pool.k = pool.reserveA * pool.reserveB;
    pool.lastUpdated = new Date();

    this.pools.set(params.poolAddress, pool);

    const result: RemoveLiquidityResult = {
      amountA,
      amountB,
      timestamp: new Date(),
      success: true,
    };

    // 이벤트 발생
    this.emitLiquidityRemoved(result, pool);
    this.emitPoolUpdated(previousState, pool, 'liquidity_remove');

    this.logger.log(
      `유동성 제거됨: ${params.poolAddress} - ${amountA} ${pool.tokenA} + ${amountB} ${pool.tokenB}`,
    );

    return result;
  }

  /**
   * 스왑 트랜잭션 구조체 생성 및 이벤트 전송
   * 실제 지갑처럼 트랜잭션 구조체만 생성하고
   * Blockchain 모듈로 이벤트를 통해 전송
   */
  private createAndSubmitSwapTransaction(
    params: SwapParams,
    swapResult: SwapResult,
    pool: PoolState,
  ): void {
    // Uniswap V3 swap 함수 파라미터 생성
    const swapParams = {
      recipient: params.recipient,
      zeroForOne: params.tokenIn === pool.tokenA,
      amountSpecified: params.amountIn.toString(),
      sqrtPriceLimitX96: '0',
      data: '0x',
    };

    // 트랜잭션 구조체 생성 (실제 지갑처럼)
    const transactionStructure = {
      id: swapResult.swapId,
      type: 'SWAP' as const,
      from: params.recipient,
      to: params.poolAddress,
      value: '0',
      swapParams,
      gasPrice: params.gasPrice,
      gasLimit: params.gasLimit,
      nonce: Math.floor(Math.random() * 1000000), // 임시 nonce 생성
    };

    // 이벤트 생성 및 전송
    const event: PoolTransactionCreatedEvent = {
      eventId: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'pool.transaction.created',
      transaction: transactionStructure,
      poolAddress: params.poolAddress,
      timestamp: new Date(),
    };

    // Blockchain 모듈로 이벤트 전송
    this.eventEmitter.emit(POOL_EVENT_TYPES.POOL_TRANSACTION_CREATED, event);

    this.logger.log(
      `스왑 트랜잭션 구조체 생성 및 이벤트 전송: ${transactionStructure.id}`,
    );
  }

  /**
   * 가격 임팩트 계산
   */
  private calculatePriceImpact(
    pool: PoolState,
    amountIn: number,
    isTokenA: boolean,
  ): PriceImpact {
    const reserveIn = isTokenA ? pool.reserveA : pool.reserveB;
    const reserveOut = isTokenA ? pool.reserveB : pool.reserveA;

    const currentPrice = reserveOut / reserveIn;

    // 수수료 제외한 실제 입력량
    const amountInAfterFee = amountIn * (1 - pool.feeRate);
    const amountOut =
      (amountInAfterFee * reserveOut) / (reserveIn + amountInAfterFee);

    const newReserveIn = reserveIn + amountInAfterFee;
    const newReserveOut = reserveOut - amountOut;
    const newPrice = newReserveOut / newReserveIn;

    const impact = Math.abs((newPrice - currentPrice) / currentPrice) * 100;

    let level: 'low' | 'medium' | 'high' | 'extreme';
    if (impact < 0.1) level = 'low';
    else if (impact < 1) level = 'medium';
    else if (impact < 5) level = 'high';
    else level = 'extreme';

    return {
      impact,
      amountIn,
      amountOut,
      poolPrice: currentPrice,
      expectedPrice: newPrice,
      level,
    };
  }

  /**
   * 풀 통계 조회
   */
  getPoolStats(poolAddress: string): PoolStats | null {
    return this.poolStats.get(poolAddress) || null;
  }

  /**
   * 모든 풀 통계 조회
   */
  getAllPoolStats(): PoolStats[] {
    return Array.from(this.poolStats.values());
  }

  /**
   * 풀 통계 업데이트
   */
  updatePoolStats(poolAddress: string): void {
    const pool = this.getPool(poolAddress);
    if (!pool) return;

    const stats = this.poolStats.get(poolAddress);
    if (!stats) return;

    const newStats: PoolStats = {
      ...stats,
      currentPrice: pool.reserveB / pool.reserveA,
      volume24h: pool.volume24h,
      totalVolume: pool.totalVolume,
      totalLiquidity: this.calculateTotalLiquidity(pool),
      isActive: pool.isActive,
      lastUpdated: new Date(),
    };

    this.poolStats.set(poolAddress, newStats);

    // 통계 업데이트 이벤트 발생
    this.emitPoolStatsUpdated(poolAddress, newStats);
  }

  /**
   * 풀 생성 이벤트 발생
   */
  private emitPoolCreated(pool: PoolState): void {
    const event: PoolCreatedEvent = {
      eventId: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: POOL_EVENT_TYPES.POOL_CREATED as any,
      pool,
      timestamp: new Date(),
      metadata: {
        creator: 'system',
        initialLiquidity: this.calculateTotalLiquidity(pool),
        gasUsed: 0,
      },
    };

    this.eventEmitter.emit(POOL_EVENT_TYPES.POOL_CREATED, event);
  }

  /**
   * 풀 업데이트 이벤트 발생
   */
  private emitPoolUpdated(
    previousState: PoolState,
    currentState: PoolState,
    reason: string,
  ): void {
    const event: PoolUpdatedEvent = {
      eventId: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: POOL_EVENT_TYPES.POOL_UPDATED as any,
      poolAddress: currentState.address,
      previousState,
      currentState,
      changes: {
        reserveA:
          previousState.reserveA !== currentState.reserveA
            ? { from: previousState.reserveA, to: currentState.reserveA }
            : undefined,
        reserveB:
          previousState.reserveB !== currentState.reserveB
            ? { from: previousState.reserveB, to: currentState.reserveB }
            : undefined,
        totalVolume:
          previousState.totalVolume !== currentState.totalVolume
            ? { from: previousState.totalVolume, to: currentState.totalVolume }
            : undefined,
        volume24h:
          previousState.volume24h !== currentState.volume24h
            ? { from: previousState.volume24h, to: currentState.volume24h }
            : undefined,
      },
      timestamp: new Date(),
      reason: reason as any,
    };

    this.eventEmitter.emit(POOL_EVENT_TYPES.POOL_UPDATED, event);
  }

  /**
   * 스왑 실행 이벤트 발생
   */
  private emitSwapExecuted(swapResult: SwapResult, pool: PoolState): void {
    const event: SwapExecutedEvent = {
      eventId: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: POOL_EVENT_TYPES.SWAP_EXECUTED as any,
      swapResult,
      poolState: pool,
      timestamp: new Date(),
      isMEVOpportunity: false, // MEV 봇에서 판단
    };

    this.eventEmitter.emit(POOL_EVENT_TYPES.SWAP_EXECUTED, event);
  }

  /**
   * 유동성 추가 이벤트 발생
   */
  private emitLiquidityAdded(
    result: AddLiquidityResult,
    pool: PoolState,
  ): void {
    const event: LiquidityAddedEvent = {
      eventId: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: POOL_EVENT_TYPES.LIQUIDITY_ADDED as any,
      addLiquidityResult: result,
      poolState: pool,
      timestamp: new Date(),
    };

    this.eventEmitter.emit(POOL_EVENT_TYPES.LIQUIDITY_ADDED, event);
  }

  /**
   * 유동성 제거 이벤트 발생
   */
  private emitLiquidityRemoved(
    result: RemoveLiquidityResult,
    pool: PoolState,
  ): void {
    const event: LiquidityRemovedEvent = {
      eventId: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: POOL_EVENT_TYPES.LIQUIDITY_REMOVED as any,
      removeLiquidityResult: result,
      poolState: pool,
      timestamp: new Date(),
    };

    this.eventEmitter.emit(POOL_EVENT_TYPES.LIQUIDITY_REMOVED, event);
  }

  /**
   * 풀 통계 업데이트 이벤트 발생
   */
  private emitPoolStatsUpdated(poolAddress: string, stats: PoolStats): void {
    const event: PoolStatsUpdatedEvent = {
      eventId: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: POOL_EVENT_TYPES.POOL_STATS_UPDATED as any,
      poolAddress,
      poolStats: stats,
      timestamp: new Date(),
      updateInterval: 300, // 5분
    };

    this.eventEmitter.emit(POOL_EVENT_TYPES.POOL_STATS_UPDATED, event);
  }
}
