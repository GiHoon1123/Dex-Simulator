import { EventEmitterModule } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { LpService } from 'src/dex-simulation/lp/lp.service';
import { MarketService } from 'src/dex-simulation/market/market.service';
import { TraderController } from 'src/dex-simulation/trader/trader.controllers';
import { TraderModule } from 'src/dex-simulation/trader/trader.module';
import { TraderService } from 'src/dex-simulation/trader/trader.service';

describe('TraderModule', () => {
  let module: TestingModule;
  let traderService: TraderService;
  let traderController: TraderController;
  let lpService: LpService;
  let marketService: MarketService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot(), TraderModule],
    }).compile();

    traderService = module.get<TraderService>(TraderService);
    traderController = module.get<TraderController>(TraderController);
    lpService = module.get<LpService>(LpService);
    marketService = module.get<MarketService>(MarketService);
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  it('모듈이 정상적으로 생성되어야 합니다', () => {
    expect(module).toBeDefined();
  });

  it('TraderService가 정상적으로 제공되어야 합니다', () => {
    expect(traderService).toBeDefined();
    expect(traderService).toBeInstanceOf(TraderService);
  });

  it('TraderController가 정상적으로 제공되어야 합니다', () => {
    expect(traderController).toBeDefined();
    expect(traderController).toBeInstanceOf(TraderController);
  });

  it('LpService가 정상적으로 주입되어야 합니다', () => {
    expect(lpService).toBeDefined();
    expect(lpService).toBeInstanceOf(LpService);
  });

  it('MarketService가 정상적으로 주입되어야 합니다', () => {
    expect(marketService).toBeDefined();
    expect(marketService).toBeInstanceOf(MarketService);
  });

  it('모듈이 정상적으로 초기화되어야 합니다', async () => {
    await expect(module.init()).resolves.not.toThrow();
  });

  it('서비스와 컨트롤러가 올바르게 연결되어야 합니다', () => {
    // 컨트롤러가 서비스를 올바르게 주입받았는지 확인
    expect(traderController['traderService']).toBe(traderService);
  });

  it('TraderService가 의존성 서비스들을 올바르게 주입받아야 합니다', () => {
    // TraderService가 LpService와 MarketService를 올바르게 주입받았는지 확인
    expect(traderService['lpService']).toBe(lpService);
    expect(traderService['marketService']).toBe(marketService);
  });

  it('EventEmitter가 정상적으로 주입되어야 합니다', () => {
    // TraderService가 EventEmitter를 올바르게 주입받았는지 확인
    expect(traderService['eventEmitter']).toBeDefined();
  });
});


