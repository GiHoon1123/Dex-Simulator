import { Module } from '@nestjs/common';
import { MevController } from './mev.controller';
import { BlockchainPrerequisitesGuard } from '../common/guards/blockchain-prerequisites.guard';

/**
 * MevSimulationModule
 *
 * MEV 시뮬레이션 관련 기능을 제공합니다.
 * - MEV 봇 제어
 * - MEV 기회 탐지
 * - MEV 전략 실행
 * - MEV 통계 및 분석
 */
@Module({
  controllers: [MevController],
  providers: [BlockchainPrerequisitesGuard],
  exports: [BlockchainPrerequisitesGuard],
})
export class MevSimulationModule {}
