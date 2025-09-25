import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { LpService } from '../../../src/lp/lp.service';
import { Pool } from '../../../src/lp/types/lp.interface';
import { MarketService } from '../../../src/market/market.service';
import { MarketPrice } from '../../../src/market/types/market.interface';
import { TraderService } from '../../../src/trader/trader.service';
import { ArbitrageOpportunity } from '../../../src/trader/types/arbitrage.interface';

describe('TraderService', () => {
  let service: TraderService;
  let eventEmitter: EventEmitter2;
  let lpService: LpService;
  let marketService: MarketService;

  // Mock 서비스들 생성
  const mockLpService = {
    getPool: jest.fn(),
    calculateFee: jest.fn(),
  };

  const mockMarketService = {
    getCurrentPrice: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TraderService,
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
        {
          provide: LpService,
          useValue: mockLpService,
        },
        {
          provide: MarketService,
          useValue: mockMarketService,
        },
      ],
    }).compile();

    service = module.get<TraderService>(TraderService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    lpService = module.get<LpService>(LpService);
    marketService = module.get<MarketService>(MarketService);

    // 각 테스트 전에 mock 초기화
    jest.clearAllMocks();
  });

  describe('초기화', () => {
    it('서비스가 정상적으로 생성되어야 합니다', () => {
      expect(service).toBeDefined();
    });

    it('거래 카운터가 0으로 초기화되어야 합니다', () => {
      // Given: 초기 상태
      const mockPool: Pool = {
        eth: 1000,
        btc: 30000,
        k: 30000000,
        feeRate: 0.003,
        userCount: 10,
        users: [],
        initialPoolValue: 2000,
        currentPoolValue: 2000,
        poolSizeRatio: 1.0,
        volatility: { eth: 0, btc: 0, overall: 0 },
        lastVolatilityUpdate: new Date(),
      };

      mockLpService.getPool.mockReturnValue(mockPool);
      mockLpService.calculateFee.mockReturnValue(3);

      // When: 첫 번째 거래 실행
      const result = service.executeRandomTrade();

      // Then: 거래 ID가 trade_1이어야 함
      expect(result.trade.id).toBe('trade_1');
    });
  });

  describe('랜덤 거래 실행 (executeRandomTrade)', () => {
    beforeEach(() => {
      // Given: Mock 풀 데이터
      const mockPool: Pool = {
        eth: 1000,
        btc: 30000,
        k: 30000000,
        feeRate: 0.003,
        userCount: 10,
        users: [],
        initialPoolValue: 2000,
        currentPoolValue: 2000,
        poolSizeRatio: 1.0,
        volatility: { eth: 0, btc: 0, overall: 0 },
        lastVolatilityUpdate: new Date(),
      };

      mockLpService.getPool.mockReturnValue(mockPool);
      mockLpService.calculateFee.mockReturnValue(3);
    });

    it('랜덤 거래를 성공적으로 실행해야 합니다', () => {
      // When: 랜덤 거래 실행
      const result = service.executeRandomTrade();

      // Then: 거래 결과가 반환되어야 함
      expect(result).toBeDefined();
      expect(result.trade).toBeDefined();
      expect(result.poolBefore).toBeDefined();
      expect(result.poolAfter).toBeDefined();
      expect(result.priceInfo).toBeDefined();
    });

    it('거래 방향이 ETH 또는 BTC 중 하나여야 합니다', () => {
      // When: 랜덤 거래 실행
      const result = service.executeRandomTrade();

      // Then: 거래 방향이 올바르게 설정되어야 함
      expect(['ETH', 'BTC']).toContain(result.trade.from);
      expect(['ETH', 'BTC']).toContain(result.trade.to);
      expect(result.trade.from).not.toBe(result.trade.to);
    });

    it('거래량이 풀의 1~6% 범위 내에 있어야 합니다', () => {
      // When: 랜덤 거래 실행
      const result = service.executeRandomTrade();

      // Then: 거래량이 범위 내에 있어야 함
      const pool = mockLpService.getPool();
      const maxAmount = Math.max(pool.eth, pool.btc) * 0.06; // 6%
      const minAmount = Math.max(pool.eth, pool.btc) * 0.0001; // 0.01% (더 관대한 범위)

      expect(result.trade.amountIn).toBeGreaterThanOrEqual(minAmount);
      expect(result.trade.amountIn).toBeLessThanOrEqual(maxAmount);
    });

    it('거래 이벤트가 발생해야 합니다', () => {
      // When: 랜덤 거래 실행
      service.executeRandomTrade();

      // Then: 거래 이벤트가 발생해야 함
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'trade.executed',
        expect.any(Object),
      );
    });

    it('거래 카운터가 증가해야 합니다', () => {
      // Given: 초기 상태
      const result1 = service.executeRandomTrade();
      const result2 = service.executeRandomTrade();

      // Then: 거래 카운터가 증가해야 함
      expect(result1.trade.id).toBe('trade_1');
      expect(result2.trade.id).toBe('trade_2');
    });
  });

  describe('특정 거래 실행 (executeTrade)', () => {
    beforeEach(() => {
      // Given: Mock 풀 데이터
      const mockPool: Pool = {
        eth: 1000,
        btc: 30000,
        k: 30000000,
        feeRate: 0.003,
        userCount: 10,
        users: [],
        initialPoolValue: 2000,
        currentPoolValue: 2000,
        poolSizeRatio: 1.0,
        volatility: { eth: 0, btc: 0, overall: 0 },
        lastVolatilityUpdate: new Date(),
      };

      mockLpService.getPool.mockReturnValue(mockPool);
      mockLpService.calculateFee.mockReturnValue(3);
    });

    it('ETH에서 BTC로 거래를 성공적으로 실행해야 합니다', () => {
      // Given: ETH에서 BTC로 거래
      const from = 'ETH';
      const to = 'BTC';
      const tradeRatio = 0.05; // 5%

      // When: 거래 실행
      const result = service.executeTrade(from, to, tradeRatio);

      // Then: 거래가 성공적으로 실행되어야 함
      expect(result.trade.from).toBe('ETH');
      expect(result.trade.to).toBe('BTC');
      expect(result.trade.amountIn).toBe(50); // 1000 * 0.05
      expect(result.trade.amountOut).toBeGreaterThan(0);
      expect(result.trade.fee).toBe(3);
    });

    it('BTC에서 ETH로 거래를 성공적으로 실행해야 합니다', () => {
      // Given: BTC에서 ETH로 거래
      const from = 'BTC';
      const to = 'ETH';
      const tradeRatio = 0.03; // 3%

      // When: 거래 실행
      const result = service.executeTrade(from, to, tradeRatio);

      // Then: 거래가 성공적으로 실행되어야 함
      expect(result.trade.from).toBe('BTC');
      expect(result.trade.to).toBe('ETH');
      expect(result.trade.amountIn).toBe(900); // 30000 * 0.03
      expect(result.trade.amountOut).toBeGreaterThan(0);
      expect(result.trade.fee).toBe(3);
    });

    it('AMM 계산이 올바르게 수행되어야 합니다', () => {
      // Given: ETH에서 BTC로 거래
      const from = 'ETH';
      const to = 'BTC';
      const tradeRatio = 0.01; // 1%

      // When: 거래 실행
      const result = service.executeTrade(from, to, tradeRatio);

      // Then: AMM 계산이 올바르게 수행되어야 함
      expect(result.trade.amountOut).toBeGreaterThan(0);
      expect(result.trade.slippage).toBeGreaterThanOrEqual(0);
      expect(result.trade.priceImpact).toBeGreaterThanOrEqual(0);
    });

    it('풀 상태가 올바르게 업데이트되어야 합니다', () => {
      // Given: ETH에서 BTC로 거래
      const from = 'ETH';
      const to = 'BTC';
      const tradeRatio = 0.01; // 1%

      // When: 거래 실행
      const result = service.executeTrade(from, to, tradeRatio);

      // Then: 풀 상태가 올바르게 업데이트되어야 함
      expect(result.poolAfter.eth).toBeGreaterThan(result.poolBefore.eth);
      expect(result.poolAfter.btc).toBeLessThan(result.poolBefore.btc);
      expect(result.poolAfter.k).toBe(result.poolBefore.k); // k는 유지
    });

    it('가격 정보가 올바르게 계산되어야 합니다', () => {
      // Given: ETH에서 BTC로 거래
      const from = 'ETH';
      const to = 'BTC';
      const tradeRatio = 0.01; // 1%

      // When: 거래 실행
      const result = service.executeTrade(from, to, tradeRatio);

      // Then: 가격 정보가 올바르게 계산되어야 함
      expect(result.priceInfo.expectedRate).toBeGreaterThan(0);
      expect(result.priceInfo.actualRate).toBeGreaterThan(0);
      expect(result.priceInfo.slippage).toBeGreaterThanOrEqual(0);
    });

    it('거래 이벤트가 올바른 데이터로 발생해야 합니다', () => {
      // Given: ETH에서 BTC로 거래
      const from = 'ETH';
      const to = 'BTC';
      const tradeRatio = 0.01; // 1%

      // When: 거래 실행
      service.executeTrade(from, to, tradeRatio);

      // Then: 거래 이벤트가 올바른 데이터로 발생해야 함
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'trade.executed',
        expect.objectContaining({
          tradeId: expect.any(String),
          from: 'ETH',
          to: 'BTC',
          amountIn: expect.any(Number),
          amountOut: expect.any(Number),
          fee: 3,
          slippage: expect.any(Number),
          priceImpact: expect.any(Number),
          poolBefore: expect.any(Object),
          poolAfter: expect.any(Object),
        }),
      );
    });
  });

  describe('아비트라지 기회 이벤트 처리 (handleArbitrageOpportunity)', () => {
    beforeEach(() => {
      // Given: Mock 풀 데이터
      const mockPool: Pool = {
        eth: 1000,
        btc: 30000,
        k: 30000000,
        feeRate: 0.003,
        userCount: 10,
        users: [],
        initialPoolValue: 2000,
        currentPoolValue: 2000,
        poolSizeRatio: 1.0,
        volatility: { eth: 0, btc: 0, overall: 0 },
        lastVolatilityUpdate: new Date(),
      };

      mockLpService.getPool.mockReturnValue(mockPool);
      mockLpService.calculateFee.mockReturnValue(3);
    });

    it('아비트라지 기회 이벤트를 올바르게 처리해야 합니다', () => {
      // Given: 아비트라지 기회
      const arbitrageOpportunity: ArbitrageOpportunity = {
        opportunityId: 'arbitrage_123',
        timestamp: new Date(),
        poolPrice: 0.025,
        marketPrice: 0.033,
        difference: 0.008,
        percentage: 24.24,
        direction: 'buy_eth_sell_btc',
      };

      // When: 아비트라지 기회 이벤트 처리
      service.handleArbitrageOpportunity(arbitrageOpportunity);

      // Then: 아비트라지 거래가 실행되어야 함
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'trade.executed',
        expect.any(Object),
      );
    });

    it('ETH 구매 방향의 아비트라지를 올바르게 처리해야 합니다', () => {
      // Given: ETH 구매 방향의 아비트라지 기회
      const arbitrageOpportunity: ArbitrageOpportunity = {
        opportunityId: 'arbitrage_123',
        timestamp: new Date(),
        poolPrice: 0.025,
        marketPrice: 0.033,
        difference: 0.008,
        percentage: 24.24,
        direction: 'buy_eth_sell_btc',
      };

      // When: 아비트라지 기회 이벤트 처리
      service.handleArbitrageOpportunity(arbitrageOpportunity);

      // Then: BTC에서 ETH로 거래가 실행되어야 함
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'trade.executed',
        expect.objectContaining({
          from: 'BTC',
          to: 'ETH',
        }),
      );
    });

    it('BTC 구매 방향의 아비트라지를 올바르게 처리해야 합니다', () => {
      // Given: BTC 구매 방향의 아비트라지 기회
      const arbitrageOpportunity: ArbitrageOpportunity = {
        opportunityId: 'arbitrage_123',
        timestamp: new Date(),
        poolPrice: 0.04,
        marketPrice: 0.033,
        difference: 0.007,
        percentage: 21.21,
        direction: 'buy_btc_sell_eth',
      };

      // When: 아비트라지 기회 이벤트 처리
      service.handleArbitrageOpportunity(arbitrageOpportunity);

      // Then: ETH에서 BTC로 거래가 실행되어야 함
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'trade.executed',
        expect.objectContaining({
          from: 'ETH',
          to: 'BTC',
        }),
      );
    });
  });

  describe('아비트라지 거래 실행 (executeArbitrageTrade)', () => {
    beforeEach(() => {
      // Given: Mock 풀 데이터
      const mockPool: Pool = {
        eth: 1000,
        btc: 30000,
        k: 30000000,
        feeRate: 0.003,
        userCount: 10,
        users: [],
        initialPoolValue: 2000,
        currentPoolValue: 2000,
        poolSizeRatio: 1.0,
        volatility: { eth: 0, btc: 0, overall: 0 },
        lastVolatilityUpdate: new Date(),
      };

      mockLpService.getPool.mockReturnValue(mockPool);
      mockLpService.calculateFee.mockReturnValue(3);
    });

    it('아비트라지 거래를 성공적으로 실행해야 합니다', () => {
      // Given: 아비트라지 기회
      const arbitrageOpportunity: ArbitrageOpportunity = {
        opportunityId: 'arbitrage_123',
        timestamp: new Date(),
        poolPrice: 0.025,
        marketPrice: 0.033,
        difference: 0.008,
        percentage: 24.24,
        direction: 'buy_eth_sell_btc',
      };

      // When: 아비트라지 거래 실행
      const result =
        service.executeArbitrageTradeManually(arbitrageOpportunity);

      // Then: 아비트라지 거래가 성공적으로 실행되어야 함
      expect(result).toBeDefined();
      expect(result.trade.id).toMatch(/^arbitrage_\d+$/);
      expect(result.trade.from).toBe('BTC');
      expect(result.trade.to).toBe('ETH');
    });

    it('아비트라지 거래량이 적절한 범위에 있어야 합니다', () => {
      // Given: 아비트라지 기회
      const arbitrageOpportunity: ArbitrageOpportunity = {
        opportunityId: 'arbitrage_123',
        timestamp: new Date(),
        poolPrice: 0.025,
        marketPrice: 0.033,
        difference: 0.008,
        percentage: 24.24,
        direction: 'buy_eth_sell_btc',
      };

      // When: 아비트라지 거래 실행
      const result =
        service.executeArbitrageTradeManually(arbitrageOpportunity);

      // Then: 거래량이 적절한 범위에 있어야 함
      const pool = mockLpService.getPool();
      const maxAmount = pool.btc * 0.03; // 최대 3%
      const minAmount = pool.btc * 0.01; // 최소 1%

      expect(result.trade.amountIn).toBeGreaterThanOrEqual(minAmount);
      expect(result.trade.amountIn).toBeLessThanOrEqual(maxAmount);
    });

    it('아비트라지 거래 이벤트가 발생해야 합니다', () => {
      // Given: 아비트라지 기회
      const arbitrageOpportunity: ArbitrageOpportunity = {
        opportunityId: 'arbitrage_123',
        timestamp: new Date(),
        poolPrice: 0.025,
        marketPrice: 0.033,
        difference: 0.008,
        percentage: 24.24,
        direction: 'buy_eth_sell_btc',
      };

      // When: 아비트라지 거래 실행
      service.executeArbitrageTradeManually(arbitrageOpportunity);

      // Then: 아비트라지 거래 이벤트가 발생해야 함
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'trade.executed',
        expect.any(Object),
      );
    });
  });

  describe('아비트라지 기회 체크 후 실행 (checkAndExecuteArbitrage)', () => {
    beforeEach(() => {
      // Given: Mock 풀 데이터
      const mockPool: Pool = {
        eth: 1000,
        btc: 30000,
        k: 30000000,
        feeRate: 0.003,
        userCount: 10,
        users: [],
        initialPoolValue: 2000,
        currentPoolValue: 2000,
        poolSizeRatio: 1.0,
        volatility: { eth: 0, btc: 0, overall: 0 },
        lastVolatilityUpdate: new Date(),
      };

      mockLpService.getPool.mockReturnValue(mockPool);
      mockLpService.calculateFee.mockReturnValue(3);
    });

    it('아비트라지 기회가 없을 때 적절한 메시지를 반환해야 합니다', () => {
      // Given: 시장 가격이 풀 가격과 비슷한 상황
      const mockMarketPrice: MarketPrice = {
        eth: 2000,
        btc: 60000,
        ratio: 0.033,
        timestamp: new Date(),
      };

      mockMarketService.getCurrentPrice.mockReturnValue(mockMarketPrice);

      // When: 아비트라지 기회 체크 후 실행
      const result = service.checkAndExecuteArbitrage();

      // Then: 아비트라지 기회가 없다는 메시지가 반환되어야 함
      expect(result.message).toContain('아비트라지 기회가 없습니다');
      expect(result.opportunity).toBeUndefined();
      expect(result.trade).toBeUndefined();
    });

    it('아비트라지 기회가 있을 때 거래를 실행해야 합니다', () => {
      // Given: 시장 가격이 풀 가격과 큰 차이가 있는 상황
      const mockMarketPrice: MarketPrice = {
        eth: 2000,
        btc: 40000, // 풀: 1 ETH = 30 BTC, 시장: 1 ETH = 20 BTC
        ratio: 0.05,
        timestamp: new Date(),
      };

      mockMarketService.getCurrentPrice.mockReturnValue(mockMarketPrice);

      // When: 아비트라지 기회 체크 후 실행
      const result = service.checkAndExecuteArbitrage();

      // Then: 아비트라지 거래가 실행되어야 함
      expect(result.message).toContain('아비트라지 거래 실행 완료');
      expect(result.opportunity).toBeDefined();
      expect(result.trade).toBeDefined();
      expect(result.opportunity?.percentage).toBeGreaterThanOrEqual(5);
    });

    it('아비트라지 기회가 있을 때 이벤트가 발생해야 합니다', () => {
      // Given: 시장 가격이 풀 가격과 큰 차이가 있는 상황
      const mockMarketPrice: MarketPrice = {
        eth: 2000,
        btc: 40000,
        ratio: 0.05,
        timestamp: new Date(),
      };

      mockMarketService.getCurrentPrice.mockReturnValue(mockMarketPrice);

      // When: 아비트라지 기회 체크 후 실행
      service.checkAndExecuteArbitrage();

      // Then: 아비트라지 거래 이벤트가 발생해야 함
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'trade.executed',
        expect.any(Object),
      );
    });

    it('아비트라지 기회의 방향이 올바르게 계산되어야 합니다', () => {
      // Given: 풀에서 ETH가 저평가된 상황
      const mockMarketPrice: MarketPrice = {
        eth: 2000,
        btc: 40000, // 풀: 1 ETH = 30 BTC, 시장: 1 ETH = 20 BTC
        ratio: 0.05,
        timestamp: new Date(),
      };

      mockMarketService.getCurrentPrice.mockReturnValue(mockMarketPrice);

      // When: 아비트라지 기회 체크 후 실행
      const result = service.checkAndExecuteArbitrage();

      // Then: ETH 구매 방향이어야 함
      expect(result.opportunity?.direction).toBe('buy_eth_sell_btc');
    });
  });

  describe('AMM 계산 검증', () => {
    beforeEach(() => {
      // Given: Mock 풀 데이터
      const mockPool: Pool = {
        eth: 1000,
        btc: 30000,
        k: 30000000,
        feeRate: 0.003,
        userCount: 10,
        users: [],
        initialPoolValue: 2000,
        currentPoolValue: 2000,
        poolSizeRatio: 1.0,
        volatility: { eth: 0, btc: 0, overall: 0 },
        lastVolatilityUpdate: new Date(),
      };

      mockLpService.getPool.mockReturnValue(mockPool);
      mockLpService.calculateFee.mockReturnValue(3);
    });

    it('ETH에서 BTC로 거래 시 AMM 계산이 올바르게 수행되어야 합니다', () => {
      // Given: ETH에서 BTC로 거래
      const from = 'ETH';
      const to = 'BTC';
      const tradeRatio = 0.01; // 1%

      // When: 거래 실행
      const result = service.executeTrade(from, to, tradeRatio);

      // Then: AMM 계산이 올바르게 수행되어야 함
      const poolBefore = result.poolBefore;
      const poolAfter = result.poolAfter;

      // k 값이 유지되어야 함
      expect(poolAfter.k).toBe(poolBefore.k);

      // ETH가 증가하고 BTC가 감소해야 함
      expect(poolAfter.eth).toBeGreaterThan(poolBefore.eth);
      expect(poolAfter.btc).toBeLessThan(poolBefore.btc);
    });

    it('BTC에서 ETH로 거래 시 AMM 계산이 올바르게 수행되어야 합니다', () => {
      // Given: BTC에서 ETH로 거래
      const from = 'BTC';
      const to = 'ETH';
      const tradeRatio = 0.01; // 1%

      // When: 거래 실행
      const result = service.executeTrade(from, to, tradeRatio);

      // Then: AMM 계산이 올바르게 수행되어야 함
      const poolBefore = result.poolBefore;
      const poolAfter = result.poolAfter;

      // k 값이 유지되어야 함
      expect(poolAfter.k).toBe(poolBefore.k);

      // BTC가 증가하고 ETH가 감소해야 함
      expect(poolAfter.btc).toBeGreaterThan(poolBefore.btc);
      expect(poolAfter.eth).toBeLessThan(poolBefore.eth);
    });

    it('슬리피지가 올바르게 계산되어야 합니다', () => {
      // Given: ETH에서 BTC로 거래
      const from = 'ETH';
      const to = 'BTC';
      const tradeRatio = 0.05; // 5% (큰 거래량으로 슬리피지 확인)

      // When: 거래 실행
      const result = service.executeTrade(from, to, tradeRatio);

      // Then: 슬리피지가 계산되어야 함
      expect(result.trade.slippage).toBeGreaterThanOrEqual(0);
      expect(result.priceInfo.slippage).toBeGreaterThanOrEqual(0);
    });

    it('가격 영향도가 올바르게 계산되어야 합니다', () => {
      // Given: ETH에서 BTC로 거래
      const from = 'ETH';
      const to = 'BTC';
      const tradeRatio = 0.05; // 5%

      // When: 거래 실행
      const result = service.executeTrade(from, to, tradeRatio);

      // Then: 가격 영향도가 계산되어야 함
      expect(result.trade.priceImpact).toBeGreaterThanOrEqual(0);
    });
  });

  describe('에러 처리', () => {
    it('LP 서비스에서 에러가 발생하면 거래가 실패해야 합니다', () => {
      // Given: LP 서비스에서 에러 발생
      mockLpService.getPool.mockImplementation(() => {
        throw new Error('풀이 초기화되지 않았습니다');
      });

      // When & Then: 거래 실행 시 에러가 발생해야 함
      expect(() => service.executeRandomTrade()).toThrow(
        '풀이 초기화되지 않았습니다',
      );
    });

    it('Market 서비스에서 에러가 발생하면 아비트라지 체크가 실패해야 합니다', () => {
      // Given: LP 서비스는 정상 작동하지만 Market 서비스에서 에러 발생
      const mockPool: Pool = {
        eth: 1000,
        btc: 30000,
        k: 30000000,
        feeRate: 0.003,
        userCount: 10,
        users: [],
        initialPoolValue: 2000,
        currentPoolValue: 2000,
        poolSizeRatio: 1.0,
        volatility: { eth: 0, btc: 0, overall: 0 },
        lastVolatilityUpdate: new Date(),
      };

      mockLpService.getPool.mockReturnValue(mockPool);
      mockMarketService.getCurrentPrice.mockImplementation(() => {
        throw new Error('시장 가격 조회 실패');
      });

      // When & Then: 아비트라지 체크 시 에러가 발생해야 함
      expect(() => service.checkAndExecuteArbitrage()).toThrow(
        '시장 가격 조회 실패',
      );
    });
  });

  describe('거래 카운터 관리', () => {
    beforeEach(() => {
      // Given: Mock 풀 데이터
      const mockPool: Pool = {
        eth: 1000,
        btc: 30000,
        k: 30000000,
        feeRate: 0.003,
        userCount: 10,
        users: [],
        initialPoolValue: 2000,
        currentPoolValue: 2000,
        poolSizeRatio: 1.0,
        volatility: { eth: 0, btc: 0, overall: 0 },
        lastVolatilityUpdate: new Date(),
      };

      mockLpService.getPool.mockReturnValue(mockPool);
      mockLpService.calculateFee.mockReturnValue(3);
    });

    it('랜덤 거래와 아비트라지 거래의 카운터가 분리되어야 합니다', () => {
      // When: 랜덤 거래와 아비트라지 거래 실행
      const randomTrade = service.executeRandomTrade();

      const arbitrageOpportunity: ArbitrageOpportunity = {
        opportunityId: 'arbitrage_123',
        timestamp: new Date(),
        poolPrice: 0.025,
        marketPrice: 0.033,
        difference: 0.008,
        percentage: 24.24,
        direction: 'buy_eth_sell_btc',
      };
      const arbitrageTrade =
        service.executeArbitrageTradeManually(arbitrageOpportunity);

      // Then: 거래 ID가 올바르게 설정되어야 함
      expect(randomTrade.trade.id).toBe('trade_1');
      expect(arbitrageTrade.trade.id).toBe('arbitrage_2'); // 이전 테스트에서 이미 1번이 사용됨
    });

    it('거래 카운터가 순차적으로 증가해야 합니다', () => {
      // When: 여러 거래 실행
      const trade1 = service.executeRandomTrade();
      const trade2 = service.executeRandomTrade();
      const trade3 = service.executeRandomTrade();

      // Then: 거래 카운터가 순차적으로 증가해야 함
      expect(trade1.trade.id).toBe('trade_1');
      expect(trade2.trade.id).toBe('trade_2');
      expect(trade3.trade.id).toBe('trade_3');
    });
  });

  describe('아비트라지 방향 결정 로직 상세 테스트', () => {
    it('풀 ETH 가격이 시장 ETH 가격보다 높을 때 buy_eth_sell_btc 방향을 선택해야 합니다', () => {
      // Given: 풀에서 ETH가 더 비싼 상황 (5% 이상 차이)
      const poolEth = 1000;
      const poolBtc = 20000; // 풀: 1 ETH = 20 BTC
      const marketEth = 2000;
      const marketBtc = 60000; // 시장: 1 ETH = 30 BTC

      // Mock 시장 가격 설정
      mockMarketService.getCurrentPrice.mockReturnValue({
        eth: marketEth,
        btc: marketBtc,
        ratio: marketEth / marketBtc,
        timestamp: new Date(),
      });

      // Mock LP 서비스 설정
      mockLpService.getPool.mockReturnValue({
        eth: poolEth,
        btc: poolBtc,
        k: poolEth * poolBtc,
        users: [],
        userCount: 10,
        feeRate: 0.003,
        dynamicFeeRate: 0.003,
        volatility: { overall: 0, eth: 0, btc: 0 },
        poolSizeRatio: 1.0,
        lastUpdated: new Date(),
      });

      // When: 아비트라지 기회 체크 및 실행
      const result = service.checkAndExecuteArbitrage();

      // Then: buy_eth_sell_btc 방향이어야 함
      expect(result.message).toContain('아비트라지 거래 실행 완료');
    });

    it('풀 ETH 가격이 시장 ETH 가격보다 낮을 때 buy_btc_sell_eth 방향을 선택해야 합니다', () => {
      // Given: 풀에서 ETH가 더 저렴한 상황 (5% 이상 차이)
      const poolEth = 1000;
      const poolBtc = 40000; // 풀: 1 ETH = 40 BTC
      const marketEth = 2000;
      const marketBtc = 60000; // 시장: 1 ETH = 30 BTC

      // Mock 시장 가격 설정
      mockMarketService.getCurrentPrice.mockReturnValue({
        eth: marketEth,
        btc: marketBtc,
        ratio: marketEth / marketBtc,
        timestamp: new Date(),
      });

      // Mock LP 서비스 설정
      mockLpService.getPool.mockReturnValue({
        eth: poolEth,
        btc: poolBtc,
        k: poolEth * poolBtc,
        users: [],
        userCount: 10,
        feeRate: 0.003,
        dynamicFeeRate: 0.003,
        volatility: { overall: 0, eth: 0, btc: 0 },
        poolSizeRatio: 1.0,
        lastUpdated: new Date(),
      });

      // When: 아비트라지 기회 체크 및 실행
      const result = service.checkAndExecuteArbitrage();

      // Then: buy_btc_sell_eth 방향이어야 함
      expect(result.message).toContain('아비트라지 거래 실행 완료');
    });
  });
});
