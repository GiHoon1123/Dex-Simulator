import { Test, TestingModule } from '@nestjs/testing';
import { LpController } from 'src/dex-simulation/lp/lp.controllers';
import { LpService } from 'src/dex-simulation/lp/lp.service';
import { Pool } from 'src/dex-simulation/lp/types/lp.interface';

describe('LpController', () => {
  let controller: LpController;
  let service: LpService;

  // Mock LpService 생성
  const mockLpService = {
    initLiquidity: jest.fn(),
    getPool: jest.fn(),
    addRandomUser: jest.fn(),
    removeRandomUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LpController],
      providers: [
        {
          provide: LpService,
          useValue: mockLpService,
        },
      ],
    }).compile();

    controller = module.get<LpController>(LpController);
    service = module.get<LpService>(LpService);

    // 각 테스트 전에 mock 초기화
    jest.clearAllMocks();
  });

  describe('풀 초기화 (initLiquidity)', () => {
    it('풀 초기화를 성공적으로 실행해야 합니다', () => {
      // Given: Mock 풀 데이터
      const mockPool: Pool = {
        eth: 1000,
        btc: 30000,
        k: 30000000,
        feeRate: 0.003,
        userCount: 10,
        users: [
          {
            id: 1,
            eth: 100,
            btc: 3000,
            share: 0.1,
            earnedEth: 0,
            earnedBtc: 0,
            governanceTokens: 10,
          },
        ],
        initialPoolValue: 2000,
        currentPoolValue: 2000,
        poolSizeRatio: 1.0,
        volatility: {
          eth: 0,
          btc: 0,
          overall: 0,
        },
        lastVolatilityUpdate: new Date(),
      };

      // Given: 서비스 메서드 Mock 설정
      mockLpService.initLiquidity.mockReturnValue(mockPool);

      // When: 풀 초기화 실행
      const result = controller.initLiquidity();

      // Then: 서비스 메서드가 호출되고 결과가 반환되어야 함
      expect(service.initLiquidity).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockPool);
    });

    it('서비스에서 에러가 발생하면 컨트롤러에서도 에러가 발생해야 합니다', () => {
      // Given: 서비스에서 에러 발생
      const errorMessage = '풀 초기화 실패';
      mockLpService.initLiquidity.mockImplementation(() => {
        throw new Error(errorMessage);
      });

      // When & Then: 에러가 발생해야 함
      expect(() => controller.initLiquidity()).toThrow(errorMessage);
      expect(service.initLiquidity).toHaveBeenCalledTimes(1);
    });
  });

  describe('풀 상태 조회 (getPool)', () => {
    it('풀 상태를 성공적으로 조회해야 합니다', () => {
      // Given: Mock 풀 데이터
      const mockPool: Pool = {
        eth: 1000,
        btc: 30000,
        k: 30000000,
        feeRate: 0.003,
        userCount: 10,
        users: [
          {
            id: 1,
            eth: 100,
            btc: 3000,
            share: 0.1,
            earnedEth: 0,
            earnedBtc: 0,
            governanceTokens: 10,
          },
        ],
        initialPoolValue: 2000,
        currentPoolValue: 2000,
        poolSizeRatio: 1.0,
        volatility: {
          eth: 0,
          btc: 0,
          overall: 0,
        },
        lastVolatilityUpdate: new Date(),
      };

      // Given: 서비스 메서드 Mock 설정
      mockLpService.getPool.mockReturnValue(mockPool);

      // When: 풀 상태 조회
      const result = controller.getPool();

      // Then: 서비스 메서드가 호출되고 결과가 반환되어야 함
      expect(service.getPool).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockPool);
    });

    it('서비스에서 에러가 발생하면 컨트롤러에서도 에러가 발생해야 합니다', () => {
      // Given: 서비스에서 에러 발생
      const errorMessage = '풀이 초기화되지 않았습니다';
      mockLpService.getPool.mockImplementation(() => {
        throw new Error(errorMessage);
      });

      // When & Then: 에러가 발생해야 함
      expect(() => controller.getPool()).toThrow(errorMessage);
      expect(service.getPool).toHaveBeenCalledTimes(1);
    });
  });

  describe('랜덤 유저 추가 (addRandomUser)', () => {
    it('랜덤 유저를 성공적으로 추가해야 합니다', () => {
      // Given: Mock 풀 데이터 (유저 추가 후)
      const mockPool: Pool = {
        eth: 1050,
        btc: 31500,
        k: 33075000,
        feeRate: 0.003,
        userCount: 12,
        users: [
          {
            id: 1,
            eth: 100,
            btc: 3000,
            share: 0.095,
            earnedEth: 0,
            earnedBtc: 0,
            governanceTokens: 9.5,
          },
          {
            id: 11,
            eth: 25,
            btc: 750,
            share: 0.024,
            earnedEth: 0,
            earnedBtc: 0,
            governanceTokens: 2.4,
          },
          {
            id: 12,
            eth: 25,
            btc: 750,
            share: 0.024,
            earnedEth: 0,
            earnedBtc: 0,
            governanceTokens: 2.4,
          },
        ],
        initialPoolValue: 2000,
        currentPoolValue: 2100,
        poolSizeRatio: 1.05,
        volatility: {
          eth: 0,
          btc: 0,
          overall: 0,
        },
        lastVolatilityUpdate: new Date(),
      };

      // Given: 서비스 메서드 Mock 설정
      mockLpService.addRandomUser.mockReturnValue(mockPool);

      // When: 랜덤 유저 추가
      const result = controller.addRandomUser();

      // Then: 서비스 메서드가 호출되고 결과가 반환되어야 함
      expect(service.addRandomUser).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockPool);
    });

    it('최대 유저 수에 도달했을 때 에러가 발생해야 합니다', () => {
      // Given: 서비스에서 최대 유저 수 에러 발생
      const errorMessage = '최대 유저 수(30명)에 도달했습니다';
      mockLpService.addRandomUser.mockImplementation(() => {
        throw new Error(errorMessage);
      });

      // When & Then: 에러가 발생해야 함
      expect(() => controller.addRandomUser()).toThrow(errorMessage);
      expect(service.addRandomUser).toHaveBeenCalledTimes(1);
    });

    it('풀이 초기화되지 않았을 때 에러가 발생해야 합니다', () => {
      // Given: 서비스에서 초기화되지 않은 풀 에러 발생
      const errorMessage =
        '풀이 초기화되지 않았습니다. 먼저 POST /lp/init을 호출해주세요';
      mockLpService.addRandomUser.mockImplementation(() => {
        throw new Error(errorMessage);
      });

      // When & Then: 에러가 발생해야 함
      expect(() => controller.addRandomUser()).toThrow(errorMessage);
      expect(service.addRandomUser).toHaveBeenCalledTimes(1);
    });
  });

  describe('랜덤 유저 제거 (removeRandomUser)', () => {
    it('랜덤 유저를 성공적으로 제거해야 합니다', () => {
      // Given: Mock 풀 데이터 (유저 제거 후)
      const mockPool: Pool = {
        eth: 950,
        btc: 28500,
        k: 27075000,
        feeRate: 0.003,
        userCount: 8,
        users: [
          {
            id: 1,
            eth: 100,
            btc: 3000,
            share: 0.105,
            earnedEth: 0,
            earnedBtc: 0,
            governanceTokens: 10.5,
          },
          {
            id: 2,
            eth: 120,
            btc: 3600,
            share: 0.126,
            earnedEth: 0,
            earnedBtc: 0,
            governanceTokens: 12.6,
          },
        ],
        initialPoolValue: 2000,
        currentPoolValue: 1900,
        poolSizeRatio: 0.95,
        volatility: {
          eth: 0,
          btc: 0,
          overall: 0,
        },
        lastVolatilityUpdate: new Date(),
      };

      // Given: 서비스 메서드 Mock 설정
      mockLpService.removeRandomUser.mockReturnValue(mockPool);

      // When: 랜덤 유저 제거
      const result = controller.removeRandomUser();

      // Then: 서비스 메서드가 호출되고 결과가 반환되어야 함
      expect(service.removeRandomUser).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockPool);
    });

    it('최소 유저 수에 도달했을 때 에러가 발생해야 합니다', () => {
      // Given: 서비스에서 최소 유저 수 에러 발생
      const errorMessage = '최소 유저 수(10명)에 도달했습니다';
      mockLpService.removeRandomUser.mockImplementation(() => {
        throw new Error(errorMessage);
      });

      // When & Then: 에러가 발생해야 함
      expect(() => controller.removeRandomUser()).toThrow(errorMessage);
      expect(service.removeRandomUser).toHaveBeenCalledTimes(1);
    });

    it('풀이 초기화되지 않았을 때 에러가 발생해야 합니다', () => {
      // Given: 서비스에서 초기화되지 않은 풀 에러 발생
      const errorMessage =
        '풀이 초기화되지 않았습니다. 먼저 POST /lp/init을 호출해주세요';
      mockLpService.removeRandomUser.mockImplementation(() => {
        throw new Error(errorMessage);
      });

      // When & Then: 에러가 발생해야 함
      expect(() => controller.removeRandomUser()).toThrow(errorMessage);
      expect(service.removeRandomUser).toHaveBeenCalledTimes(1);
    });
  });

  describe('컨트롤러 생성자', () => {
    it('LpService가 올바르게 주입되어야 합니다', () => {
      // Then: 컨트롤러가 정의되어야 함
      expect(controller).toBeDefined();
      expect(service).toBeDefined();
    });
  });

  describe('API 응답 형식', () => {
    it('모든 메서드가 올바른 Pool 타입을 반환해야 합니다', () => {
      // Given: Mock 풀 데이터
      const mockPool: Pool = {
        eth: 1000,
        btc: 30000,
        k: 30000000,
        feeRate: 0.003,
        userCount: 10,
        users: [
          {
            id: 1,
            eth: 100,
            btc: 3000,
            share: 0.1,
            earnedEth: 0,
            earnedBtc: 0,
            governanceTokens: 10,
          },
        ],
        initialPoolValue: 2000,
        currentPoolValue: 2000,
        poolSizeRatio: 1.0,
        volatility: {
          eth: 0,
          btc: 0,
          overall: 0,
        },
        lastVolatilityUpdate: new Date(),
      };

      // Given: 모든 서비스 메서드 Mock 설정
      mockLpService.initLiquidity.mockReturnValue(mockPool);
      mockLpService.getPool.mockReturnValue(mockPool);
      mockLpService.addRandomUser.mockReturnValue(mockPool);
      mockLpService.removeRandomUser.mockReturnValue(mockPool);

      // When & Then: 모든 메서드가 Pool 타입을 반환해야 함
      expect(controller.initLiquidity()).toEqual(mockPool);
      expect(controller.getPool()).toEqual(mockPool);
      expect(controller.addRandomUser()).toEqual(mockPool);
      expect(controller.removeRandomUser()).toEqual(mockPool);
    });
  });

  describe('에러 처리', () => {
    it('서비스에서 발생하는 모든 에러를 올바르게 전파해야 합니다', () => {
      // Given: 다양한 에러 메시지들
      const errorMessages = [
        '풀이 초기화되지 않았습니다',
        '최대 유저 수(30명)에 도달했습니다',
        '최소 유저 수(10명)에 도달했습니다',
        '예상치 못한 에러가 발생했습니다',
      ];

      errorMessages.forEach((errorMessage) => {
        // Given: 각 메서드에 대해 에러 Mock 설정
        mockLpService.initLiquidity.mockImplementation(() => {
          throw new Error(errorMessage);
        });
        mockLpService.getPool.mockImplementation(() => {
          throw new Error(errorMessage);
        });
        mockLpService.addRandomUser.mockImplementation(() => {
          throw new Error(errorMessage);
        });
        mockLpService.removeRandomUser.mockImplementation(() => {
          throw new Error(errorMessage);
        });

        // When & Then: 모든 메서드에서 에러가 전파되어야 함
        expect(() => controller.initLiquidity()).toThrow(errorMessage);
        expect(() => controller.getPool()).toThrow(errorMessage);
        expect(() => controller.addRandomUser()).toThrow(errorMessage);
        expect(() => controller.removeRandomUser()).toThrow(errorMessage);
      });
    });
  });
});
