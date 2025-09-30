import { Module } from '@nestjs/common';
import { LpModule } from './lp/lp.module';
import { MarketModule } from './market/market.module';
import { TraderModule } from './trader/trader.module';

@Module({
  imports: [LpModule, MarketModule, TraderModule],
  exports: [LpModule, MarketModule, TraderModule],
})
export class DexPoolModule {}
