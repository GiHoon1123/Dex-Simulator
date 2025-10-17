import { Module } from '@nestjs/common';
import { ContractSimulationController } from './controllers/contract-simulation.controller';
import { RouterContractService } from './services/router-contract.service';
import { SingletonContractService } from './services/singleton-contract.service';

/**
 * ContractSimulationModule
 *
 * 컨트랙트 시뮬레이션을 위한 모듈입니다.
 * 싱글톤 컨트랙트와 라우팅 컨트랙트 시뮬레이션을 제공합니다.
 * 완전히 독립적인 모듈입니다.
 */
@Module({
  imports: [],
  controllers: [ContractSimulationController],
  providers: [SingletonContractService, RouterContractService],
  exports: [SingletonContractService, RouterContractService],
})
export class ContractSimulationModule {}
