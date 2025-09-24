import { Module } from '@nestjs/common';
import { RewardController } from './reward.controllers';
import { RewardService } from './reward.service';

@Module({
  imports: [],
  controllers: [RewardController],
  providers: [RewardService],
})
export class RewardModule {}
