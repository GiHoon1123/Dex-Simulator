import { Module } from '@nestjs/common';
import { MarketController } from './market.controllers';
import { MarketService } from './market.service';

@Module({
  imports: [],
  controllers: [MarketController],
  providers: [MarketService],
  exports: [MarketService], // 다른 모듈에서 사용할 수 있도록 export
})
export class MarketModule {}
