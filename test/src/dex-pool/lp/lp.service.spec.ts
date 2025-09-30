import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { TradeExecutedEvent } from 'src/dex-pool/events/trade.events';
import { LpService } from 'src/dex-pool/lp/lp.service';
import { PriceChangeEvent } from 'src/dex-pool/lp/types/market.interface';

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

  describe('초기화', () => {
    it('서비스가 정상적으로 생성되어야 합니다', () => {
      expect(service).toBeDefined();
    });

    it('초기 풀 상태가 올바르게 설정되어야 합니다', () => {
      // Given: 서비스 초기화 후
      // When: 초기화되지 않은 풀 조회 시도
      // Then: 에러가 발생해야 함
      expect(() => service.getPool()).toThrow(
        '풀이 초기화되지 않았습니다. 먼저 POST /lp/init을 호출해주세요.',
      );
    });
  });

  describe('풀 초기화 (initLiquidity)', () => {
    it('풀을 올바르게 초기화해야 합니다', () => {
      // When: 풀 초기화 실행
      const pool = service.initLiquidity();

      // Then: 풀이 올바르게 초기화되어야 함
      expect(pool.eth).toBe(1000); // TARGET_ETH
      expect(pool.btc).toBe(30000); // TARGET_BTC
      expect(pool.k).toBe(30000000); // 1000 * 30000
      expect(pool.feeRate).toBe(0.003); // BASE_FEE_RATE
      expect(pool.userCount).toBe(10);
      expect(pool.users).toHaveLength(10);
      expect(pool.initialPoolValue).toBeGreaterThan(0);
      expect(pool.currentPoolValue).toBeGreaterThan(0);
      expect(pool.poolSizeRatio).toBe(1.0);
    });

    it('10명의 유저가 생성되어야 합니다', () => {
      // When: 풀 초기화 실행
      const pool = service.initLiquidity();

      // Then: 10명의 유저가 생성되어야 함
      expect(pool.users).toHaveLength(10);

      // 각 유저의 속성이 올바르게 설정되어야 함
      pool.users.forEach((user, index) => {
        expect(user.id).toBe(index + 1);
        expect(user.eth).toBeGreaterThanOrEqual(0);
        expect(user.btc).toBeGreaterThanOrEqual(0);
        expect(user.share).toBeGreaterThanOrEqual(0);
        expect(user.earnedEth).toBe(0);
        expect(user.earnedBtc).toBe(0);
        expect(user.governanceTokens).toBeGreaterThanOrEqual(0);
      });
    });

    it('유저들의 지분 합이 1에 가까워야 합니다', () => {
      // When: 풀 초기화 실행
      const pool = service.initLiquidity();

      // Then: 모든 유저의 지분 합이 1에 가까워야 함
      const totalShare = pool.users.reduce((sum, user) => sum + user.share, 0);
      expect(totalShare).toBeCloseTo(1, 2);
    });

    it('유저들의 ETH/BTC 비율이 1:30에 가까워야 합니다', () => {
      // When: 풀 초기화 실행
      const pool = service.initLiquidity();

      // Then: 각 유저의 ETH/BTC 비율이 1:30에 가까워야 함 (0으로 나누기 방지)
      pool.users.forEach((user) => {
        if (user.btc > 0) {
          const ratio = user.eth / user.btc;
          expect(ratio).toBeCloseTo(1 / 30, 3);
        }
      });
    });

    it('거버넌스 토큰이 지분 비율에 따라 분배되어야 합니다', () => {
      // When: 풀 초기화 실행
      const pool = service.initLiquidity();

      // Then: 거버넌스 토큰이 지분 비율에 따라 분배되어야 함
      pool.users.forEach((user) => {
        const expectedTokens = user.share * 100;
        expect(user.governanceTokens).toBeCloseTo(expectedTokens, 2);
      });
    });
  });

  describe('풀 상태 조회 (getPool)', () => {
    it('초기화되지 않은 풀 조회 시 에러가 발생해야 합니다', () => {
      // When & Then: 초기화되지 않은 풀 조회 시 에러 발생
      expect(() => service.getPool()).toThrow(
        '풀이 초기화되지 않았습니다. 먼저 POST /lp/init을 호출해주세요.',
      );
    });

    it('초기화된 풀의 상태를 올바르게 반환해야 합니다', () => {
      // Given: 풀 초기화
      const initializedPool = service.initLiquidity();

      // When: 풀 상태 조회
      const pool = service.getPool();

      // Then: 초기화된 풀과 동일한 상태를 반환해야 함
      expect(pool).toEqual(initializedPool);
    });
  });

  describe('랜덤 유저 추가 (addRandomUser)', () => {
    beforeEach(() => {
      // Given: 풀 초기화
      service.initLiquidity();
    });

    it('유저를 성공적으로 추가해야 합니다', () => {
      // Given: 초기 유저 수
      const initialUserCount = service.getPool().userCount;

      // When: 랜덤 유저 추가
      const pool = service.addRandomUser();

      // Then: 유저 수가 증가해야 함
      expect(pool.userCount).toBeGreaterThan(initialUserCount);
      expect(pool.users.length).toBeGreaterThan(initialUserCount);
    });

    it('풀의 총량이 증가해야 합니다', () => {
      // Given: 초기 풀 상태
      const initialPool = service.getPool();
      const initialEth = initialPool.eth;
      const initialBtc = initialPool.btc;

      // When: 랜덤 유저 추가
      const pool = service.addRandomUser();

      // Then: 풀의 총량이 증가해야 함
      expect(pool.eth).toBeGreaterThan(initialEth);
      expect(pool.btc).toBeGreaterThan(initialBtc);
    });

    it('k 값이 재계산되어야 합니다', () => {
      // Given: 초기 k 값
      const initialK = service.getPool().k;

      // When: 랜덤 유저 추가
      const pool = service.addRandomUser();

      // Then: k 값이 재계산되어야 함
      expect(pool.k).toBeCloseTo(pool.eth * pool.btc, 5);
      expect(pool.k).not.toBe(initialK);
    });

    it('모든 유저의 지분이 재계산되어야 합니다', () => {
      // When: 랜덤 유저 추가
      const pool = service.addRandomUser();

      // Then: 모든 유저의 지분 합이 1에 가까워야 함
      const totalShare = pool.users.reduce((sum, user) => sum + user.share, 0);
      expect(totalShare).toBeCloseTo(1, 2);
    });

    it('최대 30명까지 유저를 추가할 수 있어야 합니다', () => {
      // When: 충분히 많은 유저 추가 시도
      for (let i = 0; i < 25; i++) {
        try {
          service.addRandomUser();
        } catch (error) {
          // 30명에 도달하면 에러가 발생해야 함
          expect(error.message).toBe('최대 유저 수(30명)에 도달했습니다.');
          break;
        }
      }

      // Then: 30명이 되어야 함
      expect(service.getPool().userCount).toBe(30);
    });

    it('초기화되지 않은 풀에 유저 추가 시 에러가 발생해야 합니다', () => {
      // Given: 새로운 서비스 인스턴스 (초기화되지 않음)
      const newService = new LpService();

      // When & Then: 초기화되지 않은 풀에 유저 추가 시 에러 발생
      expect(() => newService.addRandomUser()).toThrow(
        '풀이 초기화되지 않았습니다. 먼저 POST /lp/init을 호출해주세요.',
      );
    });
  });

  describe('랜덤 유저 제거 (removeRandomUser)', () => {
    beforeEach(() => {
      // Given: 풀 초기화
      service.initLiquidity();
    });

    it('유저를 성공적으로 제거해야 합니다', () => {
      // Given: 초기 유저 수
      const initialUserCount = service.getPool().userCount;

      // When: 랜덤 유저 제거 시도
      try {
        const pool = service.removeRandomUser();
        // Then: 유저 수가 감소해야 함
        expect(pool.userCount).toBeLessThan(initialUserCount);
        expect(pool.users.length).toBeLessThan(initialUserCount);
      } catch (error) {
        // 10명에 도달하면 에러가 발생해야 함
        expect(error.message).toBe('최소 유저 수(10명)에 도달했습니다.');
      }
    });

    it('풀의 총량이 감소해야 합니다', () => {
      // Given: 초기 풀 상태
      const initialPool = service.getPool();
      const initialEth = initialPool.eth;
      const initialBtc = initialPool.btc;

      // When: 랜덤 유저 제거 시도
      try {
        const pool = service.removeRandomUser();
        // Then: 풀의 총량이 감소해야 함
        expect(pool.eth).toBeLessThan(initialEth);
        expect(pool.btc).toBeLessThan(initialBtc);
      } catch (error) {
        // 10명에 도달하면 에러가 발생해야 함
        expect(error.message).toBe('최소 유저 수(10명)에 도달했습니다.');
      }
    });

    it('k 값이 재계산되어야 합니다', () => {
      // Given: 초기 k 값
      const initialK = service.getPool().k;

      // When: 랜덤 유저 제거 시도
      try {
        const pool = service.removeRandomUser();
        // Then: k 값이 재계산되어야 함
        expect(pool.k).toBe(pool.eth * pool.btc);
        expect(pool.k).not.toBe(initialK);
      } catch (error) {
        // 10명에 도달하면 에러가 발생해야 함
        expect(error.message).toBe('최소 유저 수(10명)에 도달했습니다.');
      }
    });

    it('최소 10명까지 유저를 제거할 수 있어야 합니다', () => {
      // When: 10명까지 유저 제거 시도
      // Then: 에러가 발생해야 함 (최소 10명 유지)
      expect(() => service.removeRandomUser()).toThrow(
        '최소 유저 수(10명)에 도달했습니다.',
      );
    });

    it('초기화되지 않은 풀에서 유저 제거 시 에러가 발생해야 합니다', () => {
      // Given: 새로운 서비스 인스턴스 (초기화되지 않음)
      const newService = new LpService();

      // When & Then: 초기화되지 않은 풀에서 유저 제거 시 에러 발생
      expect(() => newService.removeRandomUser()).toThrow(
        '풀이 초기화되지 않았습니다. 먼저 POST /lp/init을 호출해주세요.',
      );
    });
  });

  describe('동적 수수료 계산 (calculateDynamicFee)', () => {
    beforeEach(() => {
      // Given: 풀 초기화
      service.initLiquidity();
    });

    it('기본 수수료율을 반환해야 합니다', () => {
      // When: 동적 수수료 계산
      const feeRate = service.calculateDynamicFee();

      // Then: 기본 수수료율이 반환되어야 함
      expect(feeRate).toBe(0.003); // BASE_FEE_RATE
    });

    it('풀 크기 변화에 따라 수수료가 조절되어야 합니다', () => {
      // Given: 풀 크기 변화 시뮬레이션을 위해 유저 추가
      service.addRandomUser();
      service.addRandomUser();

      // When: 동적 수수료 계산
      const feeRate = service.calculateDynamicFee();

      // Then: 수수료가 조절되어야 함
      expect(feeRate).toBeGreaterThanOrEqual(0.0005); // MIN_FEE_RATE
      expect(feeRate).toBeLessThanOrEqual(0.01); // MAX_FEE_RATE
    });

    it('초기화되지 않은 풀에서 수수료 계산 시 에러가 발생해야 합니다', () => {
      // Given: 새로운 서비스 인스턴스 (초기화되지 않음)
      const newService = new LpService();

      // When & Then: 초기화되지 않은 풀에서 수수료 계산 시 에러 발생
      expect(() => newService.calculateDynamicFee()).toThrow(
        '풀이 초기화되지 않았습니다. 먼저 POST /lp/init을 호출해주세요.',
      );
    });
  });

  describe('수수료 계산 (calculateFee)', () => {
    beforeEach(() => {
      // Given: 풀 초기화
      service.initLiquidity();
    });

    it('올바른 수수료를 계산해야 합니다', () => {
      // Given: 거래량
      const amountIn = 100;

      // When: 수수료 계산
      const fee = service.calculateFee(amountIn);

      // Then: 올바른 수수료가 계산되어야 함
      expect(fee).toBe(amountIn * 0.003); // amountIn * BASE_FEE_RATE
    });

    it('다양한 거래량에 대해 올바른 수수료를 계산해야 합니다', () => {
      // Given: 다양한 거래량들
      const amounts = [10, 50, 100, 500, 1000];

      amounts.forEach((amount) => {
        // When: 수수료 계산
        const fee = service.calculateFee(amount);

        // Then: 올바른 수수료가 계산되어야 함
        expect(fee).toBe(amount * 0.003);
      });
    });
  });

  describe('거래 이벤트 처리 (handleTradeExecuted)', () => {
    beforeEach(() => {
      // Given: 풀 초기화
      service.initLiquidity();
    });

    it('거래 이벤트를 올바르게 처리해야 합니다', () => {
      // Given: 거래 이벤트
      const tradeEvent: TradeExecutedEvent = {
        tradeId: 'test-trade-1',
        from: 'ETH',
        to: 'BTC',
        amountIn: 10,
        amountOut: 300,
        fee: 0.03,
        slippage: 0.5,
        priceImpact: 1.0,
        poolBefore: {
          eth: 1000,
          btc: 30000,
          k: 30000000,
        },
        poolAfter: {
          eth: 1010,
          btc: 29700,
          k: 30000000,
        },
      };

      // When: 거래 이벤트 처리
      service.handleTradeExecuted(tradeEvent);

      // Then: 풀 상태가 업데이트되어야 함
      const pool = service.getPool();
      expect(pool.eth).toBe(1010);
      expect(pool.btc).toBe(29700);
      expect(pool.k).toBe(30000000);
    });

    it('수수료가 유저들에게 분배되어야 합니다', () => {
      // Given: 거래 이벤트
      const tradeEvent: TradeExecutedEvent = {
        tradeId: 'test-trade-2',
        from: 'ETH',
        to: 'BTC',
        amountIn: 10,
        amountOut: 300,
        fee: 0.03,
        slippage: 0.5,
        priceImpact: 1.0,
        poolBefore: {
          eth: 1000,
          btc: 30000,
          k: 30000000,
        },
        poolAfter: {
          eth: 1010,
          btc: 29700,
          k: 30000000,
        },
      };

      // Given: 초기 수수료 수익
      const initialEarnedEth = service.getPool().users[0].earnedEth;

      // When: 거래 이벤트 처리
      service.handleTradeExecuted(tradeEvent);

      // Then: 수수료가 분배되어야 함
      const pool = service.getPool();
      const totalEarnedEth = pool.users.reduce(
        (sum, user) => sum + user.earnedEth,
        0,
      );
      expect(totalEarnedEth).toBeCloseTo(0.03, 3);
    });

    it('거버넌스 토큰이 분배되어야 합니다', () => {
      // Given: 거래 이벤트
      const tradeEvent: TradeExecutedEvent = {
        tradeId: 'test-trade-3',
        from: 'ETH',
        to: 'BTC',
        amountIn: 10,
        amountOut: 300,
        fee: 0.03,
        slippage: 0.5,
        priceImpact: 1.0,
        poolBefore: {
          eth: 1000,
          btc: 30000,
          k: 30000000,
        },
        poolAfter: {
          eth: 1010,
          btc: 29700,
          k: 30000000,
        },
      };

      // Given: 초기 거버넌스 토큰
      const initialTokens = service.getPool().users[0].governanceTokens;

      // When: 거래 이벤트 처리
      service.handleTradeExecuted(tradeEvent);

      // Then: 거버넌스 토큰이 증가해야 함
      const pool = service.getPool();
      const totalTokens = pool.users.reduce(
        (sum, user) => sum + user.governanceTokens,
        0,
      );
      expect(totalTokens).toBeGreaterThan(100); // 초기 100개 + 거래로 인한 추가 토큰
    });
  });

  describe('시장 가격 변동 이벤트 처리 (handleMarketPriceChange)', () => {
    beforeEach(() => {
      // Given: 풀 초기화
      service.initLiquidity();
    });

    it('가격 변동 이벤트를 올바르게 처리해야 합니다', () => {
      // Given: 가격 변동 이벤트
      const priceChangeEvent: PriceChangeEvent = {
        eventId: 'price-change-1',
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

      // When: 가격 변동 이벤트 처리
      service.handleMarketPriceChange(priceChangeEvent);

      // Then: 변동성 정보가 업데이트되어야 함
      const pool = service.getPool();
      expect(pool.volatility.eth).toBe(5.0);
      expect(pool.volatility.btc).toBe(5.0);
      expect(pool.volatility.overall).toBe(3.5);
      expect(pool.lastVolatilityUpdate).toBeInstanceOf(Date);
    });

    it('변동성에 따라 수수료가 재계산되어야 합니다', () => {
      // Given: 높은 변동성 이벤트
      const priceChangeEvent: PriceChangeEvent = {
        eventId: 'price-change-2',
        timestamp: new Date(),
        previousPrice: {
          eth: 2000,
          btc: 60000,
          ratio: 0.033,
          timestamp: new Date(),
        },
        currentPrice: {
          eth: 2200,
          btc: 66000,
          ratio: 0.033,
          timestamp: new Date(),
        },
        change: {
          eth: 10.0,
          btc: 10.0,
        },
        volatility: 8.0,
      };

      // Given: 초기 수수료율
      const initialFeeRate = service.getPool().feeRate;

      // When: 가격 변동 이벤트 처리
      service.handleMarketPriceChange(priceChangeEvent);

      // Then: 수수료율이 변경되어야 함
      const pool = service.getPool();
      expect(pool.feeRate).not.toBe(initialFeeRate);
      expect(pool.feeRate).toBeGreaterThanOrEqual(0.0005); // MIN_FEE_RATE
      expect(pool.feeRate).toBeLessThanOrEqual(0.01); // MAX_FEE_RATE
    });
  });

  describe('거버넌스 토큰 분배 (distributeTokensFromTrade)', () => {
    beforeEach(() => {
      // Given: 풀 초기화
      service.initLiquidity();
    });

    it('거래 수수료에 비례하여 토큰을 분배해야 합니다', () => {
      // Given: 거래 수수료
      const tradeFee = 0.1;

      // Given: 초기 토큰 총량
      const initialTotalTokens = service
        .getPool()
        .users.reduce((sum, user) => sum + user.governanceTokens, 0);

      // When: 토큰 분배
      service.distributeTokensFromTrade(tradeFee);

      // Then: 토큰이 증가해야 함
      const pool = service.getPool();
      const newTotalTokens = pool.users.reduce(
        (sum, user) => sum + user.governanceTokens,
        0,
      );
      const expectedIncrease = tradeFee * 10; // TOKEN_GENERATION_RATE
      expect(newTotalTokens - initialTotalTokens).toBeCloseTo(
        expectedIncrease,
        1,
      );
    });

    it('유저별 지분 비율에 따라 토큰이 분배되어야 합니다', () => {
      // Given: 거래 수수료
      const tradeFee = 0.1;

      // Given: 첫 번째 유저의 지분
      const firstUserShare = service.getPool().users[0].share;
      const firstUserInitialTokens =
        service.getPool().users[0].governanceTokens;

      // When: 토큰 분배
      service.distributeTokensFromTrade(tradeFee);

      // Then: 지분 비율에 따라 토큰이 분배되어야 함
      const pool = service.getPool();
      const firstUserNewTokens = pool.users[0].governanceTokens;
      const expectedIncrease = tradeFee * 10 * firstUserShare; // TOKEN_GENERATION_RATE * share
      expect(firstUserNewTokens - firstUserInitialTokens).toBeCloseTo(
        expectedIncrease,
        2,
      );
    });

    it('초기화되지 않은 풀에서 토큰 분배 시 에러가 발생해야 합니다', () => {
      // Given: 새로운 서비스 인스턴스 (초기화되지 않음)
      const newService = new LpService();

      // When & Then: 초기화되지 않은 풀에서 토큰 분배 시 에러 발생
      expect(() => newService.distributeTokensFromTrade(0.1)).toThrow(
        '풀이 초기화되지 않았습니다. 먼저 POST /lp/init을 호출해주세요.',
      );
    });
  });

  describe('유저 제거 로직 상세 테스트', () => {
    beforeEach(() => {
      // Given: 풀 초기화
      service.initLiquidity();
    });

    it('유저 제거 시 랜덤 인덱스 선택 로직을 테스트해야 합니다', () => {
      // Given: 초기 유저 수
      const initialUserCount = service.getPool().userCount;

      // When: 유저 제거 시도 (랜덤 로직 포함)
      try {
        const pool = service.removeRandomUser();
        // Then: 유저 수가 감소했는지 확인
        expect(pool.userCount).toBeLessThan(initialUserCount);
        expect(pool.users.length).toBeLessThan(initialUserCount);
      } catch (error) {
        // 10명에 도달하면 에러가 발생해야 함
        expect(error.message).toBe('최소 유저 수(10명)에 도달했습니다.');
      }
    });

    it('유저 제거 시 풀 총량이 정확히 감소해야 합니다', () => {
      // Given: 초기 풀 상태
      const initialPool = service.getPool();
      const initialEth = initialPool.eth;
      const initialBtc = initialPool.btc;

      // When: 유저 제거 시도
      try {
        const pool = service.removeRandomUser();
        // Then: 풀 총량이 감소해야 함
        expect(pool.eth).toBeLessThan(initialEth);
        expect(pool.btc).toBeLessThan(initialBtc);
      } catch (error) {
        // 10명에 도달하면 에러가 발생해야 함
        expect(error.message).toBe('최소 유저 수(10명)에 도달했습니다.');
      }
    });

    it('BTC 수수료 분배 로직을 테스트해야 합니다', () => {
      // Given: BTC 거래 이벤트
      const tradeEvent: TradeExecutedEvent = {
        tradeId: 'test-trade-btc',
        from: 'BTC',
        to: 'ETH',
        amountIn: 1000,
        amountOut: 30,
        fee: 0.03,
        slippage: 0.5,
        priceImpact: 1.0,
        poolBefore: {
          eth: 1000,
          btc: 30000,
          k: 30000000,
        },
        poolAfter: {
          eth: 1030,
          btc: 29000,
          k: 30000000,
        },
      };

      // When: 거래 이벤트 처리
      service.handleTradeExecuted(tradeEvent);

      // Then: BTC 수수료가 분배되어야 함
      const pool = service.getPool();
      const totalEarnedBtc = pool.users.reduce(
        (sum, user) => sum + user.earnedBtc,
        0,
      );
      expect(totalEarnedBtc).toBeCloseTo(0.03, 3);
    });

    it('유저 제거 시 랜덤 로직의 모든 경로를 테스트해야 합니다', () => {
      // Given: 15명의 유저가 있는 풀 (10명 초과)
      service.initLiquidity();
      // 5명 추가로 유저를 더 추가
      for (let i = 0; i < 5; i++) {
        service.addRandomUser();
      }

      const initialUserCount = service.getPool().userCount;
      expect(initialUserCount).toBeGreaterThan(10);

      // When: 유저 제거 (랜덤 로직 포함)
      const pool = service.removeRandomUser();

      // Then: 유저 수가 감소했는지 확인
      expect(pool.userCount).toBeLessThan(initialUserCount);
      expect(pool.users.length).toBeLessThan(initialUserCount);
    });

    it('유저 제거 시 풀 총량 업데이트 로직을 테스트해야 합니다', () => {
      // Given: 초기 풀 상태
      service.initLiquidity();
      const initialPool = service.getPool();
      const initialEth = initialPool.eth;
      const initialBtc = initialPool.btc;

      // When: 유저 제거 시도
      try {
        const pool = service.removeRandomUser();
        // Then: 풀 총량이 정확히 감소해야 함
        expect(pool.eth).toBeLessThan(initialEth);
        expect(pool.btc).toBeLessThan(initialBtc);

        // k 값이 재계산되어야 함
        expect(pool.k).toBe(pool.eth * pool.btc);
      } catch (error) {
        // 10명에 도달하면 에러가 발생해야 함
        expect(error.message).toBe('최소 유저 수(10명)에 도달했습니다.');
      }
    });

    it('유저 제거 후 지분 재계산 로직을 테스트해야 합니다', () => {
      // Given: 초기 풀 상태
      service.initLiquidity();
      const initialPool = service.getPool();
      const initialTotalShares = initialPool.users.reduce(
        (sum, user) => sum + user.share,
        0,
      );

      // When: 유저 제거 시도
      try {
        const pool = service.removeRandomUser();
        // Then: 남은 유저들의 지분 합이 1에 가까워야 함
        const totalShares = pool.users.reduce(
          (sum, user) => sum + user.share,
          0,
        );
        expect(totalShares).toBeCloseTo(1, 3);
      } catch (error) {
        // 10명에 도달하면 에러가 발생해야 함
        expect(error.message).toBe('최소 유저 수(10명)에 도달했습니다.');
      }
    });
  });
});
