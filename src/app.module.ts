import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DexSimulationModule } from './dex-simulation/dex-simulation.module';
import { MevSimulationModule } from './mev-simulation/mev-simulation.module';
import { ContractSimulationModule } from './contract-simulation/contract-simulation.module';
import { SharedModule } from './shared/shared.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    SharedModule,
    DexSimulationModule,
    MevSimulationModule,
    ContractSimulationModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
