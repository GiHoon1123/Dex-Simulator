import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { LpUser, Pool } from 'src/lp/types/lp.interface';
import { TradeExecutedEvent } from '../common/events/trade.events';

@Injectable()
export class LpService {
  private pool: Pool;
  private readonly TOKEN_GENERATION_RATE = 10; // 거래 1당 생성되는 토큰 수
  private readonly FEE_RATE = 0.003; // 0.3% 수수료

  constructor() {
    this.pool = {
      eth: 0,
      btc: 0,
      k: 0,
      feeRate: this.FEE_RATE,
      userCount: 0,
      users: [],
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

    this.pool = {
      eth: totalEth,
      btc: totalBtc,
      k,
      feeRate: this.FEE_RATE,
      userCount: users.length,
      users,
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

  // 수수료 계산
  calculateFee(amountIn: number): number {
    return amountIn * this.FEE_RATE;
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
}
