import { EventEmitterModule } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';

describe('AppModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  it('모듈이 정상적으로 생성되어야 합니다', () => {
    expect(module).toBeDefined();
  });

  it('모든 하위 모듈들이 정상적으로 로드되어야 합니다', () => {
    // AppModule이 정상적으로 생성되고 모든 의존성이 해결되었는지 확인
    expect(module.get(AppModule)).toBeDefined();
  });

  it('EventEmitterModule이 정상적으로 로드되어야 합니다', () => {
    // EventEmitterModule이 정상적으로 로드되었는지 확인
    const eventEmitter = module.get(EventEmitterModule);
    expect(eventEmitter).toBeDefined();
  });

  it('모듈이 정상적으로 초기화되어야 합니다', async () => {
    // 모듈이 정상적으로 초기화되는지 확인
    await expect(module.init()).resolves.not.toThrow();
  });
});
