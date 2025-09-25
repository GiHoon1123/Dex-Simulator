import { Test, TestingModule } from '@nestjs/testing';
import { TraderController } from './trader.controllers';
import { TraderService } from './trader.service';

describe('TraderController', () => {
  let controller: TraderController;
  let traderService: TraderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TraderController],
      providers: [
        {
          provide: TraderService,
          useValue: {
            executeRandomTrade: jest.fn(),
            checkAndExecuteArbitrage: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TraderController>(TraderController);
    traderService = module.get<TraderService>(TraderService);
  });

  it('컨트롤러가 정상적으로 생성되어야 한다', () => {
    expect(controller).toBeDefined();
  });

  describe('랜덤 거래 실행', () => {
    it('랜덤 거래를 실행할 수 있어야 한다', () => {
      const mockTradeResult = {
        trade: {
          id: 'trade_1',
          from: 'ETH' as 'ETH',
          to: 'BTC' as 'BTC',
          amountIn: 10,
          amountOut: 300,
          fee: 0.03,
          slippage: 1.5,
          priceImpact: 1.0,
          timestamp: new Date(),
        },
        poolBefore: { eth: 1000, btc: 30000, k: 30000000 },
        poolAfter: { eth: 1010, btc: 29700, k: 30000000 },
        priceInfo: {
          expectedRate: 30,
          actualRate: 29.7,
          slippage: 1.5,
        },
      };

      jest.spyOn(traderService, 'executeRandomTrade').mockReturnValue(mockTradeResult);

      const result = controller.executeRandomTrade();

      expect(result).toEqual(mockTradeResult);
      expect(traderService.executeRandomTrade).toHaveBeenCalledTimes(1);
    });
  });

  describe('아비트라지 거래 실행', () => {
    it('아비트라지 기회가 없을 때 적절한 메시지를 반환해야 한다', () => {
      const mockArbitrageResult = {
        message: '아비트라지 기회가 없습니다. 현재 차이: 2.50% (최소 5% 필요)',
      };

      jest.spyOn(traderService, 'checkAndExecuteArbitrage').mockReturnValue(mockArbitrageResult);

      const result = controller.executeArbitrageTrade();

      expect(result).toEqual(mockArbitrageResult);
      expect(traderService.checkAndExecuteArbitrage).toHaveBeenCalledTimes(1);
    });

    it('아비트라지 기회가 있을 때 거래를 실행해야 한다', () => {
      const mockArbitrageResult = {
        message: '아비트라지 거래 실행 완료! 차이: 8.50%',
        opportunity: {
          opportunityId: 'manual_arbitrage_1234567890',
          timestamp: new Date(),
          poolPrice: 30,
          marketPrice: 27.5,
          difference: 2.5,
          percentage: 8.5,
          direction: 'buy_eth_sell_btc' as 'buy_eth_sell_btc',
        },
        trade: {
          trade: {
            id: 'arbitrage_1',
            from: 'BTC' as 'BTC',
            to: 'ETH' as 'ETH',
            amountIn: 300,
            amountOut: 10.5,
            fee: 0.9,
            slippage: 0.5,
            priceImpact: 0.3,
            timestamp: new Date(),
          },
          poolBefore: { eth: 1000, btc: 30000, k: 30000000 },
          poolAfter: { eth: 989.5, btc: 30299.1, k: 30000000 },
          priceInfo: {
            expectedRate: 0.033,
            actualRate: 0.035,
            slippage: 0.5,
          },
        },
      };

      jest.spyOn(traderService, 'checkAndExecuteArbitrage').mockReturnValue(mockArbitrageResult);

      const result = controller.executeArbitrageTrade();

      expect(result).toEqual(mockArbitrageResult);
      expect(traderService.checkAndExecuteArbitrage).toHaveBeenCalledTimes(1);
    });
  });
});
