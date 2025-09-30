import {
  Trade,
  TradeResult,
} from 'src/dex-simulation/trader/types/trade.interface';

describe('Trade Interface', () => {
  it('Trade 인터페이스가 올바르게 정의되어야 합니다', () => {
    // Given: 거래 객체
    const trade: Trade = {
      id: 'trade_1234567890',
      from: 'ETH',
      to: 'BTC',
      amountIn: 50,
      amountOut: 1500,
      fee: 0.15,
      slippage: 0.5,
      priceImpact: 1.0,
      timestamp: new Date(),
    };

    // Then: 모든 속성이 올바르게 정의되어야 함
    expect(trade.id).toBe('trade_1234567890');
    expect(trade.from).toBe('ETH');
    expect(trade.to).toBe('BTC');
    expect(trade.amountIn).toBe(50);
    expect(trade.amountOut).toBe(1500);
    expect(trade.fee).toBe(0.15);
    expect(trade.slippage).toBe(0.5);
    expect(trade.priceImpact).toBe(1.0);
    expect(trade.timestamp).toBeInstanceOf(Date);
  });

  it('거래 방향이 올바른 타입이어야 합니다', () => {
    // Given: 다양한 거래 방향들
    const fromOptions: Trade['from'][] = ['ETH', 'BTC'];
    const toOptions: Trade['to'][] = ['ETH', 'BTC'];

    // Then: 모든 방향이 유효해야 함
    fromOptions.forEach((from) => {
      toOptions.forEach((to) => {
        if (from !== to) {
          const trade: Trade = {
            id: 'test',
            from,
            to,
            amountIn: 50,
            amountOut: 1500,
            fee: 0.15,
            slippage: 0.5,
            priceImpact: 1.0,
            timestamp: new Date(),
          };

          expect(['ETH', 'BTC']).toContain(trade.from);
          expect(['ETH', 'BTC']).toContain(trade.to);
          expect(trade.from).not.toBe(trade.to);
        }
      });
    });
  });

  it('수치 속성들이 올바른 타입이어야 합니다', () => {
    // Given: 거래 객체
    const trade: Trade = {
      id: 'trade_1234567890',
      from: 'ETH',
      to: 'BTC',
      amountIn: 50,
      amountOut: 1500,
      fee: 0.15,
      slippage: 0.5,
      priceImpact: 1.0,
      timestamp: new Date(),
    };

    // Then: 수치 속성들이 올바른 타입이어야 함
    expect(typeof trade.amountIn).toBe('number');
    expect(typeof trade.amountOut).toBe('number');
    expect(typeof trade.fee).toBe('number');
    expect(typeof trade.slippage).toBe('number');
    expect(typeof trade.priceImpact).toBe('number');
  });

  it('문자열 속성들이 올바른 타입이어야 합니다', () => {
    // Given: 거래 객체
    const trade: Trade = {
      id: 'trade_1234567890',
      from: 'ETH',
      to: 'BTC',
      amountIn: 50,
      amountOut: 1500,
      fee: 0.15,
      slippage: 0.5,
      priceImpact: 1.0,
      timestamp: new Date(),
    };

    // Then: 문자열 속성들이 올바른 타입이어야 함
    expect(typeof trade.id).toBe('string');
    expect(typeof trade.from).toBe('string');
    expect(typeof trade.to).toBe('string');
  });

  it('Date 속성이 올바른 타입이어야 합니다', () => {
    // Given: 거래 객체
    const trade: Trade = {
      id: 'trade_1234567890',
      from: 'ETH',
      to: 'BTC',
      amountIn: 50,
      amountOut: 1500,
      fee: 0.15,
      slippage: 0.5,
      priceImpact: 1.0,
      timestamp: new Date(),
    };

    // Then: Date 속성이 올바른 타입이어야 함
    expect(trade.timestamp).toBeInstanceOf(Date);
  });
});

describe('TradeResult Interface', () => {
  it('TradeResult 인터페이스가 올바르게 정의되어야 합니다', () => {
    // Given: 거래 결과 객체
    const tradeResult: TradeResult = {
      trade: {
        id: 'trade_1234567890',
        from: 'ETH',
        to: 'BTC',
        amountIn: 50,
        amountOut: 1500,
        fee: 0.15,
        slippage: 0.5,
        priceImpact: 1.0,
        timestamp: new Date(),
      },
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
      priceInfo: {
        expectedRate: 30,
        actualRate: 30.1,
        slippage: 0.5,
      },
    };

    // Then: 모든 속성이 올바르게 정의되어야 함
    expect(tradeResult.trade).toBeDefined();
    expect(tradeResult.poolBefore).toBeDefined();
    expect(tradeResult.poolAfter).toBeDefined();
    expect(tradeResult.priceInfo).toBeDefined();
  });

  it('풀 상태 객체들이 올바른 구조를 가져야 합니다', () => {
    // Given: 거래 결과 객체
    const tradeResult: TradeResult = {
      trade: {
        id: 'trade_1234567890',
        from: 'ETH',
        to: 'BTC',
        amountIn: 50,
        amountOut: 1500,
        fee: 0.15,
        slippage: 0.5,
        priceImpact: 1.0,
        timestamp: new Date(),
      },
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
      priceInfo: {
        expectedRate: 30,
        actualRate: 30.1,
        slippage: 0.5,
      },
    };

    // Then: 풀 상태 객체들이 올바른 구조를 가져야 함
    expect(tradeResult.poolBefore).toHaveProperty('eth');
    expect(tradeResult.poolBefore).toHaveProperty('btc');
    expect(tradeResult.poolBefore).toHaveProperty('k');

    expect(tradeResult.poolAfter).toHaveProperty('eth');
    expect(tradeResult.poolAfter).toHaveProperty('btc');
    expect(tradeResult.poolAfter).toHaveProperty('k');
  });

  it('가격 정보 객체가 올바른 구조를 가져야 합니다', () => {
    // Given: 거래 결과 객체
    const tradeResult: TradeResult = {
      trade: {
        id: 'trade_1234567890',
        from: 'ETH',
        to: 'BTC',
        amountIn: 50,
        amountOut: 1500,
        fee: 0.15,
        slippage: 0.5,
        priceImpact: 1.0,
        timestamp: new Date(),
      },
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
      priceInfo: {
        expectedRate: 30,
        actualRate: 30.1,
        slippage: 0.5,
      },
    };

    // Then: 가격 정보 객체가 올바른 구조를 가져야 함
    expect(tradeResult.priceInfo).toHaveProperty('expectedRate');
    expect(tradeResult.priceInfo).toHaveProperty('actualRate');
    expect(tradeResult.priceInfo).toHaveProperty('slippage');
  });

  it('수치 속성들이 올바른 타입이어야 합니다', () => {
    // Given: 거래 결과 객체
    const tradeResult: TradeResult = {
      trade: {
        id: 'trade_1234567890',
        from: 'ETH',
        to: 'BTC',
        amountIn: 50,
        amountOut: 1500,
        fee: 0.15,
        slippage: 0.5,
        priceImpact: 1.0,
        timestamp: new Date(),
      },
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
      priceInfo: {
        expectedRate: 30,
        actualRate: 30.1,
        slippage: 0.5,
      },
    };

    // Then: 수치 속성들이 올바른 타입이어야 함
    expect(typeof tradeResult.poolBefore.eth).toBe('number');
    expect(typeof tradeResult.poolBefore.btc).toBe('number');
    expect(typeof tradeResult.poolBefore.k).toBe('number');

    expect(typeof tradeResult.poolAfter.eth).toBe('number');
    expect(typeof tradeResult.poolAfter.btc).toBe('number');
    expect(typeof tradeResult.poolAfter.k).toBe('number');

    expect(typeof tradeResult.priceInfo.expectedRate).toBe('number');
    expect(typeof tradeResult.priceInfo.actualRate).toBe('number');
    expect(typeof tradeResult.priceInfo.slippage).toBe('number');
  });
});
