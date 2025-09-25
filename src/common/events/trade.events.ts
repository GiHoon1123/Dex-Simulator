export interface TradeExecutedEvent {
  tradeId: string;
  from: 'ETH' | 'BTC';
  to: 'ETH' | 'BTC';
  amountIn: number;
  amountOut: number;
  fee: number;
  slippage: number;
  priceImpact: number;
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
}
