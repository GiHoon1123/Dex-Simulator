import { Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TraderService } from './trader.service';
import { TradeResult } from './types/trade.interface';

@ApiTags('Trader')
@Controller('trader')
export class TraderController {
  constructor(private readonly traderService: TraderService) {}

  @Post('execute-random-trade')
  @ApiOperation({
    summary: '랜덤 거래 실행',
    description:
      'ETH ↔ BTC 랜덤 거래를 실행합니다. 거래 방향과 거래량이 랜덤하게 결정되며, 슬리피지와 가격 영향도를 계산합니다.',
  })
  @ApiResponse({
    status: 201,
    description: '거래 실행 성공',
  })
  executeRandomTrade(): TradeResult {
    return this.traderService.executeRandomTrade();
  }
}
