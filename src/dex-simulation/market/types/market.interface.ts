// Market 관련 인터페이스 정의

export interface MarketPrice {
  eth: number; // ETH 가격 (USD)
  btc: number; // BTC 가격 (USD)
  ratio: number; // ETH/BTC 비율
  timestamp: Date;
}

export interface PriceChangeEvent {
  eventId: string;
  timestamp: Date;
  previousPrice: MarketPrice;
  currentPrice: MarketPrice;
  change: {
    eth: number; // ETH 가격 변동률 (%)
    btc: number; // BTC 가격 변동률 (%)
  };
  volatility: number; // 전체 변동성
}

export interface ArbitrageOpportunity {
  opportunityId: string;
  timestamp: Date;
  poolPrice: number; // 풀 내부 ETH 가격 (BTC 기준)
  marketPrice: number; // 시장 ETH 가격 (BTC 기준)
  difference: number; // 가격 차이
  percentage: number; // 차이 비율 (%)
  direction: 'buy_eth_sell_btc' | 'buy_btc_sell_eth'; // 아비트라지 방향
}

export interface VolatilityMetrics {
  eth: number; // ETH 변동성 (%)
  btc: number; // BTC 변동성 (%)
  overall: number; // 전체 변동성 (%)
}

export interface MarketStatus {
  currentPrice: MarketPrice;
  volatility: VolatilityMetrics;
  arbitrageOpportunity: ArbitrageOpportunity | null;
  lastUpdate: Date;
}
