import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DexSimulationModule } from './dex-simulation/dex-simulation.module';
import { SharedModule } from './shared/shared.module';

@Module({
  imports: [EventEmitterModule.forRoot(), SharedModule, DexSimulationModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
