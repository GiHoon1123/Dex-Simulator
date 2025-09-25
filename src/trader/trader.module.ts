import { Module } from '@nestjs/common';
import { LpModule } from '../lp/lp.module';
import { MarketModule } from '../market/market.module';
import { TraderController } from './trader.controllers';
import { TraderService } from './trader.service';

@Module({
  imports: [LpModule, MarketModule], // Market 모듈 import 필요 (실제 가격 조회용)
  controllers: [TraderController],
  providers: [TraderService],
})
export class TraderModule {}
