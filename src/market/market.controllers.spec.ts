import { Test, TestingModule } from '@nestjs/testing';
import { MarketController } from './market.controllers';
import { MarketService } from './market.service';

describe('MarketController', () => {
  let controller: MarketController;
  let marketService: MarketService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MarketController],
      providers: [
        {
          provide: MarketService,
          useValue: {
            getCurrentPrice: jest.fn(),
            simulatePriceChange: jest.fn(),
            getMarketStatus: jest.fn(),
            checkAndEmitArbitrageOpportunity: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<MarketController>(MarketController);
    marketService = module.get<MarketService>(MarketService);
  });

  it('컨트롤러가 정상적으로 생성되어야 한다', () => {
    expect(controller).toBeDefined();
  });

  describe('현재 가격 조회', () => {
    it('현재 시장 가격을 조회할 수 있어야 한다', () => {
      const mockPrice = {
        eth: 2000,
        btc: 60000,
        ratio: 0.033,
        timestamp: new Date(),
      };

      jest.spyOn(marketService, 'getCurrentPrice').mockReturnValue(mockPrice);

      const result = controller.getCurrentPrice();

      expect(result).toEqual(mockPrice);
      expect(marketService.getCurrentPrice).toHaveBeenCalledTimes(1);
    });
  });

  describe('가격 변동 시뮬레이션', () => {
    it('가격 변동 시뮬레이션을 실행할 수 있어야 한다', () => {
      const mockPriceChangeEvent = {
        eventId: 'test_price_change',
        timestamp: new Date(),
        previousPrice: { eth: 2000, btc: 60000, ratio: 0.033, timestamp: new Date() },
        currentPrice: { eth: 2100, btc: 61000, ratio: 0.034, timestamp: new Date() },
        change: { eth: 5, btc: 1.67 },
        volatility: 3.5,
      };

      jest.spyOn(marketService, 'simulatePriceChange').mockReturnValue(mockPriceChangeEvent);

      const result = controller.simulatePriceChange();

      expect(result).toEqual(mockPriceChangeEvent);
      expect(marketService.simulatePriceChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('시장 상태 조회', () => {
    it('시장 상태를 조회할 수 있어야 한다', () => {
      const mockMarketStatus = {
        currentPrice: { eth: 2000, btc: 60000, ratio: 0.033, timestamp: new Date() },
        volatility: { eth: 2.5, btc: 1.8, overall: 2.1 },
        arbitrageOpportunity: null,
        lastUpdate: new Date(),
      };

      jest.spyOn(marketService, 'getMarketStatus').mockReturnValue(mockMarketStatus);

      const result = controller.getMarketStatus();

      expect(result).toEqual(mockMarketStatus);
      expect(marketService.getMarketStatus).toHaveBeenCalledTimes(1);
    });
  });

  describe('아비트라지 기회 체크', () => {
    it('아비트라지 기회를 체크할 수 있어야 한다', () => {
      jest.spyOn(marketService, 'checkAndEmitArbitrageOpportunity').mockImplementation();

      const result = controller.checkArbitrageOpportunity();

      expect(result).toEqual({ message: '아비트라지 기회 체크 완료' });
      expect(marketService.checkAndEmitArbitrageOpportunity).toHaveBeenCalledWith(1000, 30000);
    });
  });
});
