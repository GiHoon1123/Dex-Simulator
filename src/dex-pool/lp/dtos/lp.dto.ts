import { ApiProperty } from '@nestjs/swagger';

export class LpUserDto {
  @ApiProperty({ example: 1, description: '유저 고유 ID' })
  id: number;

  @ApiProperty({ example: 1.2, description: '유저가 예치한 ETH 수량' })
  eth: number;

  @ApiProperty({ example: 0.05, description: '유저가 예치한 BTC 수량' })
  btc: number;

  @ApiProperty({ example: 0.18, description: '풀 내 유저 지분율 (0~1)' })
  share: number;

  @ApiProperty({ example: 0.000042, description: '수수료로 받은 ETH (누적)' })
  earnedEth: number;

  @ApiProperty({ example: 0, description: '수수료로 받은 BTC (누적)' })
  earnedBtc: number;

  @ApiProperty({ example: 150.5, description: '거버넌스 토큰 보유량' })
  governanceTokens: number;
}

export class PoolDto {
  @ApiProperty({ example: 1000, description: '풀에 모인 ETH 총량 (고정)' })
  eth: number;

  @ApiProperty({ example: 30000, description: '풀에 모인 BTC 총량 (고정)' })
  btc: number;

  @ApiProperty({ example: 30000000, description: '곱 불변식 k 값 (ETH * BTC)' })
  k: number;

  @ApiProperty({ example: 0.003, description: '거래 수수료율 (동적 조절)' })
  feeRate: number;

  @ApiProperty({ example: 10, description: '풀에 참여한 유저 수' })
  userCount: number;

  @ApiProperty({ type: [LpUserDto], description: '풀에 참여한 LP 유저 목록' })
  users: LpUserDto[];

  @ApiProperty({ example: 2000, description: '초기 풀 가치 (ETH 기준)' })
  initialPoolValue: number;

  @ApiProperty({ example: 2000, description: '현재 풀 가치 (ETH 기준)' })
  currentPoolValue: number;

  @ApiProperty({ example: 1.0, description: '풀 크기 비율 (현재/초기)' })
  poolSizeRatio: number;

  @ApiProperty({
    example: { eth: 2.5, btc: 1.8, overall: 2.1 },
    description: '변동성 정보 (ETH, BTC, 전체)',
  })
  volatility: {
    eth: number;
    btc: number;
    overall: number;
  };

  @ApiProperty({
    example: '2025-09-25T05:33:35.991Z',
    description: '마지막 변동성 업데이트 시간',
  })
  lastVolatilityUpdate: Date;
}
