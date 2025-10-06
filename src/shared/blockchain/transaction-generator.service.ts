import { Injectable } from '@nestjs/common';
import { GasService } from './gas.service';
import { TransactionParserService } from './transaction-parser.service';
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
  private readonly MIN_INTERVAL = 1000; // 최소 1초
  private readonly MAX_INTERVAL = 1000; // 최대 1초

  /**
   * 풀 주소 매핑
   *
   * 실제 Uniswap V3 풀 주소들을 사용합니다.
   * 각 풀은 고유한 컨트랙트 주소를 가지며,
   * MEV 봇이 to 주소로 풀을 식별할 수 있습니다.
   */
  private readonly POOL_ADDRESSES = {
    ETH_USDC: '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8', // Uniswap V3 ETH/USDC 0.3%
    BTC_ETH: '0x4585FE77225b41b697C938B018E2Ac67Ac5a20c0', // Uniswap V3 WBTC/ETH 0.3%
    DAI_USDC: '0x5777d92f208679DB4b9778590Fa3CAB3aC9e2168', // Uniswap V3 DAI/USDC 0.01%
    WETH_USDC: '0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640', // Uniswap V3 WETH/USDC 0.05%
  };

  /**
   * 토큰 가격 매핑 (ETH 기준)
   *
   * 각 토큰의 ETH 대비 가격을 정의합니다.
   * 실제 거래량 계산에 사용됩니다.
   */
  private readonly TOKEN_PRICES = {
    ETH: 1, // 기준 토큰
    WETH: 1, // WETH = ETH
    BTC: 20, // 1 BTC = 20 ETH
    WBTC: 20, // WBTC = BTC
    USDC: 0.0005, // 1 USDC = 0.0005 ETH (1 ETH = 2000 USDC)
    DAI: 0.0005, // 1 DAI = 0.0005 ETH (1 ETH = 2000 DAI)
  };

  constructor(
    private readonly transactionPoolService: TransactionPoolService,
    private readonly gasService: GasService,
    private readonly transactionParser: TransactionParserService,
  ) {}

  /**
   * 자동 트랜잭션 생성 시작
   *
   * 1초 간격으로 랜덤 트랜잭션을 생성하여 풀에 제출합니다.
   */
  startGenerating(): void {
    if (this.isGenerating) {
      console.log('트랜잭션 생성기가 이미 실행 중입니다.');
      return;
    }

    this.isGenerating = true;
    this.scheduleNextTransaction();

    console.log('트랜잭션 자동 생성 시작 (1초 간격)');
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
   * 다양한 풀과 토큰 페어에서 스왑 트랜잭션을 생성합니다.
   * 실제 이더리움 트랜잭션 구조를 기반으로 합니다.
   *
   * @returns 생성된 트랜잭션
   */
  generateRandomTransaction(): Transaction {
    this.transactionCounter++;

    // 1. 트랜잭션 타입 결정 (현재는 SWAP만, 나중에 확장 가능)
    const type = this.selectTransactionType();

    // 2. 랜덤 풀 선택
    const poolPair = this.selectRandomPool();
    const poolAddress = this.POOL_ADDRESSES[poolPair];

    // 3. 해당 풀의 토큰 페어 선택
    const { from, to } = this.selectTokenPair(poolPair);

    // 4. 거래 크기 결정 (ETH 기준)
    const size = this.selectTransactionSize();
    const amountIn = this.calculateAmountIn(from, size);

    // 5. 가스 가격 결정
    const gasPrice = this.selectGasPrice();

    // 6. 가스 한도 추정
    const gasLimit = this.gasService.estimateGas(type);

    // 7. 사용자 주소 생성
    const userAddress = `user-${Math.floor(Math.random() * 100)}`;
    if (Math.random() > 0.9) {
      this.userCounter++;
    }

    // 8. Uniswap V3 swap 함수 파라미터 생성
    const swapParams = {
      recipient: userAddress,
      zeroForOne: Math.random() > 0.5,
      amountSpecified: amountIn.toString(),
      sqrtPriceLimitX96: '0',
      data: '0x',
    };

    // 9. 함수 호출 데이터 생성 (hex)
    const functionData = this.transactionParser.encodeFunctionData('swap', [
      swapParams.recipient,
      swapParams.zeroForOne,
      swapParams.amountSpecified,
      swapParams.sqrtPriceLimitX96,
      swapParams.data,
    ]);

    // 10. 트랜잭션 생성 (실제 이더리움 구조)
    const transaction: Transaction = {
      id: `tx_${Date.now()}_${this.transactionCounter}`,
      type,
      from: userAddress,
      to: poolAddress, // 실제 풀 컨트랙트 주소
      value: '0', // ETH 전송량 (스왑은 0)
      data: functionData, // 실제 함수 호출 데이터
      gasPrice,
      gasLimit,
      nonce: this.transactionCounter,
      status: TransactionStatus.PENDING,
      timestamp: new Date(),
    };

    // 11. 파싱된 데이터 생성 (MEV 봇용)
    const parsedData =
      this.transactionParser.parseTransactionData(functionData);
    if (parsedData) {
      (transaction as any).parsedData = parsedData;
    }

    // 12. 트랜잭션 풀에 제출
    this.transactionPoolService.submitTransaction(transaction);

    console.log(
      `트랜잭션 생성: ${poolPair} ${from}(${amountIn.toFixed(2)}) → ${to}, gasPrice: ${gasPrice}`,
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

  /**
   * 랜덤 풀 선택
   *
   * 사용 가능한 풀들 중에서 랜덤하게 하나를 선택합니다.
   * MEV 시뮬레이션을 위해 다양한 풀에서 거래가 발생하도록 합니다.
   *
   * @returns 선택된 풀 페어
   */
  private selectRandomPool(): string {
    const pools = Object.keys(this.POOL_ADDRESSES);
    const randomIndex = Math.floor(Math.random() * pools.length);
    return pools[randomIndex];
  }

  /**
   * 토큰 페어 선택
   *
   * 선택된 풀에서 거래할 토큰 페어를 결정합니다.
   * 각 풀은 두 개의 토큰을 가지며, 랜덤하게 방향을 선택합니다.
   *
   * @param poolPair - 풀 페어 (예: 'ETH_USDC')
   * @returns 토큰 페어 정보
   */
  private selectTokenPair(poolPair: string): { from: string; to: string } {
    const tokenPairs = {
      ETH_USDC: ['ETH', 'USDC'],
      BTC_ETH: ['BTC', 'ETH'],
      DAI_USDC: ['DAI', 'USDC'],
      WETH_USDC: ['WETH', 'USDC'],
    };

    const tokens = tokenPairs[poolPair];
    if (!tokens) {
      throw new Error(`지원하지 않는 풀 페어: ${poolPair}`);
    }

    // 랜덤하게 방향 선택
    const isFirstToSecond = Math.random() > 0.5;

    return {
      from: isFirstToSecond ? tokens[0] : tokens[1],
      to: isFirstToSecond ? tokens[1] : tokens[0],
    };
  }

  /**
   * 토큰별 거래량 계산
   *
   * ETH 기준 거래량을 각 토큰의 실제 가격에 맞게 변환합니다.
   * 실제 이더리움에서와 동일한 가격 비율을 사용합니다.
   *
   * @param from - 거래할 토큰
   * @param size - ETH 기준 거래량
   * @returns 토큰별 실제 거래량
   */
  private calculateAmountIn(from: string, size: number): number {
    const tokenPrice = this.TOKEN_PRICES[from];
    if (!tokenPrice) {
      throw new Error(`지원하지 않는 토큰: ${from}`);
    }

    // ETH 기준 거래량을 토큰 가격으로 나누어 실제 거래량 계산
    const amountIn = size / tokenPrice;

    // 소수점 6자리까지 반올림
    return Math.round(amountIn * 1000000) / 1000000;
  }
}
