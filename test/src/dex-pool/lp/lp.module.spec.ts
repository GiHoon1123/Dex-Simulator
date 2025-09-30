import { EventEmitterModule } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { LpController } from 'src/dex-pool/lp/lp.controllers';
import { LpModule } from 'src/dex-pool/lp/lp.module';
import { LpService } from 'src/dex-pool/lp/lp.service';

describe('LpModule', () => {
  let module: TestingModule;
  let lpService: LpService;
  let lpController: LpController;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot(), LpModule],
    }).compile();

    lpService = module.get<LpService>(LpService);
    lpController = module.get<LpController>(LpController);
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  it('모듈이 정상적으로 생성되어야 합니다', () => {
    expect(module).toBeDefined();
  });

  it('LpService가 정상적으로 제공되어야 합니다', () => {
    expect(lpService).toBeDefined();
    expect(lpService).toBeInstanceOf(LpService);
  });

  it('LpController가 정상적으로 제공되어야 합니다', () => {
    expect(lpController).toBeDefined();
    expect(lpController).toBeInstanceOf(LpController);
  });

  it('모듈이 정상적으로 초기화되어야 합니다', async () => {
    await expect(module.init()).resolves.not.toThrow();
  });

  it('서비스와 컨트롤러가 올바르게 연결되어야 합니다', () => {
    // 컨트롤러가 서비스를 올바르게 주입받았는지 확인
    expect(lpController['lpService']).toBe(lpService);
  });
});


