import { Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MarketService } from './market.service';
import {
  MarketPrice,
  MarketStatus,
  PriceChangeEvent,
} from './types/market.interface';

@ApiTags('Market')
@Controller('market')
export class MarketController {
  constructor(private readonly marketService: MarketService) {}

  @Get('price')
  @ApiOperation({
    summary: '현재 시장 가격 조회',
    description: 'ETH, BTC의 현재 시장 가격을 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '시장 가격 조회 성공',
  })
  getCurrentPrice(): MarketPrice {
    return this.marketService.getCurrentPrice();
  }

  @Post('simulate-price-change')
  @ApiOperation({
    summary: '가격 변동 시뮬레이션',
    description:
      'ETH, BTC 가격을 랜덤하게 변동시키고 변동성과 아비트라지 기회를 계산합니다.',
  })
  @ApiResponse({
    status: 201,
    description: '가격 변동 시뮬레이션 성공',
  })
  simulatePriceChange(): PriceChangeEvent {
    return this.marketService.simulatePriceChange();
  }

  @Get('status')
  @ApiOperation({
    summary: '시장 상태 조회',
    description:
      '현재 가격, 변동성, 아비트라지 기회를 포함한 전체 시장 상태를 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '시장 상태 조회 성공',
  })
  getMarketStatus(): MarketStatus {
    return this.marketService.getMarketStatus();
  }

  @Post('check-arbitrage')
  @ApiOperation({
    summary: '아비트라지 기회 체크',
    description:
      '현재 풀 상태와 시장 가격을 비교하여 아비트라지 기회를 체크하고 이벤트를 발생시킵니다.',
  })
  @ApiResponse({
    status: 200,
    description: '아비트라지 기회 체크 완료',
  })
  checkArbitrageOpportunity(): { message: string } {
    // 풀 상태를 가져와서 아비트라지 체크
    // 실제로는 LP 서비스에서 풀 정보를 가져와야 함
    this.marketService.checkAndEmitArbitrageOpportunity(1000, 30000);
    return { message: '아비트라지 기회 체크 완료' };
  }
}
