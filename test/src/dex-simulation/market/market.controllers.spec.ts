import { Test, TestingModule } from '@nestjs/testing';
import { MarketController } from 'src/dex-simulation/market/market.controllers';
import { MarketService } from 'src/dex-simulation/market/market.service';
import {
  MarketPrice,
  MarketStatus,
  PriceChangeEvent,
} from 'src/dex-simulation/market/types/market.interface';

describe('MarketController', () => {
  let controller: MarketController;
  let service: MarketService;

  // Mock MarketService 생성
  const mockMarketService = {
    getCurrentPrice: jest.fn(),
    simulatePriceChange: jest.fn(),
    getMarketStatus: jest.fn(),
    checkAndEmitArbitrageOpportunity: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MarketController],
      providers: [
        {
          provide: MarketService,
          useValue: mockMarketService,
        },
      ],
    }).compile();

    controller = module.get<MarketController>(MarketController);
    service = module.get<MarketService>(MarketService);

    // 각 테스트 전에 mock 초기화
    jest.clearAllMocks();
  });

  describe('현재 시장 가격 조회 (getCurrentPrice)', () => {
    it('현재 시장 가격을 성공적으로 조회해야 합니다', () => {
      // Given: Mock 가격 데이터
      const mockPrice: MarketPrice = {
        eth: 2000,
        btc: 60000,
        ratio: 0.033,
        timestamp: new Date(),
      };

      // Given: 서비스 메서드 Mock 설정
      mockMarketService.getCurrentPrice.mockReturnValue(mockPrice);

      // When: 현재 가격 조회
      const result = controller.getCurrentPrice();

      // Then: 서비스 메서드가 호출되고 결과가 반환되어야 함
      expect(service.getCurrentPrice).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockPrice);
    });

    it('서비스에서 에러가 발생하면 컨트롤러에서도 에러가 발생해야 합니다', () => {
      // Given: 서비스에서 에러 발생
      const errorMessage = '가격 조회 실패';
      mockMarketService.getCurrentPrice.mockImplementation(() => {
        throw new Error(errorMessage);
      });

      // When & Then: 에러가 발생해야 함
      expect(() => controller.getCurrentPrice()).toThrow(errorMessage);
      expect(service.getCurrentPrice).toHaveBeenCalledTimes(1);
    });

    it('올바른 MarketPrice 타입을 반환해야 합니다', () => {
      // Given: Mock 가격 데이터
      const mockPrice: MarketPrice = {
        eth: 2100,
        btc: 63000,
        ratio: 0.033,
        timestamp: new Date('2023-01-01T00:00:00Z'),
      };

      // Given: 서비스 메서드 Mock 설정
      mockMarketService.getCurrentPrice.mockReturnValue(mockPrice);

      // When: 현재 가격 조회
      const result = controller.getCurrentPrice();

      // Then: 올바른 타입이 반환되어야 함
      expect(result).toHaveProperty('eth');
      expect(result).toHaveProperty('btc');
      expect(result).toHaveProperty('ratio');
      expect(result).toHaveProperty('timestamp');
      expect(typeof result.eth).toBe('number');
      expect(typeof result.btc).toBe('number');
      expect(typeof result.ratio).toBe('number');
      expect(result.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('가격 변동 시뮬레이션 (simulatePriceChange)', () => {
    it('가격 변동 시뮬레이션을 성공적으로 실행해야 합니다', () => {
      // Given: Mock 가격 변동 이벤트
      const mockPriceChangeEvent: PriceChangeEvent = {
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

      // Given: 서비스 메서드 Mock 설정
      mockMarketService.simulatePriceChange.mockReturnValue(
        mockPriceChangeEvent,
      );

      // When: 가격 변동 시뮬레이션 실행
      const result = controller.simulatePriceChange();

      // Then: 서비스 메서드가 호출되고 결과가 반환되어야 함
      expect(service.simulatePriceChange).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockPriceChangeEvent);
    });

    it('서비스에서 에러가 발생하면 컨트롤러에서도 에러가 발생해야 합니다', () => {
      // Given: 서비스에서 에러 발생
      const errorMessage = '가격 변동 시뮬레이션 실패';
      mockMarketService.simulatePriceChange.mockImplementation(() => {
        throw new Error(errorMessage);
      });

      // When & Then: 에러가 발생해야 함
      expect(() => controller.simulatePriceChange()).toThrow(errorMessage);
      expect(service.simulatePriceChange).toHaveBeenCalledTimes(1);
    });

    it('올바른 PriceChangeEvent 타입을 반환해야 합니다', () => {
      // Given: Mock 가격 변동 이벤트
      const mockPriceChangeEvent: PriceChangeEvent = {
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

      // Given: 서비스 메서드 Mock 설정
      mockMarketService.simulatePriceChange.mockReturnValue(
        mockPriceChangeEvent,
      );

      // When: 가격 변동 시뮬레이션 실행
      const result = controller.simulatePriceChange();

      // Then: 올바른 타입이 반환되어야 함
      expect(result).toHaveProperty('eventId');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('previousPrice');
      expect(result).toHaveProperty('currentPrice');
      expect(result).toHaveProperty('change');
      expect(result).toHaveProperty('volatility');
      expect(typeof result.eventId).toBe('string');
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.previousPrice).toHaveProperty('eth');
      expect(result.currentPrice).toHaveProperty('eth');
      expect(result.change).toHaveProperty('eth');
      expect(typeof result.volatility).toBe('number');
    });
  });

  describe('시장 상태 조회 (getMarketStatus)', () => {
    it('시장 상태를 성공적으로 조회해야 합니다', () => {
      // Given: Mock 시장 상태
      const mockMarketStatus: MarketStatus = {
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

      // Given: 서비스 메서드 Mock 설정
      mockMarketService.getMarketStatus.mockReturnValue(mockMarketStatus);

      // When: 시장 상태 조회
      const result = controller.getMarketStatus();

      // Then: 서비스 메서드가 호출되고 결과가 반환되어야 함
      expect(service.getMarketStatus).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockMarketStatus);
    });

    it('서비스에서 에러가 발생하면 컨트롤러에서도 에러가 발생해야 합니다', () => {
      // Given: 서비스에서 에러 발생
      const errorMessage = '시장 상태 조회 실패';
      mockMarketService.getMarketStatus.mockImplementation(() => {
        throw new Error(errorMessage);
      });

      // When & Then: 에러가 발생해야 함
      expect(() => controller.getMarketStatus()).toThrow(errorMessage);
      expect(service.getMarketStatus).toHaveBeenCalledTimes(1);
    });

    it('아비트라지 기회가 포함된 시장 상태를 반환해야 합니다', () => {
      // Given: 아비트라지 기회가 포함된 Mock 시장 상태
      const mockMarketStatus: MarketStatus = {
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

      // Given: 서비스 메서드 Mock 설정
      mockMarketService.getMarketStatus.mockReturnValue(mockMarketStatus);

      // When: 시장 상태 조회
      const result = controller.getMarketStatus();

      // Then: 아비트라지 기회가 포함된 상태가 반환되어야 함
      expect(result.arbitrageOpportunity).toBeDefined();
      expect(result.arbitrageOpportunity?.opportunityId).toBe(
        'arbitrage_1234567890',
      );
      expect(result.arbitrageOpportunity?.percentage).toBe(24.24);
      expect(result.arbitrageOpportunity?.direction).toBe('buy_eth_sell_btc');
    });
  });

  describe('아비트라지 기회 체크 (checkArbitrageOpportunity)', () => {
    it('아비트라지 기회 체크를 성공적으로 실행해야 합니다', () => {
      // Given: 서비스 메서드 Mock 설정
      mockMarketService.checkAndEmitArbitrageOpportunity.mockReturnValue(
        undefined,
      );

      // When: 아비트라지 기회 체크 실행
      const result = controller.checkArbitrageOpportunity();

      // Then: 서비스 메서드가 호출되고 결과가 반환되어야 함
      expect(service.checkAndEmitArbitrageOpportunity).toHaveBeenCalledTimes(1);
      expect(service.checkAndEmitArbitrageOpportunity).toHaveBeenCalledWith(
        1000,
        30000,
      );
      expect(result).toEqual({ message: '아비트라지 기회 체크 완료' });
    });

    it('서비스에서 에러가 발생하면 컨트롤러에서도 에러가 발생해야 합니다', () => {
      // Given: 서비스에서 에러 발생
      const errorMessage = '아비트라지 기회 체크 실패';
      mockMarketService.checkAndEmitArbitrageOpportunity.mockImplementation(
        () => {
          throw new Error(errorMessage);
        },
      );

      // When & Then: 에러가 발생해야 함
      expect(() => controller.checkArbitrageOpportunity()).toThrow(
        errorMessage,
      );
      expect(service.checkAndEmitArbitrageOpportunity).toHaveBeenCalledTimes(1);
    });

    it('올바른 풀 정보로 아비트라지 기회를 체크해야 합니다', () => {
      // Given: 서비스 메서드 Mock 설정
      mockMarketService.checkAndEmitArbitrageOpportunity.mockReturnValue(
        undefined,
      );

      // When: 아비트라지 기회 체크 실행
      controller.checkArbitrageOpportunity();

      // Then: 올바른 풀 정보로 호출되어야 함
      expect(service.checkAndEmitArbitrageOpportunity).toHaveBeenCalledWith(
        1000,
        30000,
      );
    });

    it('올바른 응답 형식을 반환해야 합니다', () => {
      // Given: 서비스 메서드 Mock 설정
      mockMarketService.checkAndEmitArbitrageOpportunity.mockReturnValue(
        undefined,
      );

      // When: 아비트라지 기회 체크 실행
      const result = controller.checkArbitrageOpportunity();

      // Then: 올바른 응답 형식이 반환되어야 함
      expect(result).toHaveProperty('message');
      expect(typeof result.message).toBe('string');
      expect(result.message).toBe('아비트라지 기회 체크 완료');
    });
  });

  describe('컨트롤러 생성자', () => {
    it('MarketService가 올바르게 주입되어야 합니다', () => {
      // Then: 컨트롤러가 정의되어야 함
      expect(controller).toBeDefined();
      expect(service).toBeDefined();
    });
  });

  describe('API 응답 형식', () => {
    it('모든 메서드가 올바른 타입을 반환해야 합니다', () => {
      // Given: Mock 데이터들
      const mockPrice: MarketPrice = {
        eth: 2000,
        btc: 60000,
        ratio: 0.033,
        timestamp: new Date(),
      };

      const mockPriceChangeEvent: PriceChangeEvent = {
        eventId: 'price_change_1234567890',
        timestamp: new Date(),
        previousPrice: mockPrice,
        currentPrice: { ...mockPrice, eth: 2100 },
        change: { eth: 5.0, btc: 5.0 },
        volatility: 3.5,
      };

      const mockMarketStatus: MarketStatus = {
        currentPrice: mockPrice,
        volatility: { eth: 2.5, btc: 1.8, overall: 2.1 },
        arbitrageOpportunity: null,
        lastUpdate: new Date(),
      };

      // Given: 모든 서비스 메서드 Mock 설정
      mockMarketService.getCurrentPrice.mockReturnValue(mockPrice);
      mockMarketService.simulatePriceChange.mockReturnValue(
        mockPriceChangeEvent,
      );
      mockMarketService.getMarketStatus.mockReturnValue(mockMarketStatus);
      mockMarketService.checkAndEmitArbitrageOpportunity.mockReturnValue(
        undefined,
      );

      // When & Then: 모든 메서드가 올바른 타입을 반환해야 함
      expect(controller.getCurrentPrice()).toEqual(mockPrice);
      expect(controller.simulatePriceChange()).toEqual(mockPriceChangeEvent);
      expect(controller.getMarketStatus()).toEqual(mockMarketStatus);
      expect(controller.checkArbitrageOpportunity()).toEqual({
        message: '아비트라지 기회 체크 완료',
      });
    });
  });

  describe('에러 처리', () => {
    it('서비스에서 발생하는 모든 에러를 올바르게 전파해야 합니다', () => {
      // Given: 다양한 에러 메시지들
      const errorMessages = [
        '가격 조회 실패',
        '가격 변동 시뮬레이션 실패',
        '시장 상태 조회 실패',
        '아비트라지 기회 체크 실패',
        '예상치 못한 에러가 발생했습니다',
      ];

      errorMessages.forEach((errorMessage) => {
        // Given: 각 메서드에 대해 에러 Mock 설정
        mockMarketService.getCurrentPrice.mockImplementation(() => {
          throw new Error(errorMessage);
        });
        mockMarketService.simulatePriceChange.mockImplementation(() => {
          throw new Error(errorMessage);
        });
        mockMarketService.getMarketStatus.mockImplementation(() => {
          throw new Error(errorMessage);
        });
        mockMarketService.checkAndEmitArbitrageOpportunity.mockImplementation(
          () => {
            throw new Error(errorMessage);
          },
        );

        // When & Then: 모든 메서드에서 에러가 전파되어야 함
        expect(() => controller.getCurrentPrice()).toThrow(errorMessage);
        expect(() => controller.simulatePriceChange()).toThrow(errorMessage);
        expect(() => controller.getMarketStatus()).toThrow(errorMessage);
        expect(() => controller.checkArbitrageOpportunity()).toThrow(
          errorMessage,
        );
      });
    });
  });

  describe('서비스 메서드 호출 검증', () => {
    it('각 메서드가 정확히 한 번씩 호출되어야 합니다', () => {
      // Given: Mock 데이터들
      const mockPrice: MarketPrice = {
        eth: 2000,
        btc: 60000,
        ratio: 0.033,
        timestamp: new Date(),
      };

      const mockPriceChangeEvent: PriceChangeEvent = {
        eventId: 'price_change_1234567890',
        timestamp: new Date(),
        previousPrice: mockPrice,
        currentPrice: { ...mockPrice, eth: 2100 },
        change: { eth: 5.0, btc: 5.0 },
        volatility: 3.5,
      };

      const mockMarketStatus: MarketStatus = {
        currentPrice: mockPrice,
        volatility: { eth: 2.5, btc: 1.8, overall: 2.1 },
        arbitrageOpportunity: null,
        lastUpdate: new Date(),
      };

      // Given: 모든 서비스 메서드 Mock 설정
      mockMarketService.getCurrentPrice.mockReturnValue(mockPrice);
      mockMarketService.simulatePriceChange.mockReturnValue(
        mockPriceChangeEvent,
      );
      mockMarketService.getMarketStatus.mockReturnValue(mockMarketStatus);
      mockMarketService.checkAndEmitArbitrageOpportunity.mockReturnValue(
        undefined,
      );

      // When: 모든 컨트롤러 메서드 호출
      controller.getCurrentPrice();
      controller.simulatePriceChange();
      controller.getMarketStatus();
      controller.checkArbitrageOpportunity();

      // Then: 각 서비스 메서드가 정확히 한 번씩 호출되어야 함
      expect(service.getCurrentPrice).toHaveBeenCalledTimes(1);
      expect(service.simulatePriceChange).toHaveBeenCalledTimes(1);
      expect(service.getMarketStatus).toHaveBeenCalledTimes(1);
      expect(service.checkAndEmitArbitrageOpportunity).toHaveBeenCalledTimes(1);
    });
  });
});
