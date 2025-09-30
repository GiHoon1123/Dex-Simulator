export interface MarketPrice {
  eth: number; // ETH 가격 (USD)
  btc: number; // BTC 가격 (USD)
  ratio: number; // ETH/BTC 비율 (ETH per BTC)
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
  volatility: number; // 전체 변동성 (%)
}
