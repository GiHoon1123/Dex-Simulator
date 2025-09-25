import { Module } from '@nestjs/common';
import { TraderController } from './trader.controllers';
import { TraderService } from './trader.service';

@Module({
  imports: [],
  controllers: [TraderController],
  providers: [TraderService],
})
export class TraderModule {}
