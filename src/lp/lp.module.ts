import { Module } from '@nestjs/common';
import { LpController } from './lp.controllers';
import { LpService } from './lp.service';

@Module({
  imports: [],
  controllers: [LpController],
  providers: [LpService],
  exports: [LpService], // 다른 모듈에서 사용할 수 있도록 export
})
export class LpModule {}
