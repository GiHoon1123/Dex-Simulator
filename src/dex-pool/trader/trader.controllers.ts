import { Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TraderService } from './trader.service';
import { ArbitrageOpportunity } from './types/arbitrage.interface';
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

  @Post('execute-arbitrage')
  @ApiOperation({
    summary: '아비트라지 거래 실행',
    description:
      '현재 시장 상태를 체크하여 아비트라지 기회가 있으면 거래를 실행합니다.',
  })
  @ApiResponse({
    status: 201,
    description: '아비트라지 거래 실행 성공',
  })
  @ApiResponse({
    status: 400,
    description: '아비트라지 기회가 없음',
  })
  executeArbitrageTrade(): {
    message: string;
    opportunity?: ArbitrageOpportunity;
    trade?: TradeResult;
  } {
    return this.traderService.checkAndExecuteArbitrage();
  }
}
