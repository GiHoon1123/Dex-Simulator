import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LpService } from './lp.service';
import { TradeExecutedEvent } from '../common/events/trade.events';
import { PriceChangeEvent } from './types/market.interface';

describe('LpService', () => {
  let service: LpService;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LpService,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<LpService>(LpService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  it('서비스가 정상적으로 생성되어야 한다', () => {
    expect(service).toBeDefined();
  });

  describe('풀 초기화', () => {
    it('초기화되지 않은 풀 상태를 확인할 수 있어야 한다', () => {
      const pool = service.getPool();
      
      expect(pool.eth).toBe(0);
      expect(pool.btc).toBe(0);
      expect(pool.k).toBe(0);
      expect(pool.userCount).toBe(0);
      expect(pool.users).toEqual([]);
    });

    it('풀 초기화가 정상적으로 수행되어야 한다', () => {
      const pool = service.initLiquidity();
      
      expect(pool.eth).toBe(1000);
      expect(pool.btc).toBe(30000);
      expect(pool.k).toBe(30000000);
      expect(pool.userCount).toBe(10);
      expect(pool.users).toHaveLength(10);
      expect(pool.feeRate).toBe(0.003);
      expect(pool.initialPoolValue).toBeGreaterThan(0);
      expect(pool.currentPoolValue).toBeGreaterThan(0);
      expect(pool.poolSizeRatio).toBe(1);
    });

    it('초기화 시 모든 유저의 지분 합이 1이어야 한다', () => {
      const pool = service.initLiquidity();
      const totalShare = pool.users.reduce((sum, user) => sum + user.share, 0);
      
      expect(totalShare).toBeCloseTo(1, 5);
    });

    it('초기화 시 모든 유저가 거버넌스 토큰을 받아야 한다', () => {
      const pool = service.initLiquidity();
      
      pool.users.forEach(user => {
        expect(user.governanceTokens).toBeGreaterThan(0);
        expect(user.earnedEth).toBe(0);
        expect(user.earnedBtc).toBe(0);
      });
    });

    it('초기화 시 변동성 정보가 초기화되어야 한다', () => {
      const pool = service.initLiquidity();
      
      expect(pool.volatility.eth).toBe(0);
      expect(pool.volatility.btc).toBe(0);
      expect(pool.volatility.overall).toBe(0);
      expect(pool.lastVolatilityUpdate).toBeInstanceOf(Date);
    });
  });

  describe('유저 관리', () => {
    beforeEach(() => {
      service.initLiquidity();
    });

    it('랜덤 유저를 추가할 수 있어야 한다', () => {
      const initialUserCount = service.getPool().userCount;
      
      service.addRandomUser();
      
      const newUserCount = service.getPool().userCount;
      expect(newUserCount).toBe(initialUserCount + 1);
    });

    it('유저 추가 시 지분이 재계산되어야 한다', () => {
      const initialTotalShare = service.getPool().users.reduce((sum, user) => sum + user.share, 0);
      
      service.addRandomUser();
      
      const newTotalShare = service.getPool().users.reduce((sum, user) => sum + user.share, 0);
      expect(newTotalShare).toBeCloseTo(1, 5);
    });

    it('최대 유저 수를 초과하지 않아야 한다', () => {
      // 최대 30명까지 유저 추가
      for (let i = 0; i < 25; i++) {
        service.addRandomUser();
      }
      
      const userCount = service.getPool().userCount;
      expect(userCount).toBeLessThanOrEqual(30);
    });

    it('랜덤 유저를 제거할 수 있어야 한다', () => {
      const initialUserCount = service.getPool().userCount;
      
      service.removeRandomUser();
      
      const newUserCount = service.getPool().userCount;
      expect(newUserCount).toBe(initialUserCount - 1);
    });

    it('최소 유저 수를 유지해야 한다', () => {
      // 최소 10명까지 유저 제거
      for (let i = 0; i < 5; i++) {
        service.removeRandomUser();
      }
      
      const userCount = service.getPool().userCount;
      expect(userCount).toBeGreaterThanOrEqual(10);
    });

    it('유저 제거 시 지분이 재계산되어야 한다', () => {
      const initialTotalShare = service.getPool().users.reduce((sum, user) => sum + user.share, 0);
      
      service.removeRandomUser();
      
      const newTotalShare = service.getPool().users.reduce((sum, user) => sum + user.share, 0);
      expect(newTotalShare).toBeCloseTo(1, 5);
    });
  });

  describe('거래 처리', () => {
    beforeEach(() => {
      service.initLiquidity();
    });

    it('거래 실행 이벤트를 처리할 수 있어야 한다', () => {
      const tradeEvent: TradeExecutedEvent = {
        tradeId: 'test_trade_1',
        from: 'ETH',
        to: 'BTC',
        amountIn: 10,
        amountOut: 300,
        fee: 0.03,
        slippage: 1.5,
        priceImpact: 1.0,
        poolBefore: { eth: 1000, btc: 30000, k: 30000000 },
        poolAfter: { eth: 1010, btc: 29700, k: 30000000 },
      };

      const initialPool = service.getPool();
      
      service.handleTradeExecuted(tradeEvent);
      
      const updatedPool = service.getPool();
      expect(updatedPool.eth).toBe(tradeEvent.poolAfter.eth);
      expect(updatedPool.btc).toBe(tradeEvent.poolAfter.btc);
      expect(updatedPool.k).toBe(tradeEvent.poolAfter.k);
    });

    it('거래 후 수수료가 유저들에게 분배되어야 한다', () => {
      const tradeEvent: TradeExecutedEvent = {
        tradeId: 'test_trade_1',
        from: 'ETH',
        to: 'BTC',
        amountIn: 10,
        amountOut: 300,
        fee: 0.03,
        slippage: 1.5,
        priceImpact: 1.0,
        poolBefore: { eth: 1000, btc: 30000, k: 30000000 },
        poolAfter: { eth: 1010, btc: 29700, k: 30000000 },
      };

      const initialEarnedEth = service.getPool().users[0].earnedEth;
      
      service.handleTradeExecuted(tradeEvent);
      
      const updatedEarnedEth = service.getPool().users[0].earnedEth;
      expect(updatedEarnedEth).toBeGreaterThan(initialEarnedEth);
    });

    it('거래 후 거버넌스 토큰이 발행되어야 한다', () => {
      const tradeEvent: TradeExecutedEvent = {
        tradeId: 'test_trade_1',
        from: 'ETH',
        to: 'BTC',
        amountIn: 10,
        amountOut: 300,
        fee: 0.03,
        slippage: 1.5,
        priceImpact: 1.0,
        poolBefore: { eth: 1000, btc: 30000, k: 30000000 },
        poolAfter: { eth: 1010, btc: 29700, k: 30000000 },
      };

      const initialTokens = service.getPool().users[0].governanceTokens;
      
      service.handleTradeExecuted(tradeEvent);
      
      const updatedTokens = service.getPool().users[0].governanceTokens;
      expect(updatedTokens).toBeGreaterThan(initialTokens);
    });
  });

  describe('수수료 계산', () => {
    beforeEach(() => {
      service.initLiquidity();
    });

    it('기본 수수료율로 수수료를 계산할 수 있어야 한다', () => {
      const fee = service.calculateFee(100);
      expect(fee).toBe(0.3); // 100 * 0.003
    });

    it('동적 수수료가 계산되어야 한다', () => {
      const initialFeeRate = service.getPool().feeRate;
      
      service.calculateDynamicFee();
      
      const updatedFeeRate = service.getPool().feeRate;
      expect(updatedFeeRate).toBeGreaterThanOrEqual(0.0005); // 최소 수수료
      expect(updatedFeeRate).toBeLessThanOrEqual(0.01); // 최대 수수료
    });
  });

  describe('시장 가격 변동 처리', () => {
    beforeEach(() => {
      service.initLiquidity();
    });

    it('시장 가격 변동 이벤트를 처리할 수 있어야 한다', () => {
      const priceChangeEvent: PriceChangeEvent = {
        eventId: 'test_price_change',
        timestamp: new Date(),
        previousPrice: { eth: 2000, btc: 60000, ratio: 0.033, timestamp: new Date() },
        currentPrice: { eth: 2100, btc: 61000, ratio: 0.034, timestamp: new Date() },
        change: { eth: 5, btc: 1.67 },
        volatility: 3.5,
      };

      service.handleMarketPriceChange(priceChangeEvent);
      
      const pool = service.getPool();
      expect(pool.volatility.eth).toBe(5);
      expect(pool.volatility.btc).toBe(1.67);
      expect(pool.volatility.overall).toBe(3.5);
      expect(pool.lastVolatilityUpdate).toBeInstanceOf(Date);
    });

    it('가격 변동 시 동적 수수료가 재계산되어야 한다', () => {
      const initialFeeRate = service.getPool().feeRate;
      
      const priceChangeEvent: PriceChangeEvent = {
        eventId: 'test_price_change',
        timestamp: new Date(),
        previousPrice: { eth: 2000, btc: 60000, ratio: 0.033, timestamp: new Date() },
        currentPrice: { eth: 2100, btc: 61000, ratio: 0.034, timestamp: new Date() },
        change: { eth: 5, btc: 1.67 },
        volatility: 3.5,
      };

      service.handleMarketPriceChange(priceChangeEvent);
      
      const updatedFeeRate = service.getPool().feeRate;
      expect(updatedFeeRate).not.toBe(initialFeeRate);
    });
  });

  describe('에러 처리', () => {
    it('초기화되지 않은 풀에서 거래를 시도하면 에러가 발생해야 한다', () => {
      expect(() => {
        service.calculateFee(100);
      }).toThrow('풀이 초기화되지 않았습니다. 먼저 POST /lp/init을 호출해주세요.');
    });

    it('초기화되지 않은 풀에서 동적 수수료를 계산하면 에러가 발생해야 한다', () => {
      expect(() => {
        service.calculateDynamicFee();
      }).toThrow('풀이 초기화되지 않았습니다. 먼저 POST /lp/init을 호출해주세요.');
    });
  });

  describe('지분 재계산', () => {
    beforeEach(() => {
      service.initLiquidity();
    });

    it('지분 재계산 후 모든 유저의 지분 합이 1이어야 한다', () => {
      service['recalculateShares']();
      
      const totalShare = service.getPool().users.reduce((sum, user) => sum + user.share, 0);
      expect(totalShare).toBeCloseTo(1, 5);
    });

    it('지분 재계산 후 모든 유저의 지분이 0 이상이어야 한다', () => {
      service['recalculateShares']();
      
      service.getPool().users.forEach(user => {
        expect(user.share).toBeGreaterThanOrEqual(0);
      });
    });
  });
});
