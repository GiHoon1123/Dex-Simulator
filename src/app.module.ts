import { Module } from '@nestjs/common';
import { MarketModule } from './market/market.module';
import { PoolModule } from './pool/pool.module';
import { RewardModule } from './reward/reward.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [MarketModule, UserModule, PoolModule, RewardModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
