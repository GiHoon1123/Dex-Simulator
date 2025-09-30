export interface Trade {
  id: string;
  from: 'ETH' | 'BTC';
  to: 'ETH' | 'BTC';
  amountIn: number;
  amountOut: number;
  fee: number;
  slippage: number; // 슬리피지 (%)
  priceImpact: number; // 가격 영향도 (%)
  timestamp: Date;
}

export interface TradeResult {
  trade: Trade;
  poolBefore: {
    eth: number;
    btc: number;
    k: number;
  };
  poolAfter: {
    eth: number;
    btc: number;
    k: number;
  };
  priceInfo: {
    expectedRate: number; // 예상 교환 비율
    actualRate: number; // 실제 거래된 비율
    slippage: number; // 슬리피지 (%)
  };
}
