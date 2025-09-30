import { ArbitrageOpportunity } from 'src/dex-pool/trader/types/arbitrage.interface';

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

  it('문자열 속성들이 올바른 타입이어야 합니다', () => {
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

    // Then: 문자열 속성들이 올바른 타입이어야 함
    expect(typeof arbitrageOpportunity.opportunityId).toBe('string');
    expect(typeof arbitrageOpportunity.direction).toBe('string');
  });

  it('Date 속성이 올바른 타입이어야 합니다', () => {
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

    // Then: Date 속성이 올바른 타입이어야 함
    expect(arbitrageOpportunity.timestamp).toBeInstanceOf(Date);
  });
});
