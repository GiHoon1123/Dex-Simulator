import { TradeExecutedEvent } from 'src/dex-pool/events/trade.events';

describe('TradeExecutedEvent Interface', () => {
  it('TradeExecutedEvent 인터페이스가 올바르게 정의되어야 합니다', () => {
    // Given: 거래 실행 이벤트 객체
    const tradeEvent: TradeExecutedEvent = {
      tradeId: 'trade_1234567890',
      from: 'ETH',
      to: 'BTC',
      amountIn: 50,
      amountOut: 1500,
      fee: 0.15,
      slippage: 0.5,
      priceImpact: 1.0,
      poolBefore: {
        eth: 1000,
        btc: 30000,
        k: 30000000,
      },
      poolAfter: {
        eth: 1050,
        btc: 28500,
        k: 30000000,
      },
    };

    // Then: 모든 속성이 올바르게 정의되어야 함
    expect(tradeEvent.tradeId).toBe('trade_1234567890');
    expect(tradeEvent.from).toBe('ETH');
    expect(tradeEvent.to).toBe('BTC');
    expect(tradeEvent.amountIn).toBe(50);
    expect(tradeEvent.amountOut).toBe(1500);
    expect(tradeEvent.fee).toBe(0.15);
    expect(tradeEvent.slippage).toBe(0.5);
    expect(tradeEvent.priceImpact).toBe(1.0);
    expect(tradeEvent.poolBefore).toBeDefined();
    expect(tradeEvent.poolAfter).toBeDefined();
  });

  it('거래 방향이 올바른 타입이어야 합니다', () => {
    // Given: 다양한 거래 방향들
    const fromOptions: TradeExecutedEvent['from'][] = ['ETH', 'BTC'];
    const toOptions: TradeExecutedEvent['to'][] = ['ETH', 'BTC'];

    // Then: 모든 방향이 유효해야 함
    fromOptions.forEach((from) => {
      toOptions.forEach((to) => {
        if (from !== to) {
          const tradeEvent: TradeExecutedEvent = {
            tradeId: 'test',
            from,
            to,
            amountIn: 50,
            amountOut: 1500,
            fee: 0.15,
            slippage: 0.5,
            priceImpact: 1.0,
            poolBefore: {
              eth: 1000,
              btc: 30000,
              k: 30000000,
            },
            poolAfter: {
              eth: 1050,
              btc: 28500,
              k: 30000000,
            },
          };

          expect(['ETH', 'BTC']).toContain(tradeEvent.from);
          expect(['ETH', 'BTC']).toContain(tradeEvent.to);
          expect(tradeEvent.from).not.toBe(tradeEvent.to);
        }
      });
    });
  });

  it('수치 속성들이 올바른 타입이어야 합니다', () => {
    // Given: 거래 실행 이벤트 객체
    const tradeEvent: TradeExecutedEvent = {
      tradeId: 'trade_1234567890',
      from: 'ETH',
      to: 'BTC',
      amountIn: 50,
      amountOut: 1500,
      fee: 0.15,
      slippage: 0.5,
      priceImpact: 1.0,
      poolBefore: {
        eth: 1000,
        btc: 30000,
        k: 30000000,
      },
      poolAfter: {
        eth: 1050,
        btc: 28500,
        k: 30000000,
      },
    };

    // Then: 수치 속성들이 올바른 타입이어야 함
    expect(typeof tradeEvent.amountIn).toBe('number');
    expect(typeof tradeEvent.amountOut).toBe('number');
    expect(typeof tradeEvent.fee).toBe('number');
    expect(typeof tradeEvent.slippage).toBe('number');
    expect(typeof tradeEvent.priceImpact).toBe('number');
  });

  it('문자열 속성들이 올바른 타입이어야 합니다', () => {
    // Given: 거래 실행 이벤트 객체
    const tradeEvent: TradeExecutedEvent = {
      tradeId: 'trade_1234567890',
      from: 'ETH',
      to: 'BTC',
      amountIn: 50,
      amountOut: 1500,
      fee: 0.15,
      slippage: 0.5,
      priceImpact: 1.0,
      poolBefore: {
        eth: 1000,
        btc: 30000,
        k: 30000000,
      },
      poolAfter: {
        eth: 1050,
        btc: 28500,
        k: 30000000,
      },
    };

    // Then: 문자열 속성들이 올바른 타입이어야 함
    expect(typeof tradeEvent.tradeId).toBe('string');
    expect(typeof tradeEvent.from).toBe('string');
    expect(typeof tradeEvent.to).toBe('string');
  });

  it('풀 상태 객체들이 올바른 구조를 가져야 합니다', () => {
    // Given: 거래 실행 이벤트 객체
    const tradeEvent: TradeExecutedEvent = {
      tradeId: 'trade_1234567890',
      from: 'ETH',
      to: 'BTC',
      amountIn: 50,
      amountOut: 1500,
      fee: 0.15,
      slippage: 0.5,
      priceImpact: 1.0,
      poolBefore: {
        eth: 1000,
        btc: 30000,
        k: 30000000,
      },
      poolAfter: {
        eth: 1050,
        btc: 28500,
        k: 30000000,
      },
    };

    // Then: 풀 상태 객체들이 올바른 구조를 가져야 함
    expect(tradeEvent.poolBefore).toHaveProperty('eth');
    expect(tradeEvent.poolBefore).toHaveProperty('btc');
    expect(tradeEvent.poolBefore).toHaveProperty('k');

    expect(tradeEvent.poolAfter).toHaveProperty('eth');
    expect(tradeEvent.poolAfter).toHaveProperty('btc');
    expect(tradeEvent.poolAfter).toHaveProperty('k');
  });

  it('풀 상태 수치 속성들이 올바른 타입이어야 합니다', () => {
    // Given: 거래 실행 이벤트 객체
    const tradeEvent: TradeExecutedEvent = {
      tradeId: 'trade_1234567890',
      from: 'ETH',
      to: 'BTC',
      amountIn: 50,
      amountOut: 1500,
      fee: 0.15,
      slippage: 0.5,
      priceImpact: 1.0,
      poolBefore: {
        eth: 1000,
        btc: 30000,
        k: 30000000,
      },
      poolAfter: {
        eth: 1050,
        btc: 28500,
        k: 30000000,
      },
    };

    // Then: 풀 상태 수치 속성들이 올바른 타입이어야 함
    expect(typeof tradeEvent.poolBefore.eth).toBe('number');
    expect(typeof tradeEvent.poolBefore.btc).toBe('number');
    expect(typeof tradeEvent.poolBefore.k).toBe('number');

    expect(typeof tradeEvent.poolAfter.eth).toBe('number');
    expect(typeof tradeEvent.poolAfter.btc).toBe('number');
    expect(typeof tradeEvent.poolAfter.k).toBe('number');
  });

  it('거래 후 풀 상태가 거래 전과 다르게 변경되어야 합니다', () => {
    // Given: 거래 실행 이벤트 객체
    const tradeEvent: TradeExecutedEvent = {
      tradeId: 'trade_1234567890',
      from: 'ETH',
      to: 'BTC',
      amountIn: 50,
      amountOut: 1500,
      fee: 0.15,
      slippage: 0.5,
      priceImpact: 1.0,
      poolBefore: {
        eth: 1000,
        btc: 30000,
        k: 30000000,
      },
      poolAfter: {
        eth: 1050,
        btc: 28500,
        k: 30000000,
      },
    };

    // Then: 거래 후 풀 상태가 거래 전과 다르게 변경되어야 함
    expect(tradeEvent.poolAfter.eth).not.toBe(tradeEvent.poolBefore.eth);
    expect(tradeEvent.poolAfter.btc).not.toBe(tradeEvent.poolBefore.btc);
    expect(tradeEvent.poolAfter.k).toBe(tradeEvent.poolBefore.k); // k는 유지
  });
});
