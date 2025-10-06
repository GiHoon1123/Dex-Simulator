import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  POOL_EVENT_TYPES,
  PoolTransactionCreatedEvent,
} from '../events/pool.events';
import { TransactionParserService } from './transaction-parser.service';
import { TransactionPoolService } from './transaction-pool.service';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from './types/transaction.interface';

/**
 * 트랜잭션 변환 서비스
 *
 * 모듈에서 생성된 트랜잭션 구조체를 받아서
 * 완전한 트랜잭션으로 변환하고 메모풀에 제출합니다.
 *
 * 실제 이더리움에서 RPC 노드가 하는 역할을 시뮬레이션합니다.
 */
@Injectable()
export class TransactionConverterService {
  private readonly logger = new Logger(TransactionConverterService.name);

  constructor(
    private readonly transactionParser: TransactionParserService,
    private readonly transactionPool: TransactionPoolService,
  ) {}

  /**
   * 모듈에서 생성된 트랜잭션 구조체 이벤트 구독
   * 실제 RPC 노드처럼 트랜잭션을 완성하고 메모풀에 제출
   */
  @OnEvent(POOL_EVENT_TYPES.POOL_TRANSACTION_CREATED)
  async handleTransactionCreated(
    event: PoolTransactionCreatedEvent,
  ): Promise<void> {
    try {
      this.logger.log(`트랜잭션 구조체 수신: ${event.transaction.id}`);

      // 트랜잭션 구조체를 완전한 트랜잭션으로 변환
      const transaction = await this.convertToFullTransaction(event);

      // 메모풀에 제출
      await this.transactionPool.submitTransaction(transaction);

      this.logger.log(`트랜잭션 메모풀 제출 완료: ${transaction.id}`);
    } catch (error) {
      this.logger.error(`트랜잭션 처리 실패: ${event.transaction.id}`, error);
    }
  }

  /**
   * 트랜잭션 구조체를 완전한 트랜잭션으로 변환
   * 실제 RPC 노드에서 하는 작업을 시뮬레이션
   */
  private async convertToFullTransaction(
    event: PoolTransactionCreatedEvent,
  ): Promise<Transaction> {
    const { transaction: txStructure } = event;

    // 트랜잭션 타입에 따라 함수 데이터 생성
    let functionData: string;
    let parsedData: any;

    switch (txStructure.type) {
      case 'SWAP':
        if (!txStructure.swapParams) {
          throw new Error('SWAP 트랜잭션에 swapParams가 없습니다');
        }

        // Uniswap V3 swap 함수 데이터 생성
        functionData = this.transactionParser.encodeFunctionData('swap', [
          txStructure.swapParams.recipient,
          txStructure.swapParams.zeroForOne,
          txStructure.swapParams.amountSpecified,
          txStructure.swapParams.sqrtPriceLimitX96,
          txStructure.swapParams.data,
        ]);

        // 파싱된 데이터 생성
        parsedData = this.transactionParser.parseTransactionData(functionData);
        break;

      case 'ADD_LIQUIDITY':
        if (!txStructure.addLiquidityParams) {
          throw new Error(
            'ADD_LIQUIDITY 트랜잭션에 addLiquidityParams가 없습니다',
          );
        }

        // 유동성 추가 함수 데이터 생성
        functionData = this.transactionParser.encodeFunctionData(
          'addLiquidity',
          [
            txStructure.addLiquidityParams.recipient,
            txStructure.addLiquidityParams.amountA,
            txStructure.addLiquidityParams.amountB,
            txStructure.addLiquidityParams.amountAMin,
            txStructure.addLiquidityParams.amountBMin,
            txStructure.addLiquidityParams.deadline,
          ],
        );

        // 파싱된 데이터 생성
        parsedData = this.transactionParser.parseTransactionData(functionData);
        break;

      case 'REMOVE_LIQUIDITY':
        if (!txStructure.removeLiquidityParams) {
          throw new Error(
            'REMOVE_LIQUIDITY 트랜잭션에 removeLiquidityParams가 없습니다',
          );
        }

        // 유동성 제거 함수 데이터 생성
        functionData = this.transactionParser.encodeFunctionData(
          'removeLiquidity',
          [
            txStructure.removeLiquidityParams.recipient,
            txStructure.removeLiquidityParams.liquidityAmount,
            txStructure.removeLiquidityParams.amountAMin,
            txStructure.removeLiquidityParams.amountBMin,
            txStructure.removeLiquidityParams.deadline,
          ],
        );

        // 파싱된 데이터 생성
        parsedData = this.transactionParser.parseTransactionData(functionData);
        break;

      default:
        throw new Error(`지원하지 않는 트랜잭션 타입: ${txStructure.type}`);
    }

    // 완전한 트랜잭션 생성
    const transaction: Transaction = {
      id: txStructure.id,
      type: txStructure.type as TransactionType,
      from: txStructure.from,
      to: txStructure.to,
      value: txStructure.value,
      data: functionData,
      gasPrice: txStructure.gasPrice,
      gasLimit: txStructure.gasLimit,
      nonce: txStructure.nonce,
      status: TransactionStatus.PENDING,
      timestamp: new Date(),
      parsedData,
    };

    return transaction;
  }
}
