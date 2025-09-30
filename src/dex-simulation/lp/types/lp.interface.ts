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
  feeRate: number; // 거래 수수료율 (동적 조절)
  userCount: number; // 전체 유저 수
  users: LpUser[];
  // 동적 수수료 계산을 위한 정보
  initialPoolValue: number; // 초기 풀 가치 (ETH 기준)
  currentPoolValue: number; // 현재 풀 가치 (ETH 기준)
  poolSizeRatio: number; // 풀 크기 비율 (현재/초기)
  // 변동성 기반 수수료 정보
  volatility: {
    eth: number; // ETH 변동성 (%)
    btc: number; // BTC 변동성 (%)
    overall: number; // 전체 변동성 (%)
  };
  lastVolatilityUpdate: Date; // 마지막 변동성 업데이트 시간
}
