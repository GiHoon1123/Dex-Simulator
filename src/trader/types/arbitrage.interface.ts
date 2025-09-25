export interface ArbitrageOpportunity {
  opportunityId: string;
  timestamp: Date;
  poolPrice: number; // 풀 내부 ETH/BTC 가격
  marketPrice: number; // 시장 ETH/BTC 가격
  difference: number; // 가격 차이
  percentage: number; // 가격 차이 비율 (%)
  direction: 'buy_eth_sell_btc' | 'buy_btc_sell_eth'; // 아비트라지 방향
}
