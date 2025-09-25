import { Module } from '@nestjs/common';
import { LpModule } from './lp/lp.module';
import { MarketModule } from './market/market.module';
import { PoolModule } from './pool/pool.module';
import { RewardModule } from './reward/reward.module';
import { TraderModule } from './trader/trader.module';

@Module({
  imports: [MarketModule, LpModule, PoolModule, RewardModule, TraderModule],
  controllers: [],
  providers: [LpModule],
})
export class AppModule {}
