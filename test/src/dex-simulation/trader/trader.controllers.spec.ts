import { Test, TestingModule } from '@nestjs/testing';
import { TraderController } from 'src/dex-simulation/trader/trader.controllers';
import { TraderService } from 'src/dex-simulation/trader/trader.service';
import { TradeResult } from 'src/dex-simulation/trader/types/trade.interface';

describe('TraderController', () => {
  let controller: TraderController;
  let service: TraderService;

  // Mock TraderService 생성
  const mockTraderService = {
    executeRandomTrade: jest.fn(),
    checkAndExecuteArbitrage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TraderController],
      providers: [
        {
          provide: TraderService,
          useValue: mockTraderService,
        },
      ],
    }).compile();

    controller = module.get<TraderController>(TraderController);
    service = module.get<TraderService>(TraderService);

    // 각 테스트 전에 mock 초기화
    jest.clearAllMocks();
  });

  describe('랜덤 거래 실행 (executeRandomTrade)', () => {
    it('랜덤 거래를 성공적으로 실행해야 합니다', () => {
      // Given: Mock 거래 결과
      const mockTradeResult: TradeResult = {
        trade: {
          id: 'trade_1',
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

      // Given: 서비스 메서드 Mock 설정
      mockTraderService.executeRandomTrade.mockReturnValue(mockTradeResult);

      // When: 랜덤 거래 실행
      const result = controller.executeRandomTrade();

      // Then: 서비스 메서드가 호출되고 결과가 반환되어야 함
      expect(service.executeRandomTrade).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockTradeResult);
    });

    it('서비스에서 에러가 발생하면 컨트롤러에서도 에러가 발생해야 합니다', () => {
      // Given: 서비스에서 에러 발생
      const errorMessage = '랜덤 거래 실행 실패';
      mockTraderService.executeRandomTrade.mockImplementation(() => {
        throw new Error(errorMessage);
      });

      // When & Then: 에러가 발생해야 함
      expect(() => controller.executeRandomTrade()).toThrow(errorMessage);
      expect(service.executeRandomTrade).toHaveBeenCalledTimes(1);
    });

    it('올바른 TradeResult 타입을 반환해야 합니다', () => {
      // Given: Mock 거래 결과
      const mockTradeResult: TradeResult = {
        trade: {
          id: 'trade_1',
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

      // Given: 서비스 메서드 Mock 설정
      mockTraderService.executeRandomTrade.mockReturnValue(mockTradeResult);

      // When: 랜덤 거래 실행
      const result = controller.executeRandomTrade();

      // Then: 올바른 타입이 반환되어야 함
      expect(result).toHaveProperty('trade');
      expect(result).toHaveProperty('poolBefore');
      expect(result).toHaveProperty('poolAfter');
      expect(result).toHaveProperty('priceInfo');

      expect(result.trade).toHaveProperty('id');
      expect(result.trade).toHaveProperty('from');
      expect(result.trade).toHaveProperty('to');
      expect(result.trade).toHaveProperty('amountIn');
      expect(result.trade).toHaveProperty('amountOut');
      expect(result.trade).toHaveProperty('fee');
      expect(result.trade).toHaveProperty('slippage');
      expect(result.trade).toHaveProperty('priceImpact');
      expect(result.trade).toHaveProperty('timestamp');

      expect(result.poolBefore).toHaveProperty('eth');
      expect(result.poolBefore).toHaveProperty('btc');
      expect(result.poolBefore).toHaveProperty('k');

      expect(result.poolAfter).toHaveProperty('eth');
      expect(result.poolAfter).toHaveProperty('btc');
      expect(result.poolAfter).toHaveProperty('k');

      expect(result.priceInfo).toHaveProperty('expectedRate');
      expect(result.priceInfo).toHaveProperty('actualRate');
      expect(result.priceInfo).toHaveProperty('slippage');
    });

    it('거래 방향이 ETH 또는 BTC 중 하나여야 합니다', () => {
      // Given: Mock 거래 결과
      const mockTradeResult: TradeResult = {
        trade: {
          id: 'trade_1',
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

      // Given: 서비스 메서드 Mock 설정
      mockTraderService.executeRandomTrade.mockReturnValue(mockTradeResult);

      // When: 랜덤 거래 실행
      const result = controller.executeRandomTrade();

      // Then: 거래 방향이 올바르게 설정되어야 함
      expect(['ETH', 'BTC']).toContain(result.trade.from);
      expect(['ETH', 'BTC']).toContain(result.trade.to);
      expect(result.trade.from).not.toBe(result.trade.to);
    });
  });

  describe('아비트라지 거래 실행 (executeArbitrage)', () => {
    it('아비트라지 기회가 있을 때 거래를 성공적으로 실행해야 합니다', () => {
      // Given: Mock 아비트라지 결과
      const mockArbitrageResult = {
        message: '아비트라지 거래 실행 완료! 차이: 24.24%',
        opportunity: {
          opportunityId: 'manual_arbitrage_1234567890',
          timestamp: new Date(),
          poolPrice: 0.025,
          marketPrice: 0.033,
          difference: 0.008,
          percentage: 24.24,
          direction: 'buy_eth_sell_btc' as const,
        },
        trade: {
          trade: {
            id: 'arbitrage_1',
            from: 'BTC',
            to: 'ETH',
            amountIn: 300,
            amountOut: 12,
            fee: 0.9,
            slippage: 0.2,
            priceImpact: 0.5,
            timestamp: new Date(),
          },
          poolBefore: {
            eth: 1000,
            btc: 30000,
            k: 30000000,
          },
          poolAfter: {
            eth: 988,
            btc: 30300,
            k: 30000000,
          },
          priceInfo: {
            expectedRate: 30,
            actualRate: 30.1,
            slippage: 0.2,
          },
        },
      };

      // Given: 서비스 메서드 Mock 설정
      mockTraderService.checkAndExecuteArbitrage.mockReturnValue(
        mockArbitrageResult,
      );

      // When: 아비트라지 거래 실행
      const result = controller.executeArbitrageTrade();

      // Then: 서비스 메서드가 호출되고 결과가 반환되어야 함
      expect(service.checkAndExecuteArbitrage).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockArbitrageResult);
    });

    it('아비트라지 기회가 없을 때 적절한 메시지를 반환해야 합니다', () => {
      // Given: 아비트라지 기회가 없는 결과
      const mockNoArbitrageResult = {
        message: '아비트라지 기회가 없습니다. 현재 차이: 2.5% (최소 5% 필요)',
      };

      // Given: 서비스 메서드 Mock 설정
      mockTraderService.checkAndExecuteArbitrage.mockReturnValue(
        mockNoArbitrageResult,
      );

      // When: 아비트라지 거래 실행
      const result = controller.executeArbitrageTrade();

      // Then: 아비트라지 기회가 없다는 메시지가 반환되어야 함
      expect(service.checkAndExecuteArbitrage).toHaveBeenCalledTimes(1);
      expect(result.message).toContain('아비트라지 기회가 없습니다');
      expect(result.opportunity).toBeUndefined();
      expect(result.trade).toBeUndefined();
    });

    it('서비스에서 에러가 발생하면 컨트롤러에서도 에러가 발생해야 합니다', () => {
      // Given: 서비스에서 에러 발생
      const errorMessage = '아비트라지 거래 실행 실패';
      mockTraderService.checkAndExecuteArbitrage.mockImplementation(() => {
        throw new Error(errorMessage);
      });

      // When & Then: 에러가 발생해야 함
      expect(() => controller.executeArbitrageTrade()).toThrow(errorMessage);
      expect(service.checkAndExecuteArbitrage).toHaveBeenCalledTimes(1);
    });

    it('올바른 응답 형식을 반환해야 합니다', () => {
      // Given: Mock 아비트라지 결과
      const mockArbitrageResult = {
        message: '아비트라지 거래 실행 완료! 차이: 24.24%',
        opportunity: {
          opportunityId: 'manual_arbitrage_1234567890',
          timestamp: new Date(),
          poolPrice: 0.025,
          marketPrice: 0.033,
          difference: 0.008,
          percentage: 24.24,
          direction: 'buy_eth_sell_btc' as const,
        },
        trade: {
          trade: {
            id: 'arbitrage_1',
            from: 'BTC',
            to: 'ETH',
            amountIn: 300,
            amountOut: 12,
            fee: 0.9,
            slippage: 0.2,
            priceImpact: 0.5,
            timestamp: new Date(),
          },
          poolBefore: {
            eth: 1000,
            btc: 30000,
            k: 30000000,
          },
          poolAfter: {
            eth: 988,
            btc: 30300,
            k: 30000000,
          },
          priceInfo: {
            expectedRate: 30,
            actualRate: 30.1,
            slippage: 0.2,
          },
        },
      };

      // Given: 서비스 메서드 Mock 설정
      mockTraderService.checkAndExecuteArbitrage.mockReturnValue(
        mockArbitrageResult,
      );

      // When: 아비트라지 거래 실행
      const result = controller.executeArbitrageTrade();

      // Then: 올바른 응답 형식이 반환되어야 함
      expect(result).toHaveProperty('message');
      expect(typeof result.message).toBe('string');

      if (result.opportunity) {
        expect(result.opportunity).toHaveProperty('opportunityId');
        expect(result.opportunity).toHaveProperty('timestamp');
        expect(result.opportunity).toHaveProperty('poolPrice');
        expect(result.opportunity).toHaveProperty('marketPrice');
        expect(result.opportunity).toHaveProperty('difference');
        expect(result.opportunity).toHaveProperty('percentage');
        expect(result.opportunity).toHaveProperty('direction');
        expect(['buy_eth_sell_btc', 'buy_btc_sell_eth']).toContain(
          result.opportunity.direction,
        );
      }

      if (result.trade) {
        expect(result.trade).toHaveProperty('trade');
        expect(result.trade).toHaveProperty('poolBefore');
        expect(result.trade).toHaveProperty('poolAfter');
        expect(result.trade).toHaveProperty('priceInfo');
      }
    });

    it('아비트라지 기회의 방향이 올바르게 설정되어야 합니다', () => {
      // Given: ETH 구매 방향의 아비트라지 결과
      const mockArbitrageResult = {
        message: '아비트라지 거래 실행 완료! 차이: 24.24%',
        opportunity: {
          opportunityId: 'manual_arbitrage_1234567890',
          timestamp: new Date(),
          poolPrice: 0.025,
          marketPrice: 0.033,
          difference: 0.008,
          percentage: 24.24,
          direction: 'buy_eth_sell_btc' as const,
        },
        trade: {
          trade: {
            id: 'arbitrage_1',
            from: 'BTC',
            to: 'ETH',
            amountIn: 300,
            amountOut: 12,
            fee: 0.9,
            slippage: 0.2,
            priceImpact: 0.5,
            timestamp: new Date(),
          },
          poolBefore: {
            eth: 1000,
            btc: 30000,
            k: 30000000,
          },
          poolAfter: {
            eth: 988,
            btc: 30300,
            k: 30000000,
          },
          priceInfo: {
            expectedRate: 30,
            actualRate: 30.1,
            slippage: 0.2,
          },
        },
      };

      // Given: 서비스 메서드 Mock 설정
      mockTraderService.checkAndExecuteArbitrage.mockReturnValue(
        mockArbitrageResult,
      );

      // When: 아비트라지 거래 실행
      const result = controller.executeArbitrageTrade();

      // Then: 아비트라지 방향이 올바르게 설정되어야 함
      expect(result.opportunity?.direction).toBe('buy_eth_sell_btc');
      expect(result.trade?.trade.from).toBe('BTC');
      expect(result.trade?.trade.to).toBe('ETH');
    });
  });

  describe('컨트롤러 생성자', () => {
    it('TraderService가 올바르게 주입되어야 합니다', () => {
      // Then: 컨트롤러가 정의되어야 함
      expect(controller).toBeDefined();
      expect(service).toBeDefined();
    });
  });

  describe('API 응답 형식', () => {
    it('모든 메서드가 올바른 타입을 반환해야 합니다', () => {
      // Given: Mock 데이터들
      const mockTradeResult: TradeResult = {
        trade: {
          id: 'trade_1',
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

      const mockArbitrageResult = {
        message: '아비트라지 거래 실행 완료! 차이: 24.24%',
        opportunity: {
          opportunityId: 'manual_arbitrage_1234567890',
          timestamp: new Date(),
          poolPrice: 0.025,
          marketPrice: 0.033,
          difference: 0.008,
          percentage: 24.24,
          direction: 'buy_eth_sell_btc' as const,
        },
        trade: mockTradeResult,
      };

      // Given: 모든 서비스 메서드 Mock 설정
      mockTraderService.executeRandomTrade.mockReturnValue(mockTradeResult);
      mockTraderService.checkAndExecuteArbitrage.mockReturnValue(
        mockArbitrageResult,
      );

      // When & Then: 모든 메서드가 올바른 타입을 반환해야 함
      expect(controller.executeRandomTrade()).toEqual(mockTradeResult);
      expect(controller.executeArbitrageTrade()).toEqual(mockArbitrageResult);
    });
  });

  describe('에러 처리', () => {
    it('서비스에서 발생하는 모든 에러를 올바르게 전파해야 합니다', () => {
      // Given: 다양한 에러 메시지들
      const errorMessages = [
        '랜덤 거래 실행 실패',
        '아비트라지 거래 실행 실패',
        '풀이 초기화되지 않았습니다',
        '시장 가격 조회 실패',
        '예상치 못한 에러가 발생했습니다',
      ];

      errorMessages.forEach((errorMessage) => {
        // Given: 각 메서드에 대해 에러 Mock 설정
        mockTraderService.executeRandomTrade.mockImplementation(() => {
          throw new Error(errorMessage);
        });
        mockTraderService.checkAndExecuteArbitrage.mockImplementation(() => {
          throw new Error(errorMessage);
        });

        // When & Then: 모든 메서드에서 에러가 전파되어야 함
        expect(() => controller.executeRandomTrade()).toThrow(errorMessage);
        expect(() => controller.executeArbitrageTrade()).toThrow(errorMessage);
      });
    });
  });

  describe('서비스 메서드 호출 검증', () => {
    it('각 메서드가 정확히 한 번씩 호출되어야 합니다', () => {
      // Given: Mock 데이터들
      const mockTradeResult: TradeResult = {
        trade: {
          id: 'trade_1',
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

      const mockArbitrageResult = {
        message: '아비트라지 거래 실행 완료! 차이: 24.24%',
        opportunity: {
          opportunityId: 'manual_arbitrage_1234567890',
          timestamp: new Date(),
          poolPrice: 0.025,
          marketPrice: 0.033,
          difference: 0.008,
          percentage: 24.24,
          direction: 'buy_eth_sell_btc' as const,
        },
        trade: mockTradeResult,
      };

      // Given: 모든 서비스 메서드 Mock 설정
      mockTraderService.executeRandomTrade.mockReturnValue(mockTradeResult);
      mockTraderService.checkAndExecuteArbitrage.mockReturnValue(
        mockArbitrageResult,
      );

      // When: 모든 컨트롤러 메서드 호출
      controller.executeRandomTrade();
      controller.executeArbitrageTrade();

      // Then: 각 서비스 메서드가 정확히 한 번씩 호출되어야 함
      expect(service.executeRandomTrade).toHaveBeenCalledTimes(1);
      expect(service.checkAndExecuteArbitrage).toHaveBeenCalledTimes(1);
    });
  });

  describe('거래 데이터 검증', () => {
    it('거래 결과의 수치 데이터가 올바른 타입이어야 합니다', () => {
      // Given: Mock 거래 결과
      const mockTradeResult: TradeResult = {
        trade: {
          id: 'trade_1',
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

      // Given: 서비스 메서드 Mock 설정
      mockTraderService.executeRandomTrade.mockReturnValue(mockTradeResult);

      // When: 랜덤 거래 실행
      const result = controller.executeRandomTrade();

      // Then: 수치 데이터가 올바른 타입이어야 함
      expect(typeof result.trade.amountIn).toBe('number');
      expect(typeof result.trade.amountOut).toBe('number');
      expect(typeof result.trade.fee).toBe('number');
      expect(typeof result.trade.slippage).toBe('number');
      expect(typeof result.trade.priceImpact).toBe('number');

      expect(typeof result.poolBefore.eth).toBe('number');
      expect(typeof result.poolBefore.btc).toBe('number');
      expect(typeof result.poolBefore.k).toBe('number');

      expect(typeof result.poolAfter.eth).toBe('number');
      expect(typeof result.poolAfter.btc).toBe('number');
      expect(typeof result.poolAfter.k).toBe('number');

      expect(typeof result.priceInfo.expectedRate).toBe('number');
      expect(typeof result.priceInfo.actualRate).toBe('number');
      expect(typeof result.priceInfo.slippage).toBe('number');
    });
  });
});
