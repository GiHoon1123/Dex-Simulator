/**
 * MEV 시뮬레이션 모듈
 * MEV 공격 시뮬레이션을 위한 모든 서비스와 컨트롤러를 통합
 */

import { Module } from '@nestjs/common';
import { MevController } from './controllers/mev.controller';
import { MevBotService } from './services/mev-bot.service';
import { MevDetectorService } from './services/mev-detector.service';
import { MevStrategyService } from './services/mev-strategy.service';

@Module({
  imports: [],
  controllers: [MevController],
  providers: [MevBotService, MevDetectorService, MevStrategyService],
  exports: [MevBotService, MevDetectorService, MevStrategyService],
})
export class MevSimulationModule {}
