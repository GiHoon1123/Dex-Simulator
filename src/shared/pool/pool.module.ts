import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PoolOracleService } from './pool-oracle.service';
import { PoolController } from './pool.controller';
import { PoolService } from './pool.service';

/**
 * 풀 모듈
 *
 * 풀 관리, 스왑 실행, 유동성 관리, 오라클 기능을 제공하는 모듈입니다.
 * MEV, Routing, Singleton 시뮬레이션에서 공통으로 사용됩니다.
 *
 * 이벤트 기반으로 Blockchain 모듈과 통신하여 순환참조를 방지합니다.
 */
@Module({
  imports: [
    EventEmitterModule, // 이벤트 시스템을 위한 모듈
  ],
  controllers: [PoolController],
  providers: [PoolService, PoolOracleService],
  exports: [PoolService, PoolOracleService],
})
export class PoolModule {}
