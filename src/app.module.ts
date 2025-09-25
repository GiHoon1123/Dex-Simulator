import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { LpModule } from './lp/lp.module';
import { MarketModule } from './market/market.module';
import { TraderModule } from './trader/trader.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    MarketModule,
    LpModule,
    TraderModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
