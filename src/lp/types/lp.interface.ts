// src/lp/interfaces/lp.interface.ts
export interface LpUser {
  id: number;
  eth: number;
  btc: number;
  share: number;
  earnedEth: number; // 수수료로 받은 ETH (누적)
  earnedBtc: number; // 수수료로 받은 BTC (누적)
  governanceTokens: number; // 거버넌스 토큰 보유량
}

export interface Pool {
  eth: number;
  btc: number;
  k: number;
  userCount: number; // 전체 유저 수
  users: LpUser[];
}
