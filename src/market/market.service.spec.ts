import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MarketService } from './market.service';

describe('MarketService', () => {
  let service: MarketService;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketService,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MarketService>(MarketService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  it('서비스가 정상적으로 생성되어야 한다', () => {
    expect(service).toBeDefined();
  });

  describe('현재 가격 조회', () => {
    it('초기 가격이 올바르게 설정되어야 한다', () => {
      const currentPrice = service.getCurrentPrice();
      
      expect(currentPrice.eth).toBe(2000);
      expect(currentPrice.btc).toBe(60000);
      expect(currentPrice.ratio).toBeCloseTo(0.033333, 5);
      expect(currentPrice.timestamp).toBeInstanceOf(Date);
    });

    it('가격 조회 시 새로운 객체를 반환해야 한다', () => {
      const price1 = service.getCurrentPrice();
      const price2 = service.getCurrentPrice();
      
      expect(price1).not.toBe(price2);
      expect(price1.eth).toBe(price2.eth);
    });
  });

  describe('가격 변동 시뮬레이션', () => {
    it('가격 변동 시 이벤트가 발생해야 한다', () => {
      const eventSpy = jest.spyOn(eventEmitter, 'emit');
      
      service.simulatePriceChange();
      
      expect(eventSpy).toHaveBeenCalledWith('market.price.changed', expect.any(Object));
    });

    it('가격 변동 시 이전 가격과 현재 가격이 다르게 설정되어야 한다', () => {
      const previousPrice = service.getCurrentPrice();
      const priceChangeEvent = service.simulatePriceChange();
      
      expect(priceChangeEvent.previousPrice.eth).toBe(previousPrice.eth);
      expect(priceChangeEvent.currentPrice.eth).not.toBe(previousPrice.eth);
      expect(priceChangeEvent.change.eth).toBeDefined();
      expect(priceChangeEvent.change.btc).toBeDefined();
    });

    it('가격 변동 이벤트에 올바른 정보가 포함되어야 한다', () => {
      const priceChangeEvent = service.simulatePriceChange();
      
      expect(priceChangeEvent.eventId).toMatch(/^price_change_\d+$/);
      expect(priceChangeEvent.timestamp).toBeInstanceOf(Date);
      expect(priceChangeEvent.previousPrice).toBeDefined();
      expect(priceChangeEvent.currentPrice).toBeDefined();
      expect(priceChangeEvent.change.eth).toBeDefined();
      expect(priceChangeEvent.change.btc).toBeDefined();
      expect(priceChangeEvent.volatility).toBeDefined();
    });
  });

  describe('변동성 계산', () => {
    it('가격 이력이 부족할 때 변동성은 0이어야 한다', () => {
      const volatility = service['calculateVolatility']();
      expect(volatility).toBe(0);
    });

    it('여러 번 가격 변동 후 변동성이 계산되어야 한다', () => {
      // 가격 변동을 여러 번 실행
      for (let i = 0; i < 5; i++) {
        service.simulatePriceChange();
      }
      
      const volatility = service['calculateVolatility']();
      expect(volatility).toBeGreaterThanOrEqual(0);
    });
  });

  describe('아비트라지 기회 계산', () => {
    it('가격 차이가 5% 미만일 때 아비트라지 기회가 없어야 한다', () => {
      const opportunity = service.calculateArbitrageOpportunity(1000, 30000);
      expect(opportunity).toBeNull();
    });

    it('가격 차이가 5% 이상일 때 아비트라지 기회가 있어야 한다', () => {
      // 풀 가격을 시장 가격과 다르게 설정
      const opportunity = service.calculateArbitrageOpportunity(1000, 25000);
      
      expect(opportunity).toBeDefined();
      expect(opportunity!.opportunityId).toMatch(/^arbitrage_\d+$/);
      expect(opportunity!.timestamp).toBeInstanceOf(Date);
      expect(opportunity!.poolPrice).toBe(25);
      expect(opportunity!.marketPrice).toBeCloseTo(30, 1);
      expect(opportunity!.difference).toBeGreaterThan(0);
      expect(opportunity!.percentage).toBeGreaterThan(5);
      expect(['buy_eth_sell_btc', 'buy_btc_sell_eth']).toContain(opportunity!.direction);
    });

    it('아비트라지 기회 발견 시 이벤트가 발생해야 한다', () => {
      const eventSpy = jest.spyOn(eventEmitter, 'emit');
      
      service.calculateArbitrageOpportunity(1000, 25000);
      
      expect(eventSpy).toHaveBeenCalledWith('arbitrage.opportunity', expect.any(Object));
    });
  });

  describe('시장 상태 조회', () => {
    it('풀 정보 없이 시장 상태를 조회할 수 있어야 한다', () => {
      const status = service.getMarketStatus();
      
      expect(status.currentPrice).toBeDefined();
      expect(status.volatility).toBeDefined();
      expect(status.volatility.eth).toBeDefined();
      expect(status.volatility.btc).toBeDefined();
      expect(status.volatility.overall).toBeDefined();
      expect(status.arbitrageOpportunity).toBeNull();
      expect(status.lastUpdate).toBeInstanceOf(Date);
    });

    it('풀 정보와 함께 시장 상태를 조회할 수 있어야 한다', () => {
      const status = service.getMarketStatus(1000, 25000);
      
      expect(status.currentPrice).toBeDefined();
      expect(status.volatility).toBeDefined();
      expect(status.arbitrageOpportunity).toBeDefined();
      expect(status.lastUpdate).toBeInstanceOf(Date);
    });
  });

  describe('아비트라지 기회 체크 및 이벤트 발생', () => {
    it('아비트라지 기회가 있을 때 이벤트가 발생해야 한다', () => {
      const eventSpy = jest.spyOn(eventEmitter, 'emit');
      
      service.checkAndEmitArbitrageOpportunity(1000, 25000);
      
      expect(eventSpy).toHaveBeenCalledWith('arbitrage.opportunity', expect.any(Object));
    });

    it('아비트라지 기회가 없을 때 이벤트가 발생하지 않아야 한다', () => {
      const eventSpy = jest.spyOn(eventEmitter, 'emit');
      
      service.checkAndEmitArbitrageOpportunity(1000, 30000);
      
      expect(eventSpy).not.toHaveBeenCalledWith('arbitrage.opportunity', expect.any(Object));
    });
  });

  describe('개별 자산 변동성 계산', () => {
    it('ETH 변동성을 계산할 수 있어야 한다', () => {
      const ethVolatility = service['calculateEthVolatility']();
      expect(ethVolatility).toBeGreaterThanOrEqual(0);
    });

    it('BTC 변동성을 계산할 수 있어야 한다', () => {
      const btcVolatility = service['calculateBtcVolatility']();
      expect(btcVolatility).toBeGreaterThanOrEqual(0);
    });
  });
});
