import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DexPoolModule } from './dex-pool/dex-pool.module';

@Module({
  imports: [EventEmitterModule.forRoot(), DexPoolModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
