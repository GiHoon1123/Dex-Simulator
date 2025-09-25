import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TraderService } from './trader.service';
import { LpService } from '../lp/lp.service';
import { MarketService } from '../market/market.service';
import { ArbitrageOpportunity } from './types/arbitrage.interface';

describe('TraderService', () => {
  let service: TraderService;
  let lpService: LpService;
  let marketService: MarketService;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TraderService,
        {
          provide: LpService,
          useValue: {
            getPool: jest.fn(),
            calculateFee: jest.fn(),
          },
        },
        {
          provide: MarketService,
          useValue: {
            getCurrentPrice: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TraderService>(TraderService);
    lpService = module.get<LpService>(LpService);
    marketService = module.get<MarketService>(MarketService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  it('서비스가 정상적으로 생성되어야 한다', () => {
    expect(service).toBeDefined();
  });

  describe('랜덤 거래 실행', () => {
    beforeEach(() => {
      jest.spyOn(lpService, 'getPool').mockReturnValue({
        eth: 1000,
        btc: 30000,
        k: 30000000,
        feeRate: 0.003,
        userCount: 10,
        users: [],
        initialPoolValue: 2000,
        currentPoolValue: 2000,
        poolSizeRatio: 1,
        volatility: { eth: 0, btc: 0, overall: 0 },
        lastVolatilityUpdate: new Date(),
      });
      jest.spyOn(lpService, 'calculateFee').mockReturnValue(0.3);
    });

    it('랜덤 거래가 정상적으로 실행되어야 한다', () => {
      const result = service.executeRandomTrade();
      
      expect(result.trade).toBeDefined();
      expect(result.trade.id).toMatch(/^trade_\d+$/);
      expect(['ETH', 'BTC']).toContain(result.trade.from);
      expect(['ETH', 'BTC']).toContain(result.trade.to);
      expect(result.trade.from).not.toBe(result.trade.to);
      expect(result.trade.amountIn).toBeGreaterThan(0);
      expect(result.trade.amountOut).toBeGreaterThan(0);
      expect(result.trade.fee).toBeGreaterThan(0);
      expect(result.trade.slippage).toBeGreaterThanOrEqual(0);
      expect(result.trade.priceImpact).toBeGreaterThanOrEqual(0);
      expect(result.trade.timestamp).toBeInstanceOf(Date);
    });

    it('거래 실행 시 이벤트가 발생해야 한다', () => {
      const eventSpy = jest.spyOn(eventEmitter, 'emit');
      
      service.executeRandomTrade();
      
      expect(eventSpy).toHaveBeenCalledWith('trade.executed', expect.any(Object));
    });

    it('거래 결과에 풀 상태 정보가 포함되어야 한다', () => {
      const result = service.executeRandomTrade();
      
      expect(result.poolBefore).toBeDefined();
      expect(result.poolBefore.eth).toBe(1000);
      expect(result.poolBefore.btc).toBe(30000);
      expect(result.poolBefore.k).toBe(30000000);
      
      expect(result.poolAfter).toBeDefined();
      expect(result.poolAfter.k).toBe(30000000); // k는 유지되어야 함
    });

    it('거래 결과에 가격 정보가 포함되어야 한다', () => {
      const result = service.executeRandomTrade();
      
      expect(result.priceInfo).toBeDefined();
      expect(result.priceInfo.expectedRate).toBeGreaterThan(0);
      expect(result.priceInfo.actualRate).toBeGreaterThan(0);
      expect(result.priceInfo.slippage).toBeGreaterThanOrEqual(0);
    });
  });

  describe('특정 거래 실행', () => {
    beforeEach(() => {
      jest.spyOn(lpService, 'getPool').mockReturnValue({
        eth: 1000,
        btc: 30000,
        k: 30000000,
        feeRate: 0.003,
        userCount: 10,
        users: [],
        initialPoolValue: 2000,
        currentPoolValue: 2000,
        poolSizeRatio: 1,
        volatility: { eth: 0, btc: 0, overall: 0 },
        lastVolatilityUpdate: new Date(),
      });
      jest.spyOn(lpService, 'calculateFee').mockReturnValue(0.3);
    });

    it('ETH에서 BTC로 거래가 정상적으로 실행되어야 한다', () => {
      const result = service.executeTrade('ETH', 'BTC', 0.01);
      
      expect(result.trade.from).toBe('ETH');
      expect(result.trade.to).toBe('BTC');
      expect(result.trade.amountIn).toBeGreaterThan(0);
      expect(result.trade.amountOut).toBeGreaterThan(0);
    });

    it('BTC에서 ETH로 거래가 정상적으로 실행되어야 한다', () => {
      const result = service.executeTrade('BTC', 'ETH', 0.01);
      
      expect(result.trade.from).toBe('BTC');
      expect(result.trade.to).toBe('ETH');
      expect(result.trade.amountIn).toBeGreaterThan(0);
      expect(result.trade.amountOut).toBeGreaterThan(0);
    });

    it('거래량이 올바르게 계산되어야 한다', () => {
      const result = service.executeTrade('ETH', 'BTC', 0.01);
      
      // 거래량은 풀의 1% (0.01 * 1000 = 10 ETH)
      expect(result.trade.amountIn).toBeCloseTo(10, 1);
    });
  });

  describe('AMM 계산', () => {
    beforeEach(() => {
      jest.spyOn(lpService, 'getPool').mockReturnValue({
        eth: 1000,
        btc: 30000,
        k: 30000000,
        feeRate: 0.003,
        userCount: 10,
        users: [],
        initialPoolValue: 2000,
        currentPoolValue: 2000,
        poolSizeRatio: 1,
        volatility: { eth: 0, btc: 0, overall: 0 },
        lastVolatilityUpdate: new Date(),
      });
    });

    it('ETH에서 BTC로 AMM 계산이 정상적으로 수행되어야 한다', () => {
      const result = service['calculateAMM']('ETH', 'BTC', 10, { eth: 1000, btc: 30000, k: 30000000 });
      
      expect(result.amountOut).toBeGreaterThan(0);
      expect(result.slippage).toBeGreaterThanOrEqual(0);
      expect(result.priceImpact).toBeGreaterThanOrEqual(0);
    });

    it('BTC에서 ETH로 AMM 계산이 정상적으로 수행되어야 한다', () => {
      const result = service['calculateAMM']('BTC', 'ETH', 300, { eth: 1000, btc: 30000, k: 30000000 });
      
      expect(result.amountOut).toBeGreaterThan(0);
      expect(result.slippage).toBeGreaterThanOrEqual(0);
      expect(result.priceImpact).toBeGreaterThanOrEqual(0);
    });

    it('큰 거래량일 때 슬리피지가 증가해야 한다', () => {
      const smallTrade = service['calculateAMM']('ETH', 'BTC', 1, { eth: 1000, btc: 30000, k: 30000000 });
      const largeTrade = service['calculateAMM']('ETH', 'BTC', 100, { eth: 1000, btc: 30000, k: 30000000 });
      
      expect(largeTrade.slippage).toBeGreaterThan(smallTrade.slippage);
    });
  });

  describe('아비트라지 기회 처리', () => {
    it('아비트라지 기회 이벤트를 처리할 수 있어야 한다', () => {
      const opportunity: ArbitrageOpportunity = {
        opportunityId: 'test_arbitrage',
        timestamp: new Date(),
        poolPrice: 30,
        marketPrice: 25,
        difference: 5,
        percentage: 20,
        direction: 'buy_eth_sell_btc',
      };

      jest.spyOn(lpService, 'getPool').mockReturnValue({
        eth: 1000,
        btc: 30000,
        k: 30000000,
        feeRate: 0.003,
        userCount: 10,
        users: [],
        initialPoolValue: 2000,
        currentPoolValue: 2000,
        poolSizeRatio: 1,
        volatility: { eth: 0, btc: 0, overall: 0 },
        lastVolatilityUpdate: new Date(),
      });
      jest.spyOn(lpService, 'calculateFee').mockReturnValue(0.3);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      service.handleArbitrageOpportunity(opportunity);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('아비트라지 기회 감지')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('방향')
      );
    });
  });

  describe('아비트라지 거래 실행', () => {
    beforeEach(() => {
      jest.spyOn(lpService, 'getPool').mockReturnValue({
        eth: 1000,
        btc: 30000,
        k: 30000000,
        feeRate: 0.003,
        userCount: 10,
        users: [],
        initialPoolValue: 2000,
        currentPoolValue: 2000,
        poolSizeRatio: 1,
        volatility: { eth: 0, btc: 0, overall: 0 },
        lastVolatilityUpdate: new Date(),
      });
      jest.spyOn(lpService, 'calculateFee').mockReturnValue(0.3);
    });

    it('아비트라지 거래가 정상적으로 실행되어야 한다', () => {
      const opportunity: ArbitrageOpportunity = {
        opportunityId: 'test_arbitrage',
        timestamp: new Date(),
        poolPrice: 30,
        marketPrice: 25,
        difference: 5,
        percentage: 20,
        direction: 'buy_eth_sell_btc',
      };

      const result = service['executeArbitrageTrade'](opportunity);
      
      expect(result.trade).toBeDefined();
      expect(result.trade.id).toMatch(/^arbitrage_\d+$/);
      expect(result.trade.from).toBe('BTC');
      expect(result.trade.to).toBe('ETH');
      expect(result.trade.amountIn).toBeGreaterThan(0);
      expect(result.trade.amountOut).toBeGreaterThan(0);
    });

    it('아비트라지 거래 실행 시 이벤트가 발생해야 한다', () => {
      const opportunity: ArbitrageOpportunity = {
        opportunityId: 'test_arbitrage',
        timestamp: new Date(),
        poolPrice: 30,
        marketPrice: 25,
        difference: 5,
        percentage: 20,
        direction: 'buy_eth_sell_btc',
      };

      const eventSpy = jest.spyOn(eventEmitter, 'emit');
      
      service['executeArbitrageTrade'](opportunity);
      
      expect(eventSpy).toHaveBeenCalledWith('trade.executed', expect.any(Object));
    });

    it('아비트라지 거래량이 올바르게 계산되어야 한다', () => {
      const opportunity: ArbitrageOpportunity = {
        opportunityId: 'test_arbitrage',
        timestamp: new Date(),
        poolPrice: 30,
        marketPrice: 25,
        difference: 5,
        percentage: 20,
        direction: 'buy_eth_sell_btc',
      };

      const result = service['executeArbitrageTrade'](opportunity);
      
      // 아비트라지 거래량은 풀의 1-3% 범위
      const poolBtc = 30000;
      const expectedMin = poolBtc * 0.01; // 1%
      const expectedMax = poolBtc * 0.03; // 3%
      
      expect(result.trade.amountIn).toBeGreaterThanOrEqual(expectedMin);
      expect(result.trade.amountIn).toBeLessThanOrEqual(expectedMax);
    });
  });

  describe('아비트라지 기회 체크 및 실행', () => {
    beforeEach(() => {
      jest.spyOn(lpService, 'getPool').mockReturnValue({
        eth: 1000,
        btc: 30000,
        k: 30000000,
        feeRate: 0.003,
        userCount: 10,
        users: [],
        initialPoolValue: 2000,
        currentPoolValue: 2000,
        poolSizeRatio: 1,
        volatility: { eth: 0, btc: 0, overall: 0 },
        lastVolatilityUpdate: new Date(),
      });
      jest.spyOn(lpService, 'calculateFee').mockReturnValue(0.3);
    });

    it('아비트라지 기회가 없을 때 적절한 메시지를 반환해야 한다', () => {
      jest.spyOn(marketService, 'getCurrentPrice').mockReturnValue({
        eth: 2000,
        btc: 60000,
        ratio: 0.033,
        timestamp: new Date(),
      });

      const result = service.checkAndExecuteArbitrage();
      
      expect(result.message).toContain('아비트라지 기회가 없습니다');
      expect(result.opportunity).toBeUndefined();
      expect(result.trade).toBeUndefined();
    });

    it('아비트라지 기회가 있을 때 거래를 실행해야 한다', () => {
      jest.spyOn(marketService, 'getCurrentPrice').mockReturnValue({
        eth: 2000,
        btc: 50000, // BTC 가격을 낮춰서 차이 생성
        ratio: 0.04,
        timestamp: new Date(),
      });

      const result = service.checkAndExecuteArbitrage();
      
      expect(result.message).toContain('아비트라지 거래 실행 완료');
      expect(result.opportunity).toBeDefined();
      expect(result.trade).toBeDefined();
    });

    it('시장 가격 조회 실패 시 적절한 에러 처리가 되어야 한다', () => {
      jest.spyOn(marketService, 'getCurrentPrice').mockImplementation(() => {
        throw new Error('시장 가격 조회 실패');
      });

      expect(() => service.checkAndExecuteArbitrage()).not.toThrow();
      
      const result = service.checkAndExecuteArbitrage();
      expect(result.message).toContain('시장 가격 조회 중 오류가 발생했습니다');
    });
  });

  describe('풀 상태 계산', () => {
    it('ETH에서 BTC로 거래 후 풀 상태가 올바르게 계산되어야 한다', () => {
      const result = service['calculatePoolAfter'](
        'ETH',
        'BTC',
        10,
        300,
        { eth: 1000, btc: 30000, k: 30000000 }
      );
      
      expect(result.eth).toBe(1010);
      expect(result.btc).toBe(29700);
      expect(result.k).toBe(30000000);
    });

    it('BTC에서 ETH로 거래 후 풀 상태가 올바르게 계산되어야 한다', () => {
      const result = service['calculatePoolAfter'](
        'BTC',
        'ETH',
        300,
        10,
        { eth: 1000, btc: 30000, k: 30000000 }
      );
      
      expect(result.eth).toBe(990);
      expect(result.btc).toBe(30300);
      expect(result.k).toBe(30000000);
    });
  });
});
