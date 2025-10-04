import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { TransactionType } from '../types/transaction.interface';

/**
 * 트랜잭션 제출 DTO
 */
export class SubmitTransactionDto {
  @ApiProperty({
    description: '트랜잭션 타입',
    enum: TransactionType,
    example: TransactionType.SWAP,
  })
  @IsEnum(TransactionType)
  type: TransactionType;

  @ApiProperty({
    description: '발신자 주소',
    example: 'user-0x1234',
  })
  @IsString()
  from: string;

  @ApiProperty({
    description: '수신자 주소 (컨트랙트 또는 EOA)',
    example: '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8',
  })
  @IsString()
  to: string;

  @ApiPropertyOptional({
    description: 'ETH 전송량 (wei 단위)',
    example: '0',
    default: '0',
  })
  @IsOptional()
  @IsString()
  value?: string;

  @ApiProperty({
    description: '트랜잭션 데이터 (hex 문자열)',
    example:
      '0x128acb080000000000000000000000000000000000000000000000000000000000000000',
  })
  @IsString()
  data: string;

  @ApiPropertyOptional({
    description: '가스 가격 (높을수록 우선순위 높음)',
    example: 100,
    default: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(50)
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
 * 블록 조회 쿼리 DTO
 */
export class GetBlocksQueryDto {
  @ApiPropertyOptional({
    description: '조회할 블록 개수',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({
    description: '건너뛸 블록 개수 (페이지네이션)',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;
}

/**
 * 트랜잭션 조회 쿼리 DTO
 */
export class GetTransactionsQueryDto {
  @ApiPropertyOptional({
    description: '조회할 트랜잭션 개수',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;
}

/**
 * 가스 추정 쿼리 DTO
 */
export class EstimateGasQueryDto {
  @ApiProperty({
    description: '트랜잭션 타입',
    enum: TransactionType,
    example: TransactionType.SWAP,
  })
  @IsEnum(TransactionType)
  type: TransactionType;
}
