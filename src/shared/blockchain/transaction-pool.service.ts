import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TransactionPendingEvent } from '../events/blockchain.events';
import {
  Transaction,
  TransactionPoolStatus,
  TransactionStatus,
} from './types/transaction.interface';

/**
 * TransactionPoolService
 *
 * 트랜잭션 풀(Mempool)을 관리합니다.
 * 트랜잭션을 가스 가격 순으로 정렬하여 블록 생성 시 우선순위를 결정합니다.
 * MEV 봇이 이 풀을 모니터링하여 공격 기회를 포착합니다.
 */
@Injectable()
export class TransactionPoolService {
  // 대기 중인 트랜잭션들 (Map으로 빠른 조회)
  private pendingTransactions: Map<string, Transaction> = new Map();

  // 주소별 논스 관리
  private nonces: Map<string, number> = new Map();

  // 설정
  private readonly MAX_PENDING_TX = 100;

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * 트랜잭션 제출
   *
   * 트랜잭션을 풀에 추가하고 가스 가격 순으로 정렬합니다.
   * transaction.pending 이벤트를 발생시켜 MEV 봇이 감지할 수 있게 합니다.
   *
   * @param transaction 제출할 트랜잭션
   * @throws Error 풀이 가득 찬 경우
   */
  submitTransaction(transaction: Transaction): void {
    // 풀 용량 체크
    if (this.pendingTransactions.size >= this.MAX_PENDING_TX) {
      throw new Error(
        `트랜잭션 풀이 가득 찼습니다. (최대: ${this.MAX_PENDING_TX})`,
      );
    }

    // 논스 검증 및 업데이트
    this.validateAndUpdateNonce(transaction);

    // 트랜잭션 상태 설정
    transaction.status = TransactionStatus.PENDING;

    // 풀에 추가
    this.pendingTransactions.set(transaction.id, transaction);

    // 이벤트 발생 (MEV 봇이 감지)
    const event: TransactionPendingEvent = {
      transaction,
      poolStatus: {
        pendingCount: this.pendingTransactions.size,
        averageGasPrice: this.calculateAverageGasPrice(),
      },
      timestamp: new Date(),
    };

    this.eventEmitter.emit('transaction.pending', event);
  }

  /**
   * 대기 중인 트랜잭션 조회 (가스 가격 순)
   *
   * MEV 봇이 이 메서드를 사용하여 프론트런 기회를 탐색합니다.
   *
   * @returns 가스 가격이 높은 순으로 정렬된 트랜잭션 배열
   */
  getPendingTransactions(): Transaction[] {
    const transactions = Array.from(this.pendingTransactions.values());
    return this.sortByGasPrice(transactions);
  }

  /**
   * 블록 생성을 위한 트랜잭션 선택
   *
   * 가스 가격이 높은 순으로 트랜잭션을 선택하고 풀에서 제거합니다.
   *
   * @param limit 선택할 트랜잭션 최대 개수
   * @returns 선택된 트랜잭션 배열
   */
  selectTransactionsForBlock(limit: number): Transaction[] {
    const pending = this.getPendingTransactions();
    const selected = pending.slice(0, limit);

    // 선택된 트랜잭션은 풀에서 제거
    selected.forEach((tx) => {
      tx.status = TransactionStatus.SELECTED;
      this.pendingTransactions.delete(tx.id);
    });

    return selected;
  }

  /**
   * 트랜잭션 ID로 조회
   *
   * @param id 트랜잭션 ID
   * @returns 트랜잭션 또는 null
   */
  getTransactionById(id: string): Transaction | undefined {
    return this.pendingTransactions.get(id);
  }

  /**
   * 트랜잭션 제거
   *
   * @param id 제거할 트랜잭션 ID
   */
  removeTransaction(id: string): void {
    this.pendingTransactions.delete(id);
  }

  /**
   * 트랜잭션 풀 상태 조회
   *
   * @returns 풀 상태 정보
   */
  getPoolStatus(): TransactionPoolStatus {
    const transactions = Array.from(this.pendingTransactions.values());
    const gasPrices = transactions.map((tx) => tx.gasPrice);

    return {
      pendingCount: this.pendingTransactions.size,
      totalTransactions: this.pendingTransactions.size,
      averageGasPrice: this.calculateAverageGasPrice(),
      highestGasPrice: gasPrices.length > 0 ? Math.max(...gasPrices) : 0,
      lowestGasPrice: gasPrices.length > 0 ? Math.min(...gasPrices) : 0,
    };
  }

  /**
   * 풀 초기화
   *
   * 모든 대기 중인 트랜잭션을 제거합니다.
   */
  clearPool(): void {
    this.pendingTransactions.clear();
  }

  /**
   * 가스 가격 순으로 정렬
   *
   * 내림차순 정렬 (높은 가스 가격이 먼저)
   *
   * @param transactions 정렬할 트랜잭션 배열
   * @returns 정렬된 트랜잭션 배열
   */
  private sortByGasPrice(transactions: Transaction[]): Transaction[] {
    return transactions.sort((a, b) => {
      // 가스 가격 내림차순
      if (b.gasPrice !== a.gasPrice) {
        return b.gasPrice - a.gasPrice;
      }
      // 가스 가격이 같으면 논스 오름차순
      return a.nonce - b.nonce;
    });
  }

  /**
   * 논스 검증 및 업데이트
   *
   * @param transaction 검증할 트랜잭션
   * @throws Error 논스가 유효하지 않은 경우
   */
  private validateAndUpdateNonce(transaction: Transaction): void {
    const currentNonce = this.nonces.get(transaction.from) || 0;

    if (transaction.nonce < currentNonce) {
      throw new Error(
        `유효하지 않은 논스입니다. 현재: ${currentNonce}, 제출: ${transaction.nonce}`,
      );
    }

    this.nonces.set(transaction.from, transaction.nonce + 1);
  }

  /**
   * 평균 가스 가격 계산
   *
   * @returns 평균 가스 가격
   */
  private calculateAverageGasPrice(): number {
    const transactions = Array.from(this.pendingTransactions.values());
    if (transactions.length === 0) return 0;

    const totalGasPrice = transactions.reduce(
      (sum, tx) => sum + tx.gasPrice,
      0,
    );
    return totalGasPrice / transactions.length;
  }
}
