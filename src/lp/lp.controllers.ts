// src/lp/lp.controller.ts
import { Controller, Delete, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PoolDto } from './dtos/lp.dto';
import { LpService } from './lp.service';
import { Pool } from './types/lp.interface';

@ApiTags('Liquidity Providers (LP)')
@Controller('lp')
export class LpController {
  constructor(private readonly lpService: LpService) {}

  @Post('init')
  @ApiOperation({
    summary: '풀 초기화',
    description:
      '10명의 유저를 랜덤하게 생성하고 각 유저가 ETH/BTC를 예치하여 풀을 만듭니다. 총 풀 비율은 ETH:BTC = 10:300으로 고정되며, 유저별로 랜덤하게 배분됩니다.',
  })
  @ApiResponse({
    status: 201,
    description: '풀 초기화 성공',
    type: PoolDto,
  })
  initLiquidity(): Pool {
    return this.lpService.initLiquidity();
  }

  @Get('status')
  @ApiOperation({
    summary: '풀 상태 조회',
    description:
      '현재 풀의 ETH(10), BTC(300) 총량, 불변식 k 값(3000), 그리고 유저별 지분율을 반환합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '풀 상태 조회 성공',
    type: PoolDto,
  })
  getPool(): Pool {
    return this.lpService.getPool();
  }

  @Post('add-user')
  @ApiOperation({
    summary: '랜덤 유저 추가',
    description:
      '풀에 랜덤한 비율로 새 유저를 추가합니다. 최대 30명까지 가능하며, 전체 유저의 지분이 재계산됩니다.',
  })
  @ApiResponse({
    status: 201,
    description: '유저 추가 성공',
    type: PoolDto,
  })
  addRandomUser(): Pool {
    return this.lpService.addRandomUser();
  }

  @Delete('remove-user')
  @ApiOperation({
    summary: '랜덤 유저 제거',
    description:
      '풀에서 랜덤한 유저를 제거합니다. 최소 10명까지 가능하며, 남은 유저들의 지분이 재계산됩니다.',
  })
  @ApiResponse({
    status: 200,
    description: '유저 제거 성공',
    type: PoolDto,
  })
  removeRandomUser(): Pool {
    return this.lpService.removeRandomUser();
  }
}
