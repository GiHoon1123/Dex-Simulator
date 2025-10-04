import { Module, forwardRef } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { PoolOracleService } from './pool-oracle.service';
import { PoolController } from './pool.controller';
import { PoolService } from './pool.service';

/**
 * 풀 모듈
 *
 * 풀 관리, 스왑 실행, 유동성 관리, 오라클 기능을 제공하는 모듈입니다.
 * MEV, Routing, Singleton 시뮬레이션에서 공통으로 사용됩니다.
 */
@Module({
  imports: [
    EventEmitterModule, // 이벤트 시스템을 위한 모듈
    forwardRef(() => BlockchainModule), // 블록체인 서비스 의존성
  ],
  controllers: [PoolController],
  providers: [PoolService, PoolOracleService],
  exports: [PoolService, PoolOracleService],
})
export class PoolModule {}
