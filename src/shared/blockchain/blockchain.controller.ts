import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { BlockService } from './block.service';
import {
  EstimateGasQueryDto,
  GetBlocksQueryDto,
  GetTransactionsQueryDto,
  SubmitTransactionDto,
} from './dtos/blockchain.dto';
import { GasService } from './gas.service';
import { TransactionGeneratorService } from './transaction-generator.service';
import { TransactionPoolService } from './transaction-pool.service';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from './types/transaction.interface';

/**
 * BlockchainController
 *
 * 블록체인 시뮬레이션 관련 API를 제공합니다.
 * 트랜잭션 제출, 블록 생성, 상태 조회 등의 기능을 포함합니다.
 */
@ApiTags('Blockchain')
@Controller('blockchain')
export class BlockchainController {
  constructor(
    private readonly blockService: BlockService,
    private readonly transactionPoolService: TransactionPoolService,
    private readonly gasService: GasService,
    private readonly transactionGeneratorService: TransactionGeneratorService,
  ) {}

  // ========================================
  // 블록체인 상태 조회
  // ========================================

  @Get('status')
  @ApiOperation({
    summary: '블록체인 상태 조회',
    description: '전체 블록체인의 통계 및 상태 정보를 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '블록체인 상태 정보',
  })
  getBlockchainStatus() {
    return this.blockService.getBlockchainStatus();
  }

  @Get('blocks')
  @ApiOperation({
    summary: '블록 목록 조회',
    description: '생성된 블록들의 목록을 조회합니다.',
  })
  @ApiQuery({ name: 'limit', required: false, description: '조회할 블록 개수' })
  @ApiQuery({
    name: 'offset',
    required: false,
    description: '건너뛸 블록 개수',
  })
  @ApiResponse({
    status: 200,
    description: '블록 목록',
  })
  getBlocks(@Query() query: GetBlocksQueryDto) {
    const limit = query.limit || 10;
    const offset = query.offset || 0;

    const allBlocks = this.blockService.getBlockchain();
    const blocks = allBlocks.slice(offset, offset + limit);

    return {
      blocks,
      total: allBlocks.length,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
    };
  }

  @Get('blocks/latest')
  @ApiOperation({
    summary: '최신 블록 조회',
    description: '가장 최근에 생성된 블록을 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '최신 블록',
  })
  @ApiResponse({
    status: 404,
    description: '블록이 없습니다',
  })
  getLatestBlock() {
    const block = this.blockService.getLatestBlock();
    if (!block) {
      return { message: '아직 생성된 블록이 없습니다' };
    }
    return block;
  }

  @Get('blocks/:blockNumber')
  @ApiOperation({
    summary: '특정 블록 조회',
    description: '블록 번호로 특정 블록을 조회합니다.',
  })
  @ApiParam({
    name: 'blockNumber',
    description: '블록 번호',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: '블록 정보',
  })
  @ApiResponse({
    status: 404,
    description: '블록을 찾을 수 없습니다',
  })
  getBlockByNumber(@Param('blockNumber') blockNumber: string) {
    const block = this.blockService.getBlockByNumber(Number(blockNumber));
    if (!block) {
      return { message: `블록 #${blockNumber}을 찾을 수 없습니다` };
    }
    return block;
  }

  // ========================================
  // 트랜잭션 풀 관리
  // ========================================

  @Get('tx-pool/status')
  @ApiOperation({
    summary: '트랜잭션 풀 상태 조회',
    description: '대기 중인 트랜잭션 풀의 상태를 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '트랜잭션 풀 상태',
  })
  getTransactionPoolStatus() {
    return this.transactionPoolService.getPoolStatus();
  }

  @Get('tx-pool/pending')
  @ApiOperation({
    summary: '대기 중인 트랜잭션 목록 조회',
    description:
      '트랜잭션 풀에서 대기 중인 트랜잭션들을 가스 가격 순으로 조회합니다.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: '조회할 트랜잭션 개수',
  })
  @ApiResponse({
    status: 200,
    description: '대기 중인 트랜잭션 목록',
  })
  getPendingTransactions(@Query() query: GetTransactionsQueryDto) {
    const limit = query.limit || 20;
    const allTransactions =
      this.transactionPoolService.getPendingTransactions();
    const transactions = allTransactions.slice(0, limit);

    return {
      transactions,
      total: allTransactions.length,
    };
  }

  @Get('tx-pool/transactions/:txId')
  @ApiOperation({
    summary: '특정 트랜잭션 조회',
    description: '트랜잭션 ID로 특정 트랜잭션을 조회합니다.',
  })
  @ApiParam({
    name: 'txId',
    description: '트랜잭션 ID',
    example: 'tx_001',
  })
  @ApiResponse({
    status: 200,
    description: '트랜잭션 정보',
  })
  @ApiResponse({
    status: 404,
    description: '트랜잭션을 찾을 수 없습니다',
  })
  getTransactionById(@Param('txId') txId: string) {
    const transaction = this.transactionPoolService.getTransactionById(txId);
    if (!transaction) {
      return { message: `트랜잭션 ${txId}을 찾을 수 없습니다` };
    }
    return transaction;
  }

  @Delete('tx-pool/clear')
  @ApiOperation({
    summary: '트랜잭션 풀 초기화',
    description: '대기 중인 모든 트랜잭션을 제거합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '트랜잭션 풀 초기화 완료',
  })
  clearTransactionPool() {
    const status = this.transactionPoolService.getPoolStatus();
    const clearedCount = status.pendingCount;

    this.transactionPoolService.clearPool();

    return {
      message: '트랜잭션 풀이 초기화되었습니다',
      clearedCount,
    };
  }

  // ========================================
  // 블록 생성 및 제어
  // ========================================

  @Post('produce-block')
  @ApiOperation({
    summary: '블록 생성 및 실행',
    description:
      '트랜잭션 풀에서 가스 가격이 높은 순으로 트랜잭션을 선택하여 블록을 생성하고 실행합니다.',
  })
  @ApiResponse({
    status: 201,
    description: '블록 생성 및 실행 완료',
  })
  async produceBlock() {
    const block = this.blockService.createBlock();
    const result = await this.blockService.executeBlock(block);

    return {
      message: `블록 #${block.blockNumber}이 생성되고 실행되었습니다`,
      block,
      result,
    };
  }

  @Post('auto-production/start')
  @ApiOperation({
    summary: '자동 블록 생성 시작',
    description:
      '12초 간격으로 자동으로 블록을 생성하고 실행합니다. (이더리움과 동일한 블록 타임)',
  })
  @ApiResponse({
    status: 200,
    description: '자동 블록 생성 시작',
  })
  startAutoProduction() {
    this.blockService.startAutoProduction();

    return {
      message: '자동 블록 생성이 시작되었습니다',
      interval: 12000,
      isActive: true,
    };
  }

  @Post('auto-production/stop')
  @ApiOperation({
    summary: '자동 블록 생성 중지',
    description: '자동 블록 생성을 중지합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '자동 블록 생성 중지',
  })
  stopAutoProduction() {
    this.blockService.stopAutoProduction();

    return {
      message: '자동 블록 생성이 중지되었습니다',
      isActive: false,
    };
  }

  @Get('auto-production/status')
  @ApiOperation({
    summary: '자동 블록 생성 상태 조회',
    description: '자동 블록 생성이 활성화되어 있는지 확인합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '자동 블록 생성 상태',
  })
  getAutoProductionStatus() {
    const isActive = this.blockService.isAutoProduction();

    return {
      isActive,
      interval: 12000,
      message: isActive
        ? '자동 블록 생성이 실행 중입니다'
        : '자동 블록 생성이 중지되어 있습니다',
    };
  }

  // ========================================
  // 트랜잭션 제출
  // ========================================

  @Post('submit-transaction')
  @ApiOperation({
    summary: '트랜잭션 제출',
    description:
      '트랜잭션을 생성하여 트랜잭션 풀에 제출합니다. 가스 가격이 높을수록 우선순위가 높아집니다.',
  })
  @ApiResponse({
    status: 201,
    description: '트랜잭션 제출 완료',
  })
  @ApiResponse({
    status: 400,
    description: '잘못된 요청',
  })
  submitTransaction(@Body() dto: SubmitTransactionDto) {
    // 논스 생성 (간단한 시뮬레이션)
    const nonce = Date.now() % 1000000;

    // 가스 가격 기본값 설정
    const gasPrice = dto.gasPrice || this.gasService.getCurrentGasPrice();
    const gasLimit = dto.gasLimit || this.gasService.estimateGas(dto.type);

    // 트랜잭션 생성
    const transaction: Transaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: dto.type,
      from: dto.from,
      to: dto.to,
      data: dto.data,
      gasPrice,
      gasLimit,
      nonce,
      status: TransactionStatus.PENDING,
      timestamp: new Date(),
    };

    // 트랜잭션 풀에 제출
    this.transactionPoolService.submitTransaction(transaction);

    // 풀 상태 조회
    const poolStatus = this.transactionPoolService.getPoolStatus();
    const pendingTransactions =
      this.transactionPoolService.getPendingTransactions();
    const position =
      pendingTransactions.findIndex((tx) => tx.id === transaction.id) + 1;

    return {
      message: '트랜잭션이 풀에 제출되었습니다',
      transaction,
      poolStatus: {
        pendingCount: poolStatus.pendingCount,
        position,
        estimatedBlocksUntilExecution: Math.ceil(position / 10),
      },
    };
  }

  // ========================================
  // 가스 정보
  // ========================================

  @Get('gas/current-price')
  @ApiOperation({
    summary: '현재 가스 가격 조회',
    description: '현재 네트워크의 기본 가스 가격을 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '가스 가격 정보',
  })
  getCurrentGasPrice() {
    const currentPrice = this.gasService.getCurrentGasPrice();

    return {
      baseGasPrice: currentPrice,
      currentNetworkPrice: currentPrice,
      suggested: {
        low: this.gasService.calculateGasPrice('low'),
        medium: this.gasService.calculateGasPrice('medium'),
        high: this.gasService.calculateGasPrice('high'),
        urgent: this.gasService.calculateGasPrice('urgent'),
      },
    };
  }

  @Get('gas/estimate')
  @ApiOperation({
    summary: '가스 사용량 추정',
    description: '트랜잭션 타입별 예상 가스 사용량을 조회합니다.',
  })
  @ApiQuery({
    name: 'type',
    enum: TransactionType,
    description: '트랜잭션 타입',
  })
  @ApiResponse({
    status: 200,
    description: '가스 추정 정보',
  })
  estimateGas(@Query() query: EstimateGasQueryDto) {
    const estimatedGas = this.gasService.estimateGas(query.type);
    const currentPrice = this.gasService.getCurrentGasPrice();
    const totalCost = this.gasService.calculateTotalCost(
      estimatedGas,
      currentPrice,
    );

    return {
      type: query.type,
      estimatedGas,
      gasPrice: currentPrice,
      estimatedCost: totalCost,
    };
  }

  // ========================================
  // 트랜잭션 생성기
  // ========================================

  @Post('tx-generator/start')
  @ApiOperation({
    summary: '트랜잭션 자동 생성 시작',
    description:
      '3~10초 간격으로 랜덤 트랜잭션을 자동 생성하여 풀에 제출합니다. MEV 시뮬레이션을 위한 사용자 거래를 시뮬레이션합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '트랜잭션 자동 생성 시작',
  })
  startTransactionGenerator() {
    this.transactionGeneratorService.startGenerating();

    return {
      message: '트랜잭션 자동 생성이 시작되었습니다',
      interval: '3~10초 (랜덤)',
      isActive: true,
    };
  }

  @Post('tx-generator/stop')
  @ApiOperation({
    summary: '트랜잭션 자동 생성 중지',
    description: '트랜잭션 자동 생성을 중지합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '트랜잭션 자동 생성 중지',
  })
  stopTransactionGenerator() {
    this.transactionGeneratorService.stopGenerating();

    return {
      message: '트랜잭션 자동 생성이 중지되었습니다',
      isActive: false,
    };
  }

  @Get('tx-generator/status')
  @ApiOperation({
    summary: '트랜잭션 생성기 상태 조회',
    description: '트랜잭션 자동 생성기의 상태와 통계를 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '생성기 상태 및 통계',
  })
  getTransactionGeneratorStatus() {
    return this.transactionGeneratorService.getStats();
  }

  @Post('tx-generator/generate-one')
  @ApiOperation({
    summary: '랜덤 트랜잭션 1개 생성',
    description: '랜덤 트랜잭션을 즉시 1개 생성하여 풀에 제출합니다.',
  })
  @ApiResponse({
    status: 201,
    description: '트랜잭션 생성 완료',
  })
  generateOneTransaction() {
    const transaction =
      this.transactionGeneratorService.generateRandomTransaction();

    return {
      message: '트랜잭션이 생성되었습니다',
      transaction,
    };
  }

  // ========================================
  // 통계
  // ========================================

  @Get('stats')
  @ApiOperation({
    summary: '블록체인 전체 통계',
    description: '블록체인, 트랜잭션 풀, 가스 시스템의 전체 통계를 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '전체 통계 정보',
  })
  getStats() {
    const blockchainStatus = this.blockService.getBlockchainStatus();
    const poolStatus = this.transactionPoolService.getPoolStatus();
    const currentGasPrice = this.gasService.getCurrentGasPrice();
    const generatorStats = this.transactionGeneratorService.getStats();

    return {
      blockchain: blockchainStatus,
      txPool: poolStatus,
      gas: {
        currentPrice: currentGasPrice,
        averagePrice: poolStatus.averageGasPrice,
      },
      autoProduction: {
        isActive: this.blockService.isAutoProduction(),
        interval: 12000,
      },
      txGenerator: generatorStats,
    };
  }
}
