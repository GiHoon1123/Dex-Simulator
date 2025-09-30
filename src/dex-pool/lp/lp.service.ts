import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TradeExecutedEvent } from '../../common/events/trade.events';
import { LpUser, Pool } from './types/lp.interface';
import { PriceChangeEvent } from './types/market.interface';

@Injectable()
export class LpService {
  private pool: Pool;
  private readonly TOKEN_GENERATION_RATE = 10; // 거래 1당 생성되는 토큰 수
  private readonly BASE_FEE_RATE = 0.003; // 기본 수수료 0.3%
  private readonly MIN_FEE_RATE = 0.0005; // 최소 수수료 0.05%
  private readonly MAX_FEE_RATE = 0.01; // 최대 수수료 1%
  private readonly VOLATILITY_MULTIPLIER = 2; // 변동성 배수 (변동성 1% → 수수료 2% 증가)

  constructor() {
    this.pool = {
      eth: 0,
      btc: 0,
      k: 0,
      feeRate: this.BASE_FEE_RATE,
      userCount: 0,
      users: [],
      initialPoolValue: 0,
      currentPoolValue: 0,
      poolSizeRatio: 1.0,
      volatility: {
        eth: 0,
        btc: 0,
        overall: 0,
      },
      lastVolatilityUpdate: new Date(),
    };
  }

  // 풀 초기화: 유저 10명을 랜덤으로 생성 후 풀 채우기
  initLiquidity(): Pool {
    const users: LpUser[] = [];

    // 고정된 초기 풀 비율 (ETH:BTC = 1000:30000)
    const TARGET_ETH = 1000;
    const TARGET_BTC = 30000;

    // 각 유저의 비율을 랜덤으로 생성 (합이 1이 되도록)
    const userRatios: number[] = [];
    let remainingRatio = 1;

    for (let i = 0; i < 9; i++) {
      const ratio = Math.random() * remainingRatio * 0.8; // 최대 80%까지
      userRatios.push(parseFloat(ratio.toFixed(3)));
      remainingRatio -= ratio;
    }
    userRatios.push(parseFloat(remainingRatio.toFixed(3))); // 마지막 유저가 나머지

    // 각 유저에게 ETH/BTC 배분
    for (let i = 1; i <= 10; i++) {
      const ratio = userRatios[i - 1];
      const eth = parseFloat((TARGET_ETH * ratio).toFixed(3));
      const btc = parseFloat((TARGET_BTC * ratio).toFixed(3));

      users.push({
        id: i,
        eth,
        btc,
        share: 0,
        earnedEth: 0,
        earnedBtc: 0,
        governanceTokens: 0,
      });
    }

    const totalEth = TARGET_ETH;
    const totalBtc = TARGET_BTC;

    // k 값 계산 (곱 불변식)
    const k = parseFloat((totalEth * totalBtc).toFixed(6));

    // share(지분율) 계산
    users.forEach((u) => {
      const value = u.eth + u.btc * (totalEth / totalBtc);
      const totalValue = totalEth + totalBtc * (totalEth / totalBtc);
      u.share = parseFloat((value / totalValue).toFixed(3));
    });

    // 초기 거버넌스 토큰 분배 (지분 비율 그대로)
    this.distributeInitialTokens(users);

    // 초기 풀 가치 계산 (ETH 기준)
    const initialPoolValue = totalEth + totalBtc * (totalEth / totalBtc);

    this.pool = {
      eth: totalEth,
      btc: totalBtc,
      k,
      feeRate: this.BASE_FEE_RATE,
      userCount: users.length,
      users,
      initialPoolValue,
      currentPoolValue: initialPoolValue,
      poolSizeRatio: 1.0,
      volatility: {
        eth: 0,
        btc: 0,
        overall: 0,
      },
      lastVolatilityUpdate: new Date(),
    };
    return this.pool;
  }

  // 현재 풀 상태 반환
  getPool(): Pool {
    this.validatePoolInitialized();
    return this.pool;
  }

  // 자동 랜덤 유저 추가 (여러 명)
  addRandomUser(): Pool {
    this.validatePoolInitialized();
    if (this.pool.users.length >= 30) {
      throw new Error('최대 유저 수(30명)에 도달했습니다.');
    }

    // 추가할 유저 수 랜덤 결정 (1~5명, 최대 30명 초과하지 않도록)
    const maxUsersToAdd = Math.min(5, 30 - this.pool.users.length);
    const usersToAdd = Math.floor(Math.random() * maxUsersToAdd) + 1;

    for (let i = 0; i < usersToAdd; i++) {
      // 새 유저 ID 생성 (기존 최대 ID + 1)
      const newUserId = Math.max(...this.pool.users.map((u) => u.id)) + 1;

      // 랜덤 비율 생성 (전체 풀의 1~3% 정도)
      const ratio = Math.random() * 0.03 + 0.01; // 1~4%

      // 새 유저의 ETH/BTC 계산 (1:30 비율 유지)
      const newEth = parseFloat((this.pool.eth * ratio).toFixed(3));
      const newBtc = parseFloat((this.pool.btc * ratio).toFixed(3));

      // 새 유저 추가
      const newUser: LpUser = {
        id: newUserId,
        eth: newEth,
        btc: newBtc,
        share: 0,
        earnedEth: 0,
        earnedBtc: 0,
        governanceTokens: 0,
      };

      this.pool.users.push(newUser);

      // 풀 총량 업데이트
      this.pool.eth += newEth;
      this.pool.btc += newBtc;
    }

    this.pool.k = parseFloat((this.pool.eth * this.pool.btc).toFixed(6));
    this.pool.userCount = this.pool.users.length;

    // 모든 유저의 지분 재계산
    this.recalculateShares();

    // 동적 수수료 재계산 (풀 크기 변화 반영)
    this.calculateDynamicFee();

    return this.pool;
  }

  // 자동 랜덤 유저 제거 (여러 명)
  removeRandomUser(): Pool {
    this.validatePoolInitialized();
    if (this.pool.users.length <= 10) {
      throw new Error('최소 유저 수(10명)에 도달했습니다.');
    }

    // 제거할 유저 수 랜덤 결정 (1~3명, 최소 10명 미만이 되지 않도록)
    const maxUsersToRemove = Math.min(3, this.pool.users.length - 10);
    const usersToRemove = Math.floor(Math.random() * maxUsersToRemove) + 1;

    for (let i = 0; i < usersToRemove; i++) {
      // 랜덤 유저 선택
      const randomIndex = Math.floor(Math.random() * this.pool.users.length);
      const removedUser = this.pool.users[randomIndex];

      // 풀에서 유저 제거
      this.pool.users.splice(randomIndex, 1);

      // 풀 총량 업데이트
      this.pool.eth -= removedUser.eth;
      this.pool.btc -= removedUser.btc;
    }

    this.pool.k = parseFloat((this.pool.eth * this.pool.btc).toFixed(6));
    this.pool.userCount = this.pool.users.length;

    // 모든 유저의 지분 재계산
    this.recalculateShares();

    // 동적 수수료 재계산 (풀 크기 변화 반영)
    this.calculateDynamicFee();

    return this.pool;
  }

  // 모든 유저의 지분 재계산
  private recalculateShares(): void {
    this.pool.users.forEach((user) => {
      const value = user.eth + user.btc * (this.pool.eth / this.pool.btc);
      const totalValue =
        this.pool.eth + this.pool.btc * (this.pool.eth / this.pool.btc);
      user.share = parseFloat((value / totalValue).toFixed(3));
    });
  }

  // 풀 초기화 검증
  private validatePoolInitialized(): void {
    if (this.pool.users.length === 0) {
      throw new Error(
        '풀이 초기화되지 않았습니다. 먼저 POST /lp/init을 호출해주세요.',
      );
    }
  }

  // 초기 거버넌스 토큰 분배 (지분 비율 그대로)
  private distributeInitialTokens(users: LpUser[]): void {
    users.forEach((user) => {
      // 54% 지분이면 54개 토큰
      user.governanceTokens = parseFloat((user.share * 100).toFixed(2));
    });
  }

  // 거래 이벤트 리스너
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @OnEvent('trade.executed')
  handleTradeExecuted(event: TradeExecutedEvent): void {
    console.log(`거래 실행됨: ${event.tradeId}, 수수료: ${event.fee}`);

    // 풀 상태 업데이트
    this.updatePoolAfterTrade(event);

    // 수수료 분배
    this.distributeFees(event.fee, event.from);

    // 거버넌스 토큰 분배
    this.distributeTokensFromTrade(event.fee);
  }

  // 거래 후 풀 상태 업데이트
  private updatePoolAfterTrade(event: TradeExecutedEvent): void {
    this.pool.eth = event.poolAfter.eth;
    this.pool.btc = event.poolAfter.btc;
    this.pool.k = event.poolAfter.k;

    // 모든 유저의 지분 재계산
    this.recalculateShares();

    // 동적 수수료 재계산 (풀 크기 변화 반영)
    this.calculateDynamicFee();
  }

  // 수수료 분배
  private distributeFees(fee: number, from: 'ETH' | 'BTC'): void {
    this.pool.users.forEach((user) => {
      const userFee = parseFloat((fee * user.share).toFixed(6));

      if (from === 'ETH') {
        // ETH로 수수료 지급
        user.earnedEth += userFee;
      } else {
        // BTC로 수수료 지급
        user.earnedBtc += userFee;
      }
    });
  }

  // 동적 수수료 계산 (풀 크기 기반)
  calculateDynamicFee(): number {
    this.validatePoolInitialized();

    // 현재 풀 가치 계산 (ETH 기준)
    const currentPoolValue =
      this.pool.eth + this.pool.btc * (this.pool.eth / this.pool.btc);

    // 풀 크기 비율 계산
    const poolSizeRatio = currentPoolValue / this.pool.initialPoolValue;

    // 풀 크기에 따른 수수료 조절 (제곱근 기반)
    // 풀이 클수록 수수료 감소
    const sizeMultiplier = Math.max(0.1, 1 / Math.sqrt(poolSizeRatio));

    // 최종 수수료 계산
    const dynamicFeeRate = this.BASE_FEE_RATE * sizeMultiplier;

    // 최소/최대 수수료 범위 적용
    const finalFeeRate = Math.max(
      this.MIN_FEE_RATE,
      Math.min(this.MAX_FEE_RATE, dynamicFeeRate),
    );

    // 풀 정보 업데이트
    this.pool.currentPoolValue = currentPoolValue;
    this.pool.poolSizeRatio = poolSizeRatio;
    this.pool.feeRate = finalFeeRate;

    return finalFeeRate;
  }

  // 수수료 계산 (거래량 기준)
  calculateFee(amountIn: number): number {
    const currentFeeRate = this.calculateDynamicFee();
    return amountIn * currentFeeRate;
  }

  // 거래 시 거버넌스 토큰 분배
  distributeTokensFromTrade(tradeFee: number): void {
    this.validatePoolInitialized();

    // 거래 수수료에 비례하여 토큰 생성
    const tokensToDistribute = tradeFee * this.TOKEN_GENERATION_RATE;

    // 유저별 지분 비율로 토큰 분배
    this.pool.users.forEach((user) => {
      const userTokens = parseFloat(
        (tokensToDistribute * user.share).toFixed(2),
      );
      user.governanceTokens += userTokens;
    });
  }

  // Market 가격 변동 이벤트 수신
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @OnEvent('market.price.changed')
  handleMarketPriceChange(event: PriceChangeEvent): void {
    console.log(
      `시장 가격 변동 감지: ETH ${event.change.eth.toFixed(2)}%, BTC ${event.change.btc.toFixed(2)}%`,
    );

    // 변동성 정보 업데이트
    this.pool.volatility = {
      eth: Math.abs(event.change.eth),
      btc: Math.abs(event.change.btc),
      overall: event.volatility,
    };
    this.pool.lastVolatilityUpdate = new Date();

    // 동적 수수료 재계산 (풀 크기 + 변동성)
    this.calculateDynamicFeeWithVolatility();
  }

  // 변동성을 포함한 동적 수수료 계산
  private calculateDynamicFeeWithVolatility(): void {
    this.validatePoolInitialized();

    // 1. 풀 크기 기반 수수료 계산
    const currentPoolValue =
      this.pool.eth + this.pool.btc * (this.pool.eth / this.pool.btc);
    const poolSizeRatio = currentPoolValue / this.pool.initialPoolValue;
    const sizeMultiplier = Math.max(0.1, 1 / Math.sqrt(poolSizeRatio));

    // 2. 변동성 기반 수수료 계산
    const volatilityMultiplier =
      1 + (this.pool.volatility.overall / 100) * this.VOLATILITY_MULTIPLIER;

    // 3. 복합 수수료 계산 (풀 크기 60%, 변동성 40%)
    const combinedMultiplier =
      sizeMultiplier * 0.6 + volatilityMultiplier * 0.4;
    const dynamicFeeRate = this.BASE_FEE_RATE * combinedMultiplier;

    // 4. 최소/최대 수수료 범위 적용
    const finalFeeRate = Math.max(
      this.MIN_FEE_RATE,
      Math.min(this.MAX_FEE_RATE, dynamicFeeRate),
    );

    // 5. 풀 정보 업데이트
    this.pool.currentPoolValue = currentPoolValue;
    this.pool.poolSizeRatio = poolSizeRatio;
    this.pool.feeRate = finalFeeRate;

    console.log(
      `동적 수수료 업데이트: ${(finalFeeRate * 100).toFixed(3)}% (풀크기: ${(sizeMultiplier * 100).toFixed(1)}%, 변동성: ${(volatilityMultiplier * 100).toFixed(1)}%)`,
    );
  }
}
