import { Injectable } from '@nestjs/common';
import { LpUser, Pool } from 'src/lp/types/lp.interface';

@Injectable()
export class LpService {
  private pool: Pool;

  constructor() {
    this.pool = {
      eth: 0,
      btc: 0,
      k: 0,
      userCount: 0,
      users: [],
    };
  }

  // 풀 초기화: 유저 10명을 랜덤으로 생성 후 풀 채우기
  initLiquidity(): Pool {
    const users: LpUser[] = [];

    // 고정된 초기 풀 비율 (ETH:BTC = 10:300)
    const TARGET_ETH = 10;
    const TARGET_BTC = 300;

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

      users.push({ id: i, eth, btc, share: 0, earnedEth: 0, earnedBtc: 0 });
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

    this.pool = {
      eth: totalEth,
      btc: totalBtc,
      k,
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
}
