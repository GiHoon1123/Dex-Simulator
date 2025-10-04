/**
 * MEV 시뮬레이션 모듈
 * MEV 공격 시뮬레이션을 위한 모든 서비스와 컨트롤러를 통합
 */

import { Module, forwardRef } from '@nestjs/common';
import { MevController } from './controllers/mev.controller';
import { MevBotService } from './services/mev-bot.service';
import { MevDetectorService } from './services/mev-detector.service';
import { MevStrategyService } from './services/mev-strategy.service';
import { BlockchainModule } from '../shared/blockchain/blockchain.module';
import { PoolModule } from '../shared/pool/pool.module';

@Module({
  imports: [
    // 블록체인 모듈 (트랜잭션 풀, 블록 서비스 등)
    forwardRef(() => BlockchainModule),
    // 풀 모듈 (DEX 풀 서비스, 오라클 등)
    forwardRef(() => PoolModule),
  ],
  controllers: [MevController],
  providers: [
    MevBotService,
    MevDetectorService,
    MevStrategyService,
  ],
  exports: [
    MevBotService,
    MevDetectorService,
    MevStrategyService,
  ],
})
export class MevSimulationModule {}