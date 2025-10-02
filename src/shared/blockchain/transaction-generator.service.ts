import { Injectable } from '@nestjs/common';
import { GasService } from './gas.service';
import { TransactionPoolService } from './transaction-pool.service';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from './types/transaction.interface';

/**
 * TransactionGeneratorService
 *
 * 랜덤 트랜잭션을 자동으로 생성하여 트랜잭션 풀에 제출합니다.
 * MEV 시뮬레이션에 적합한 다양한 크기와 가스 가격의 트랜잭션을 생성합니다.
 */
@Injectable()
export class TransactionGeneratorService {
  // 생성기 상태
  private isGenerating = false;
  private generationInterval: NodeJS.Timeout | null = null;

  // 트랜잭션 카운터
  private transactionCounter = 0;
  private userCounter = 0;

  // 설정 (MEV 시뮬레이션에 최적화된 기본값)
  private readonly MIN_INTERVAL = 12000; // 최소 12초
  private readonly MAX_INTERVAL = 12000; // 최대 12초

  constructor(
    private readonly transactionPoolService: TransactionPoolService,
    private readonly gasService: GasService,
  ) {}

  /**
   * 자동 트랜잭션 생성 시작
   *
   * 12초 간격으로 랜덤 트랜잭션을 생성하여 풀에 제출합니다.
   */
  startGenerating(): void {
    if (this.isGenerating) {
      console.log('트랜잭션 생성기가 이미 실행 중입니다.');
      return;
    }

    this.isGenerating = true;
    this.scheduleNextTransaction();

    console.log('트랜잭션 자동 생성 시작 (12초 간격)');
  }

  /**
   * 자동 트랜잭션 생성 중지
   */
  stopGenerating(): void {
    if (!this.isGenerating) {
      console.log('트랜잭션 생성기가 실행 중이 아닙니다.');
      return;
    }

    if (this.generationInterval) {
      clearTimeout(this.generationInterval);
      this.generationInterval = null;
    }

    this.isGenerating = false;
    console.log('트랜잭션 자동 생성 중지');
  }

  /**
   * 생성기 상태 조회
   *
   * @returns 생성기 활성화 여부
   */
  isActive(): boolean {
    return this.isGenerating;
  }

  /**
   * 생성 통계 조회
   *
   * @returns 생성된 트랜잭션 통계
   */
  getStats() {
    return {
      isGenerating: this.isGenerating,
      totalGenerated: this.transactionCounter,
      totalUsers: this.userCounter,
    };
  }

  /**
   * 랜덤 트랜잭션 생성
   *
   * 다양한 크기와 가스 가격의 스왑 트랜잭션을 생성합니다.
   *
   * @returns 생성된 트랜잭션
   */
  generateRandomTransaction(): Transaction {
    this.transactionCounter++;

    // 1. 트랜잭션 타입 결정 (현재는 SWAP만, 나중에 확장 가능)
    const type = this.selectTransactionType();

    // 2. 스왑 방향 결정 (ETH→BTC or BTC→ETH)
    const isEthToBtc = Math.random() > 0.5;
    const from = isEthToBtc ? 'ETH' : 'BTC';
    const to = isEthToBtc ? 'BTC' : 'ETH';

    // 3. 거래 크기 결정 (소/중/대액)
    const size = this.selectTransactionSize();
    const amountIn = from === 'ETH' ? size : size * 30; // BTC는 30배

    // 4. 가스 가격 결정
    const gasPrice = this.selectGasPrice();

    // 5. 가스 한도 추정
    const gasLimit = this.gasService.estimateGas(type);

    // 6. 사용자 주소 생성
    const userAddress = `user-${Math.floor(Math.random() * 100)}`;
    if (Math.random() > 0.9) {
      this.userCounter++;
    }

    // 7. 트랜잭션 생성
    const transaction: Transaction = {
      id: `tx_${Date.now()}_${this.transactionCounter}`,
      type,
      from: userAddress,
      to: 'dex-contract',
      data: {
        swap: {
          from,
          to,
          amountIn,
        },
      },
      gasPrice,
      gasLimit,
      nonce: this.transactionCounter,
      status: TransactionStatus.PENDING,
      timestamp: new Date(),
    };

    // 8. 트랜잭션 풀에 제출
    this.transactionPoolService.submitTransaction(transaction);

    console.log(
      `트랜잭션 생성: ${from}(${amountIn.toFixed(2)}) → ${to}, gasPrice: ${gasPrice}`,
    );

    return transaction;
  }

  /**
   * 다음 트랜잭션 생성 스케줄링
   *
   * 랜덤 간격 후 다음 트랜잭션을 생성합니다.
   */
  private scheduleNextTransaction(): void {
    if (!this.isGenerating) return;

    const interval = this.getRandomInterval();

    this.generationInterval = setTimeout(() => {
      this.generateRandomTransaction();
      this.scheduleNextTransaction(); // 재귀적으로 다음 스케줄링
    }, interval);
  }

  /**
   * 랜덤 간격 생성
   *
   * @returns 밀리초 단위 간격
   */
  private getRandomInterval(): number {
    return (
      this.MIN_INTERVAL +
      Math.random() * (this.MAX_INTERVAL - this.MIN_INTERVAL)
    );
  }

  /**
   * 트랜잭션 타입 선택
   *
   * 현재는 SWAP만, 나중에 확률 기반으로 다른 타입도 추가 가능
   *
   * @returns 트랜잭션 타입
   */
  private selectTransactionType(): TransactionType {
    const rand = Math.random();

    if (rand < 0.85) {
      // 85% SWAP
      return TransactionType.SWAP;
    } else if (rand < 0.95) {
      // 10% ADD_LIQUIDITY
      return TransactionType.ADD_LIQUIDITY;
    } else {
      // 5% REMOVE_LIQUIDITY
      return TransactionType.REMOVE_LIQUIDITY;
    }
  }

  /**
   * 거래 크기 선택
   *
   * MEV 시뮬레이션에 적합한 다양한 크기의 거래를 생성합니다.
   * 다양한 크기의 거래로 MEV 기회를 제공합니다.
   *
   * @returns ETH 기준 거래 크기
   */
  private selectTransactionSize(): number {
    const rand = Math.random();

    if (rand < 0.3) {
      // 30% 소액 (1~5 ETH) - 일반 거래
      return 1 + Math.random() * 4;
    } else if (rand < 0.6) {
      // 30% 중액 (5~20 ETH) - 샌드위치 가능
      return 5 + Math.random() * 15;
    } else if (rand < 0.85) {
      // 25% 대액 (20~50 ETH) - 프론트런 가능
      return 20 + Math.random() * 30;
    } else {
      // 15% 초대액 (50~100 ETH) - MEV 주요 타겟!
      return 50 + Math.random() * 50;
    }
  }

  /**
   * 가스 가격 선택
   *
   * 다양한 가스 가격으로 트랜잭션을 생성하여
   * 우선순위 경쟁 상황을 만듭니다.
   *
   * @returns 가스 가격
   */
  private selectGasPrice(): number {
    const rand = Math.random();

    if (rand < 0.5) {
      // 50% 낮은 가스 (80~120)
      return 80 + Math.random() * 40;
    } else if (rand < 0.8) {
      // 30% 보통 가스 (120~200)
      return 120 + Math.random() * 80;
    } else {
      // 20% 높은 가스 (200~400)
      return 200 + Math.random() * 200;
    }
  }
}
