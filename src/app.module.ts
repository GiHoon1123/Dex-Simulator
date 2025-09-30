import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DexPoolModule } from './dex-pool/dex-pool.module';
import { SharedModule } from './shared/shared.module';

@Module({
  imports: [EventEmitterModule.forRoot(), SharedModule, DexPoolModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
