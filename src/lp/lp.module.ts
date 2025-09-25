import { Module } from '@nestjs/common';
import { LpService } from './lp.service';
import { LpController } from './lp.controllers';

@Module({
  imports: [],
  controllers: [LpController],
  providers: [LpService],
})
export class LpModule {}
