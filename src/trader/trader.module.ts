import { Module } from '@nestjs/common';
import { LpModule } from '../lp/lp.module';
import { TraderController } from './trader.controllers';
import { TraderService } from './trader.service';

@Module({
  imports: [LpModule],
  controllers: [TraderController],
  providers: [TraderService],
})
export class TraderModule {}
