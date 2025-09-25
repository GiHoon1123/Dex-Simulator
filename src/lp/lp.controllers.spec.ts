import { Test, TestingModule } from '@nestjs/testing';
import { LpController } from './lp.controllers';
import { LpService } from './lp.service';

describe('LpController', () => {
  let controller: LpController;
  let lpService: LpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LpController],
      providers: [
        {
          provide: LpService,
          useValue: {
            initLiquidity: jest.fn(),
            getPool: jest.fn(),
            addRandomUser: jest.fn(),
            removeRandomUser: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<LpController>(LpController);
    lpService = module.get<LpService>(LpService);
  });

  it('컨트롤러가 정상적으로 생성되어야 한다', () => {
    expect(controller).toBeDefined();
  });

  describe('풀 초기화', () => {
    it('풀 초기화를 실행할 수 있어야 한다', () => {
      const mockPool = {
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
      };

      jest.spyOn(lpService, 'initLiquidity').mockReturnValue(mockPool);

      const result = controller.initLiquidity();

      expect(result).toEqual(mockPool);
      expect(lpService.initLiquidity).toHaveBeenCalledTimes(1);
    });
  });

  describe('풀 상태 조회', () => {
    it('풀 상태를 조회할 수 있어야 한다', () => {
      const mockPool = {
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
      };

      jest.spyOn(lpService, 'getPool').mockReturnValue(mockPool);

      const result = controller.getPool();

      expect(result).toEqual(mockPool);
      expect(lpService.getPool).toHaveBeenCalledTimes(1);
    });
  });

  describe('유저 추가', () => {
    it('랜덤 유저를 추가할 수 있어야 한다', () => {
      const mockPool = {
        eth: 1000,
        btc: 30000,
        k: 30000000,
        feeRate: 0.003,
        userCount: 11,
        users: [],
        initialPoolValue: 2000,
        currentPoolValue: 2000,
        poolSizeRatio: 1,
        volatility: { eth: 0, btc: 0, overall: 0 },
        lastVolatilityUpdate: new Date(),
      };

      jest.spyOn(lpService, 'addRandomUser').mockReturnValue(mockPool);

      const result = controller.addRandomUser();

      expect(result).toEqual(mockPool);
      expect(lpService.addRandomUser).toHaveBeenCalledTimes(1);
    });
  });

  describe('유저 제거', () => {
    it('랜덤 유저를 제거할 수 있어야 한다', () => {
      const mockPool = {
        eth: 1000,
        btc: 30000,
        k: 30000000,
        feeRate: 0.003,
        userCount: 9,
        users: [],
        initialPoolValue: 2000,
        currentPoolValue: 2000,
        poolSizeRatio: 1,
        volatility: { eth: 0, btc: 0, overall: 0 },
        lastVolatilityUpdate: new Date(),
      };

      jest.spyOn(lpService, 'removeRandomUser').mockReturnValue(mockPool);

      const result = controller.removeRandomUser();

      expect(result).toEqual(mockPool);
      expect(lpService.removeRandomUser).toHaveBeenCalledTimes(1);
    });
  });
});
