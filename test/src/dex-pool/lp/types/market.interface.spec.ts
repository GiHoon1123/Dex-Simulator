import {
  MarketPrice,
  PriceChangeEvent,
} from 'src/dex-pool/lp/types/market.interface';
import {
  ArbitrageOpportunity,
  MarketStatus,
  VolatilityMetrics,
} from 'src/dex-pool/market/types/market.interface';

describe('MarketPrice Interface', () => {
  it('MarketPrice 인터페이스가 올바르게 정의되어야 합니다', () => {
    // Given: 시장 가격 객체
    const marketPrice: MarketPrice = {
      eth: 2000,
      btc: 60000,
      ratio: 0.033,
      timestamp: new Date(),
    };

    // Then: 모든 속성이 올바르게 정의되어야 함
    expect(marketPrice.eth).toBe(2000);
    expect(marketPrice.btc).toBe(60000);
    expect(marketPrice.ratio).toBe(0.033);
    expect(marketPrice.timestamp).toBeInstanceOf(Date);
  });

  it('수치 속성들이 올바른 타입이어야 합니다', () => {
    // Given: 시장 가격 객체
    const marketPrice: MarketPrice = {
      eth: 2000,
      btc: 60000,
      ratio: 0.033,
      timestamp: new Date(),
    };

    // Then: 수치 속성들이 올바른 타입이어야 함
    expect(typeof marketPrice.eth).toBe('number');
    expect(typeof marketPrice.btc).toBe('number');
    expect(typeof marketPrice.ratio).toBe('number');
  });

  it('가격이 양수여야 합니다', () => {
    // Given: 시장 가격 객체
    const marketPrice: MarketPrice = {
      eth: 2000,
      btc: 60000,
      ratio: 0.033,
      timestamp: new Date(),
    };

    // Then: 가격이 양수여야 함
    expect(marketPrice.eth).toBeGreaterThan(0);
    expect(marketPrice.btc).toBeGreaterThan(0);
    expect(marketPrice.ratio).toBeGreaterThan(0);
  });

  it('Date 속성이 올바른 타입이어야 합니다', () => {
    // Given: 시장 가격 객체
    const marketPrice: MarketPrice = {
      eth: 2000,
      btc: 60000,
      ratio: 0.033,
      timestamp: new Date(),
    };

    // Then: Date 속성이 올바른 타입이어야 함
    expect(marketPrice.timestamp).toBeInstanceOf(Date);
  });
});

describe('PriceChangeEvent Interface', () => {
  it('PriceChangeEvent 인터페이스가 올바르게 정의되어야 합니다', () => {
    // Given: 가격 변동 이벤트 객체
    const priceChangeEvent: PriceChangeEvent = {
      eventId: 'price_change_1234567890',
      timestamp: new Date(),
      previousPrice: {
        eth: 2000,
        btc: 60000,
        ratio: 0.033,
        timestamp: new Date(),
      },
      currentPrice: {
        eth: 2100,
        btc: 63000,
        ratio: 0.033,
        timestamp: new Date(),
      },
      change: {
        eth: 5.0,
        btc: 5.0,
      },
      volatility: 3.5,
    };

    // Then: 모든 속성이 올바르게 정의되어야 함
    expect(priceChangeEvent.eventId).toBe('price_change_1234567890');
    expect(priceChangeEvent.timestamp).toBeInstanceOf(Date);
    expect(priceChangeEvent.previousPrice).toBeDefined();
    expect(priceChangeEvent.currentPrice).toBeDefined();
    expect(priceChangeEvent.change).toBeDefined();
    expect(priceChangeEvent.volatility).toBe(3.5);
  });

  it('문자열 속성들이 올바른 타입이어야 합니다', () => {
    // Given: 가격 변동 이벤트 객체
    const priceChangeEvent: PriceChangeEvent = {
      eventId: 'price_change_1234567890',
      timestamp: new Date(),
      previousPrice: {
        eth: 2000,
        btc: 60000,
        ratio: 0.033,
        timestamp: new Date(),
      },
      currentPrice: {
        eth: 2100,
        btc: 63000,
        ratio: 0.033,
        timestamp: new Date(),
      },
      change: {
        eth: 5.0,
        btc: 5.0,
      },
      volatility: 3.5,
    };

    // Then: 문자열 속성들이 올바른 타입이어야 함
    expect(typeof priceChangeEvent.eventId).toBe('string');
  });

  it('수치 속성들이 올바른 타입이어야 합니다', () => {
    // Given: 가격 변동 이벤트 객체
    const priceChangeEvent: PriceChangeEvent = {
      eventId: 'price_change_1234567890',
      timestamp: new Date(),
      previousPrice: {
        eth: 2000,
        btc: 60000,
        ratio: 0.033,
        timestamp: new Date(),
      },
      currentPrice: {
        eth: 2100,
        btc: 63000,
        ratio: 0.033,
        timestamp: new Date(),
      },
      change: {
        eth: 5.0,
        btc: 5.0,
      },
      volatility: 3.5,
    };

    // Then: 수치 속성들이 올바른 타입이어야 함
    expect(typeof priceChangeEvent.change.eth).toBe('number');
    expect(typeof priceChangeEvent.change.btc).toBe('number');
    expect(typeof priceChangeEvent.volatility).toBe('number');
  });

  it('변동률이 음수가 아니어야 합니다', () => {
    // Given: 가격 변동 이벤트 객체
    const priceChangeEvent: PriceChangeEvent = {
      eventId: 'price_change_1234567890',
      timestamp: new Date(),
      previousPrice: {
        eth: 2000,
        btc: 60000,
        ratio: 0.033,
        timestamp: new Date(),
      },
      currentPrice: {
        eth: 2100,
        btc: 63000,
        ratio: 0.033,
        timestamp: new Date(),
      },
      change: {
        eth: 5.0,
        btc: 5.0,
      },
      volatility: 3.5,
    };

    // Then: 변동률이 음수가 아니어야 함
    expect(priceChangeEvent.volatility).toBeGreaterThanOrEqual(0);
  });
});

describe('ArbitrageOpportunity Interface', () => {
  it('ArbitrageOpportunity 인터페이스가 올바르게 정의되어야 합니다', () => {
    // Given: 아비트라지 기회 객체
    const arbitrageOpportunity: ArbitrageOpportunity = {
      opportunityId: 'arbitrage_1234567890',
      timestamp: new Date(),
      poolPrice: 0.025,
      marketPrice: 0.033,
      difference: 0.008,
      percentage: 24.24,
      direction: 'buy_eth_sell_btc',
    };

    // Then: 모든 속성이 올바르게 정의되어야 함
    expect(arbitrageOpportunity.opportunityId).toBe('arbitrage_1234567890');
    expect(arbitrageOpportunity.timestamp).toBeInstanceOf(Date);
    expect(arbitrageOpportunity.poolPrice).toBe(0.025);
    expect(arbitrageOpportunity.marketPrice).toBe(0.033);
    expect(arbitrageOpportunity.difference).toBe(0.008);
    expect(arbitrageOpportunity.percentage).toBe(24.24);
    expect(arbitrageOpportunity.direction).toBe('buy_eth_sell_btc');
  });

  it('아비트라지 방향이 올바른 타입이어야 합니다', () => {
    // Given: 다양한 아비트라지 방향들
    const directions: ArbitrageOpportunity['direction'][] = [
      'buy_eth_sell_btc',
      'buy_btc_sell_eth',
    ];

    // Then: 모든 방향이 유효해야 함
    directions.forEach((direction) => {
      const arbitrageOpportunity: ArbitrageOpportunity = {
        opportunityId: 'test',
        timestamp: new Date(),
        poolPrice: 0.025,
        marketPrice: 0.033,
        difference: 0.008,
        percentage: 24.24,
        direction,
      };

      expect(['buy_eth_sell_btc', 'buy_btc_sell_eth']).toContain(
        arbitrageOpportunity.direction,
      );
    });
  });

  it('수치 속성들이 올바른 타입이어야 합니다', () => {
    // Given: 아비트라지 기회 객체
    const arbitrageOpportunity: ArbitrageOpportunity = {
      opportunityId: 'arbitrage_1234567890',
      timestamp: new Date(),
      poolPrice: 0.025,
      marketPrice: 0.033,
      difference: 0.008,
      percentage: 24.24,
      direction: 'buy_eth_sell_btc',
    };

    // Then: 수치 속성들이 올바른 타입이어야 함
    expect(typeof arbitrageOpportunity.poolPrice).toBe('number');
    expect(typeof arbitrageOpportunity.marketPrice).toBe('number');
    expect(typeof arbitrageOpportunity.difference).toBe('number');
    expect(typeof arbitrageOpportunity.percentage).toBe('number');
  });

  it('가격 차이가 양수여야 합니다', () => {
    // Given: 아비트라지 기회 객체
    const arbitrageOpportunity: ArbitrageOpportunity = {
      opportunityId: 'arbitrage_1234567890',
      timestamp: new Date(),
      poolPrice: 0.025,
      marketPrice: 0.033,
      difference: 0.008,
      percentage: 24.24,
      direction: 'buy_eth_sell_btc',
    };

    // Then: 가격 차이가 양수여야 함
    expect(arbitrageOpportunity.difference).toBeGreaterThan(0);
    expect(arbitrageOpportunity.percentage).toBeGreaterThan(0);
  });
});

describe('VolatilityMetrics Interface', () => {
  it('VolatilityMetrics 인터페이스가 올바르게 정의되어야 합니다', () => {
    // Given: 변동성 지표 객체
    const volatilityMetrics: VolatilityMetrics = {
      eth: 2.5,
      btc: 1.8,
      overall: 2.1,
    };

    // Then: 모든 속성이 올바르게 정의되어야 함
    expect(volatilityMetrics.eth).toBe(2.5);
    expect(volatilityMetrics.btc).toBe(1.8);
    expect(volatilityMetrics.overall).toBe(2.1);
  });

  it('수치 속성들이 올바른 타입이어야 합니다', () => {
    // Given: 변동성 지표 객체
    const volatilityMetrics: VolatilityMetrics = {
      eth: 2.5,
      btc: 1.8,
      overall: 2.1,
    };

    // Then: 수치 속성들이 올바른 타입이어야 함
    expect(typeof volatilityMetrics.eth).toBe('number');
    expect(typeof volatilityMetrics.btc).toBe('number');
    expect(typeof volatilityMetrics.overall).toBe('number');
  });

  it('변동성 값들이 음수가 아니어야 합니다', () => {
    // Given: 변동성 지표 객체
    const volatilityMetrics: VolatilityMetrics = {
      eth: 2.5,
      btc: 1.8,
      overall: 2.1,
    };

    // Then: 변동성 값들이 음수가 아니어야 함
    expect(volatilityMetrics.eth).toBeGreaterThanOrEqual(0);
    expect(volatilityMetrics.btc).toBeGreaterThanOrEqual(0);
    expect(volatilityMetrics.overall).toBeGreaterThanOrEqual(0);
  });
});

describe('MarketStatus Interface', () => {
  it('MarketStatus 인터페이스가 올바르게 정의되어야 합니다', () => {
    // Given: 시장 상태 객체
    const marketStatus: MarketStatus = {
      currentPrice: {
        eth: 2000,
        btc: 60000,
        ratio: 0.033,
        timestamp: new Date(),
      },
      volatility: {
        eth: 2.5,
        btc: 1.8,
        overall: 2.1,
      },
      arbitrageOpportunity: null,
      lastUpdate: new Date(),
    };

    // Then: 모든 속성이 올바르게 정의되어야 함
    expect(marketStatus.currentPrice).toBeDefined();
    expect(marketStatus.volatility).toBeDefined();
    expect(marketStatus.arbitrageOpportunity).toBeNull();
    expect(marketStatus.lastUpdate).toBeInstanceOf(Date);
  });

  it('아비트라지 기회가 포함된 시장 상태를 처리할 수 있어야 합니다', () => {
    // Given: 아비트라지 기회가 포함된 시장 상태 객체
    const marketStatus: MarketStatus = {
      currentPrice: {
        eth: 2000,
        btc: 60000,
        ratio: 0.033,
        timestamp: new Date(),
      },
      volatility: {
        eth: 2.5,
        btc: 1.8,
        overall: 2.1,
      },
      arbitrageOpportunity: {
        opportunityId: 'arbitrage_1234567890',
        timestamp: new Date(),
        poolPrice: 0.025,
        marketPrice: 0.033,
        difference: 0.008,
        percentage: 24.24,
        direction: 'buy_eth_sell_btc',
      },
      lastUpdate: new Date(),
    };

    // Then: 아비트라지 기회가 포함된 상태가 올바르게 처리되어야 함
    expect(marketStatus.arbitrageOpportunity).toBeDefined();
    expect(marketStatus.arbitrageOpportunity?.opportunityId).toBe(
      'arbitrage_1234567890',
    );
    expect(marketStatus.arbitrageOpportunity?.percentage).toBe(24.24);
  });

  it('Date 속성들이 올바른 타입이어야 합니다', () => {
    // Given: 시장 상태 객체
    const marketStatus: MarketStatus = {
      currentPrice: {
        eth: 2000,
        btc: 60000,
        ratio: 0.033,
        timestamp: new Date(),
      },
      volatility: {
        eth: 2.5,
        btc: 1.8,
        overall: 2.1,
      },
      arbitrageOpportunity: null,
      lastUpdate: new Date(),
    };

    // Then: Date 속성들이 올바른 타입이어야 함
    expect(marketStatus.currentPrice.timestamp).toBeInstanceOf(Date);
    expect(marketStatus.lastUpdate).toBeInstanceOf(Date);
  });
});
