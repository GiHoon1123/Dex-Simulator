import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

/**
 * 풀 생성 DTO
 */
export class CreatePoolDto {
  @ApiProperty({
    description: '풀 컨트랙트 주소',
    example: '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8',
  })
  @IsString()
  address: string;

  @ApiProperty({
    description: '토큰 페어',
    example: 'ETH/USDC',
  })
  @IsString()
  pair: string;

  @ApiProperty({
    description: '토큰 A 심볼',
    example: 'ETH',
  })
  @IsString()
  tokenA: string;

  @ApiProperty({
    description: '토큰 B 심볼',
    example: 'USDC',
  })
  @IsString()
  tokenB: string;

  @ApiProperty({
    description: '초기 토큰 A 잔고',
    example: 1000,
  })
  @IsNumber()
  @Min(0)
  initialReserveA: number;

  @ApiProperty({
    description: '초기 토큰 B 잔고',
    example: 2000000,
  })
  @IsNumber()
  @Min(0)
  initialReserveB: number;

  @ApiProperty({
    description: '수수료율 (0.003 = 0.3%)',
    example: 0.003,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  feeRate: number;
}

/**
 * 스왑 실행 DTO
 */
export class ExecuteSwapDto {
  @ApiProperty({
    description: '풀 주소',
    example: '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8',
  })
  @IsString()
  poolAddress: string;

  @ApiProperty({
    description: '입력 토큰 심볼',
    example: 'ETH',
  })
  @IsString()
  tokenIn: string;

  @ApiProperty({
    description: '출력 토큰 심볼',
    example: 'USDC',
  })
  @IsString()
  tokenOut: string;

  @ApiProperty({
    description: '입력 토큰 수량',
    example: 1.5,
  })
  @IsNumber()
  @Min(0)
  amountIn: number;

  @ApiProperty({
    description: '최소 출력 토큰 수량 (슬리피지 보호)',
    example: 2990,
  })
  @IsNumber()
  @Min(0)
  amountOutMin: number;

  @ApiProperty({
    description: '수신자 주소',
    example: 'user-123',
  })
  @IsString()
  recipient: string;

  @ApiProperty({
    description: '데드라인 (타임스탬프)',
    example: 1759550728,
  })
  @IsNumber()
  deadline: number;

  @ApiPropertyOptional({
    description: '가스 가격 (gwei)',
    example: 100,
    default: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  gasPrice?: number;

  @ApiPropertyOptional({
    description: '가스 한도',
    example: 200000,
    default: 200000,
  })
  @IsOptional()
  @IsNumber()
  @Min(21000)
  gasLimit?: number;
}

/**
 * 스왑 시뮬레이션 DTO
 */
export class SimulateSwapDto {
  @ApiProperty({
    description: '풀 주소',
    example: '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8',
  })
  @IsString()
  poolAddress: string;

  @ApiProperty({
    description: '입력 토큰 심볼',
    example: 'ETH',
  })
  @IsString()
  tokenIn: string;

  @ApiProperty({
    description: '출력 토큰 심볼',
    example: 'USDC',
  })
  @IsString()
  tokenOut: string;

  @ApiProperty({
    description: '입력 토큰 수량',
    example: 1.5,
  })
  @IsNumber()
  @Min(0)
  amountIn: number;
}

/**
 * 유동성 추가 DTO
 */
export class AddLiquidityDto {
  @ApiProperty({
    description: '풀 주소',
    example: '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8',
  })
  @IsString()
  poolAddress: string;

  @ApiProperty({
    description: '토큰 A 수량',
    example: 10,
  })
  @IsNumber()
  @Min(0)
  amountA: number;

  @ApiProperty({
    description: '토큰 B 수량',
    example: 20000,
  })
  @IsNumber()
  @Min(0)
  amountB: number;

  @ApiProperty({
    description: '최소 토큰 A 수량',
    example: 9.9,
  })
  @IsNumber()
  @Min(0)
  amountAMin: number;

  @ApiProperty({
    description: '최소 토큰 B 수량',
    example: 19900,
  })
  @IsNumber()
  @Min(0)
  amountBMin: number;

  @ApiProperty({
    description: '수신자 주소',
    example: 'user-123',
  })
  @IsString()
  recipient: string;

  @ApiProperty({
    description: '데드라인 (타임스탬프)',
    example: 1759550728,
  })
  @IsNumber()
  deadline: number;
}

/**
 * 유동성 제거 DTO
 */
export class RemoveLiquidityDto {
  @ApiProperty({
    description: '풀 주소',
    example: '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8',
  })
  @IsString()
  poolAddress: string;

  @ApiProperty({
    description: '유동성 토큰 수량',
    example: 100,
  })
  @IsNumber()
  @Min(0)
  liquidityAmount: number;

  @ApiProperty({
    description: '최소 토큰 A 수량',
    example: 9.9,
  })
  @IsNumber()
  @Min(0)
  amountAMin: number;

  @ApiProperty({
    description: '최소 토큰 B 수량',
    example: 19900,
  })
  @IsNumber()
  @Min(0)
  amountBMin: number;

  @ApiProperty({
    description: '수신자 주소',
    example: 'user-123',
  })
  @IsString()
  recipient: string;

  @ApiProperty({
    description: '데드라인 (타임스탬프)',
    example: 1759550728,
  })
  @IsNumber()
  deadline: number;
}

/**
 * 풀 목록 조회 쿼리 DTO
 */
export class GetPoolsQueryDto {
  @ApiPropertyOptional({
    description: '활성 풀만 조회',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  activeOnly?: boolean;

  @ApiPropertyOptional({
    description: '특정 토큰 포함 풀만 조회',
    example: 'ETH',
  })
  @IsOptional()
  @IsString()
  token?: string;

  @ApiPropertyOptional({
    description: '정렬 기준',
    example: 'volume',
    enum: ['volume', 'liquidity', 'price', 'created'],
    default: 'volume',
  })
  @IsOptional()
  @IsEnum(['volume', 'liquidity', 'price', 'created'])
  sortBy?: 'volume' | 'liquidity' | 'price' | 'created';

  @ApiPropertyOptional({
    description: '정렬 방향',
    example: 'desc',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional({
    description: '페이지 크기',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: '오프셋',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;
}

/**
 * 풀 통계 조회 쿼리 DTO
 */
export class GetPoolStatsQueryDto {
  @ApiPropertyOptional({
    description: '풀 주소 (특정 풀만 조회)',
    example: '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8',
  })
  @IsOptional()
  @IsString()
  poolAddress?: string;

  @ApiPropertyOptional({
    description: '토큰 페어 (특정 페어만 조회)',
    example: 'ETH/USDC',
  })
  @IsOptional()
  @IsString()
  pair?: string;
}

/**
 * 오라클 설정 업데이트 DTO
 */
export class UpdateOracleConfigDto {
  @ApiPropertyOptional({
    description: 'TWAP 계산 기간 (초)',
    example: 300,
  })
  @IsOptional()
  @IsNumber()
  @Min(60)
  @Max(3600)
  twapPeriod?: number;

  @ApiPropertyOptional({
    description: '가격 업데이트 간격 (초)',
    example: 30,
  })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(300)
  updateInterval?: number;

  @ApiPropertyOptional({
    description: 'MEV 기회 탐지 임계값 (%)',
    example: 0.5,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(10)
  mevThreshold?: number;

  @ApiPropertyOptional({
    description: '가격 신뢰도 임계값',
    example: 0.8,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(1)
  confidenceThreshold?: number;

  @ApiPropertyOptional({
    description: '최대 가격 편차 (%)',
    example: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  maxDeviation?: number;

  @ApiPropertyOptional({
    description: '자동 실행 여부',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  autoExecute?: boolean;
}

/**
 * MEV 기회 조회 쿼리 DTO
 */
export class GetMEVOpportunitiesQueryDto {
  @ApiPropertyOptional({
    description: '풀 주소 (특정 풀만 조회)',
    example: '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8',
  })
  @IsOptional()
  @IsString()
  poolAddress?: string;

  @ApiPropertyOptional({
    description: 'MEV 전략 타입',
    example: 'arbitrage',
    enum: ['front_run', 'back_run', 'sandwich', 'arbitrage'],
  })
  @IsOptional()
  @IsEnum(['front_run', 'back_run', 'sandwich', 'arbitrage'])
  strategy?: 'front_run' | 'back_run' | 'sandwich' | 'arbitrage';

  @ApiPropertyOptional({
    description: '최소 예상 수익률 (%)',
    example: 1.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minProfit?: number;

  @ApiPropertyOptional({
    description: '최대 위험도',
    example: 3,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  maxRisk?: number;

  @ApiPropertyOptional({
    description: '실행 가능한 기회만 조회',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  executableOnly?: boolean;
}

/**
 * TWAP 조회 쿼리 DTO
 */
export class GetTWAPQueryDto {
  @ApiProperty({
    description: '풀 주소',
    example: '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8',
  })
  @IsString()
  poolAddress: string;

  @ApiPropertyOptional({
    description: 'TWAP 기간 (초)',
    example: 300,
    default: 300,
  })
  @IsOptional()
  @IsNumber()
  @Min(60)
  @Max(3600)
  period?: number;
}
