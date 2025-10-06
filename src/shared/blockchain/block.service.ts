import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  BlockCreatedEvent,
  BlockCreatingEvent,
  BlockExecutedEvent,
  BlockExecutingEvent,
  TransactionExecutedEvent,
  TransactionFailedEvent,
  TransactionSelectedEvent,
} from '../events/blockchain.events';
import { GasService } from './gas.service';
import { TransactionPoolService } from './transaction-pool.service';
import {
  Block,
  BlockchainStatus,
  BlockResult,
  BlockStatus,
} from './types/block.interface';
import { Transaction, TransactionStatus } from './types/transaction.interface';

/**
 * BlockService
 *
 * 블록 생성 및 실행을 담당합니다.
 * 트랜잭션 풀에서 트랜잭션을 선택하여 블록을 만들고,
 * 블록 내 트랜잭션들을 순서대로 실행합니다.
 */
@Injectable()
export class BlockService {
  // 블록체인 상태
  private currentBlockNumber = 0;
  private blockchain: Block[] = [];

  // 블록 설정
  private readonly BLOCK_SIZE_LIMIT = 10; // 블록당 최대 10개 트랜잭션
  private readonly BLOCK_GAS_LIMIT = 30000000; // 30M gas (이더리움과 동일)

  // 블록 생성 모드
  private autoProduction = false;
  private autoProductionInterval: NodeJS.Timeout | null = null;
  private readonly AUTO_BLOCK_INTERVAL = 12000; // 12초 (이더리움과 동일)
  private readonly CHECK_INTERVAL = 1000; // 1초마다 체크
  private lastBlockTime = 0; // 마지막 블록 생성 시간

  constructor(
    private readonly transactionPoolService: TransactionPoolService,
    private readonly gasService: GasService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * 블록 생성
   *
   * 트랜잭션 풀에서 가스 가격이 높은 순으로 트랜잭션을 선택하여 블록을 만듭니다.
   *
   * @returns 생성된 블록
   */
  createBlock(): Block {
    const blockNumber = ++this.currentBlockNumber;

    // 블록 생성 시작 이벤트
    const creatingEvent: BlockCreatingEvent = {
      blockNumber,
      transactionCount:
        this.transactionPoolService.getPoolStatus().pendingCount,
      timestamp: new Date(),
    };
    this.eventEmitter.emit('block.creating', creatingEvent);

    // 트랜잭션 선택 (가스 가격 순, 가스 한도 체크)
    const transactions = this.transactionPoolService.selectTransactionsForBlock(
      this.BLOCK_GAS_LIMIT,
    );

    // 선택된 트랜잭션들에 대한 이벤트 발생
    transactions.forEach((tx, index) => {
      const selectedEvent: TransactionSelectedEvent = {
        transaction: tx,
        blockNumber,
        position: index,
        timestamp: new Date(),
      };
      this.eventEmitter.emit('transaction.selected', selectedEvent);
    });

    // 블록 생성
    const block: Block = {
      blockNumber,
      hash: this.calculateBlockHash(blockNumber, transactions),
      previousHash: this.getLatestBlockHash(),
      timestamp: new Date(),
      transactions,
      transactionCount: transactions.length,
      gasUsed: 0, // 실행 후 업데이트
      gasLimit: this.BLOCK_GAS_LIMIT,
      status: BlockStatus.PENDING,
      producer: 'simulator', // 시뮬레이션용 고정값
    };

    // 블록체인에 추가
    this.blockchain.push(block);

    // 블록 생성 완료 이벤트
    const createdEvent: BlockCreatedEvent = {
      block,
      timestamp: new Date(),
    };
    this.eventEmitter.emit('block.created', createdEvent);

    return block;
  }

  /**
   * 블록 실행
   *
   * 블록 내 모든 트랜잭션을 순서대로 실행합니다.
   * 각 트랜잭션 실행 후 이벤트를 발생시켜 상태 변화를 추적할 수 있게 합니다.
   *
   * @param block 실행할 블록
   * @returns 블록 실행 결과
   */
  async executeBlock(block: Block): Promise<BlockResult> {
    const startTime = Date.now();

    // 블록 실행 시작 이벤트
    const executingEvent: BlockExecutingEvent = {
      block,
      timestamp: new Date(),
    };
    this.eventEmitter.emit('block.executing', executingEvent);

    block.status = BlockStatus.EXECUTING;

    const executedTransactions: Transaction[] = [];
    const failedTransactions: Transaction[] = [];
    let totalGasUsed = 0;

    // 트랜잭션들을 순서대로 실행
    for (const tx of block.transactions) {
      try {
        const result = this.executeTransaction(tx, block.blockNumber);

        if (result.success) {
          executedTransactions.push(tx);
          totalGasUsed += result.gasUsed;

          // 트랜잭션 실행 완료 이벤트
          const executedEvent: TransactionExecutedEvent = {
            transaction: tx,
            blockNumber: block.blockNumber,
            gasUsed: result.gasUsed,
            success: true,
            result: result.output,
            timestamp: new Date(),
          };
          this.eventEmitter.emit('transaction.executed', executedEvent);
        } else {
          failedTransactions.push(tx);

          // 트랜잭션 실패 이벤트
          const failedEvent: TransactionFailedEvent = {
            transaction: tx,
            error: tx.error || 'Unknown error',
            timestamp: new Date(),
          };
          this.eventEmitter.emit('transaction.failed', failedEvent);
        }
      } catch (error) {
        tx.status = TransactionStatus.FAILED;
        tx.error = error.message;
        failedTransactions.push(tx);

        const failedEvent: TransactionFailedEvent = {
          transaction: tx,
          error: error.message,
          timestamp: new Date(),
        };
        this.eventEmitter.emit('transaction.failed', failedEvent);
      }
    }

    // 블록 상태 업데이트
    block.gasUsed = totalGasUsed;
    block.status = BlockStatus.COMPLETED;

    const executionTime = Date.now() - startTime;

    // 블록 실행 완료 이벤트
    const executedEvent: BlockExecutedEvent = {
      block,
      executedCount: executedTransactions.length,
      failedCount: failedTransactions.length,
      totalGasUsed,
      executionTime,
      timestamp: new Date(),
    };
    this.eventEmitter.emit('block.executed', executedEvent);

    return {
      block,
      executedTransactions,
      failedTransactions,
      totalGasUsed,
      totalFees: this.calculateTotalFees(executedTransactions),
      executionTime,
    };
  }

  /**
   * 개별 트랜잭션 실행
   *
   * 트랜잭션 타입에 따라 적절한 로직을 실행합니다.
   * 현재는 간단한 시뮬레이션으로, 실제 DEX 풀 업데이트는
   * 이벤트를 통해 LpService가 처리합니다.
   *
   * @param transaction 실행할 트랜잭션
   * @param blockNumber 현재 블록 번호
   * @returns 실행 결과
   */
  private executeTransaction(
    transaction: Transaction,
    blockNumber: number,
  ): any {
    transaction.status = TransactionStatus.EXECUTING;
    transaction.blockNumber = blockNumber;
    transaction.blockTimestamp = new Date();

    // 가스 사용량 계산
    const gasUsed = this.gasService.estimateGas(transaction.type);
    transaction.gasUsed = gasUsed;

    // 가스 한도 체크
    if (gasUsed > transaction.gasLimit) {
      transaction.status = TransactionStatus.FAILED;
      transaction.error = '가스 한도 초과';
      return {
        success: false,
        gasUsed,
        effectiveGasPrice: transaction.gasPrice,
      };
    }

    // 트랜잭션 실행 완료 처리 (실제 거래는 이미 풀에서 완료됨)
    transaction.status = TransactionStatus.COMPLETED;
    transaction.result = {
      success: true,
      gasUsed,
      effectiveGasPrice: transaction.gasPrice,
      output: {
        message: '트랜잭션이 블록에 포함되어 실행되었습니다',
      },
    };

    return {
      success: true,
      gasUsed,
      effectiveGasPrice: transaction.gasPrice,
      result: transaction.result,
    };
  }

  /**
   * 전체 블록체인 조회
   *
   * @returns 모든 블록 배열
   */
  getBlockchain(): Block[] {
    return [...this.blockchain];
  }

  /**
   * 블록 번호로 블록 조회
   *
   * @param blockNumber 블록 번호
   * @returns 블록 또는 null
   */
  getBlockByNumber(blockNumber: number): Block | undefined {
    return this.blockchain.find((b) => b.blockNumber === blockNumber);
  }

  /**
   * 최신 블록 조회
   *
   * @returns 최신 블록 또는 undefined
   */
  getLatestBlock(): Block | undefined {
    return this.blockchain[this.blockchain.length - 1];
  }

  /**
   * 블록체인 상태 조회
   *
   * @returns 블록체인 통계 정보
   */
  getBlockchainStatus(): BlockchainStatus {
    const totalTransactions = this.blockchain.reduce(
      (sum, block) => sum + block.transactionCount,
      0,
    );

    const blockTimes: number[] = [];
    for (let i = 1; i < this.blockchain.length; i++) {
      const timeDiff =
        this.blockchain[i].timestamp.getTime() -
        this.blockchain[i - 1].timestamp.getTime();
      blockTimes.push(timeDiff);
    }

    const averageBlockTime =
      blockTimes.length > 0
        ? blockTimes.reduce((sum, time) => sum + time, 0) / blockTimes.length
        : 0;

    return {
      latestBlockNumber: this.currentBlockNumber,
      totalBlocks: this.blockchain.length,
      totalTransactions,
      averageBlockTime,
      averageTransactionsPerBlock:
        this.blockchain.length > 0
          ? totalTransactions / this.blockchain.length
          : 0,
    };
  }

  /**
   * 자동 블록 생성 시작
   *
   * 1초마다 체크하여 12초 경과 또는 가스 한도 도달 시 블록을 생성합니다.
   */
  startAutoProduction(): void {
    if (this.autoProduction) {
      console.log('자동 블록 생성이 이미 실행 중입니다.');
      return;
    }

    this.autoProduction = true;
    this.lastBlockTime = Date.now();

    this.autoProductionInterval = setInterval(() => {
      void this.checkAndProduceBlock();
    }, this.CHECK_INTERVAL);

    console.log(
      `자동 블록 생성 시작 (1초마다 체크, 12초 경과 또는 가스 한도 도달 시 블록 생성)`,
    );
  }

  /**
   * 블록 생성 조건 체크 및 블록 생성
   *
   * 12초 경과 또는 가스 한도 도달 시 블록을 생성합니다.
   */
  private async checkAndProduceBlock(): Promise<void> {
    const now = Date.now();
    const timeSinceLastBlock = now - this.lastBlockTime;

    // 12초 경과 또는 가스 한도 도달 시 블록 생성
    if (
      timeSinceLastBlock >= this.AUTO_BLOCK_INTERVAL ||
      this.transactionPoolService.isGasLimitReached(this.BLOCK_GAS_LIMIT)
    ) {
      const block = this.createBlock();
      await this.executeBlock(block);
      this.lastBlockTime = now;

      const reason =
        timeSinceLastBlock >= this.AUTO_BLOCK_INTERVAL
          ? '시간 경과'
          : '가스 한도 도달';
      console.log(
        `블록 생성 완료 (${reason}): 블록 #${block.blockNumber}, 트랜잭션 ${block.transactionCount}개, 가스 사용량 ${block.gasUsed}/${this.BLOCK_GAS_LIMIT}`,
      );
    }
  }

  /**
   * 자동 블록 생성 중지
   */
  stopAutoProduction(): void {
    if (!this.autoProduction) {
      console.log('자동 블록 생성이 실행 중이 아닙니다.');
      return;
    }

    if (this.autoProductionInterval) {
      clearInterval(this.autoProductionInterval);
      this.autoProductionInterval = null;
    }

    this.autoProduction = false;
    console.log('자동 블록 생성 중지');
  }

  /**
   * 자동 블록 생성 상태 조회
   *
   * @returns 자동 생성 활성화 여부
   */
  isAutoProduction(): boolean {
    return this.autoProduction;
  }

  /**
   * 블록 해시 계산
   *
   * 실제 블록체인에서는 복잡한 해시 함수를 사용하지만,
   * 시뮬레이션에서는 간단한 해시를 생성합니다.
   *
   * @param blockNumber 블록 번호
   * @param transactions 포함된 트랜잭션들
   * @returns 블록 해시
   */
  private calculateBlockHash(
    blockNumber: number,
    transactions: Transaction[],
  ): string {
    const data = `${blockNumber}-${transactions.length}-${Date.now()}`;
    return `0x${Buffer.from(data).toString('hex').substring(0, 64)}`;
  }

  /**
   * 최신 블록 해시 조회
   *
   * @returns 최신 블록의 해시 또는 제네시스 해시
   */
  private getLatestBlockHash(): string {
    const latestBlock = this.getLatestBlock();
    return latestBlock?.hash || '0x0000000000000000000000000000000000000000';
  }

  /**
   * 총 수수료 계산
   *
   * 실행된 트랜잭션들의 가스 비용을 합산합니다.
   *
   * @param transactions 실행된 트랜잭션들
   * @returns 총 수수료
   */
  private calculateTotalFees(transactions: Transaction[]): number {
    return transactions.reduce((total, tx) => {
      const gasUsed = tx.gasUsed || 0;
      return total + this.gasService.calculateTotalCost(gasUsed, tx.gasPrice);
    }, 0);
  }
}
