import { EventEmitterModule } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { MarketController } from 'src/dex-simulation/market/market.controllers';
import { MarketModule } from 'src/dex-simulation/market/market.module';
import { MarketService } from 'src/dex-simulation/market/market.service';

describe('MarketModule', () => {
  let module: TestingModule;
  let marketService: MarketService;
  let marketController: MarketController;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot(), MarketModule],
    }).compile();

    marketService = module.get<MarketService>(MarketService);
    marketController = module.get<MarketController>(MarketController);
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  it('모듈이 정상적으로 생성되어야 합니다', () => {
    expect(module).toBeDefined();
  });

  it('MarketService가 정상적으로 제공되어야 합니다', () => {
    expect(marketService).toBeDefined();
    expect(marketService).toBeInstanceOf(MarketService);
  });

  it('MarketController가 정상적으로 제공되어야 합니다', () => {
    expect(marketController).toBeDefined();
    expect(marketController).toBeInstanceOf(MarketController);
  });

  it('모듈이 정상적으로 초기화되어야 합니다', async () => {
    await expect(module.init()).resolves.not.toThrow();
  });

  it('서비스와 컨트롤러가 올바르게 연결되어야 합니다', () => {
    // 컨트롤러가 서비스를 올바르게 주입받았는지 확인
    expect(marketController['marketService']).toBe(marketService);
  });

  it('EventEmitter가 정상적으로 주입되어야 합니다', () => {
    // MarketService가 EventEmitter를 올바르게 주입받았는지 확인
    expect(marketService['eventEmitter']).toBeDefined();
  });
});


