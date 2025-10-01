import { Module } from '@nestjs/common';
import { BlockService } from './block.service';
import { BlockchainController } from './blockchain.controller';
import { GasService } from './gas.service';
import { TransactionGeneratorService } from './transaction-generator.service';
import { TransactionPoolService } from './transaction-pool.service';

/**
 * BlockchainModule
 *
 * 블록체인 시뮬레이션의 핵심 모듈입니다.
 * 트랜잭션 풀, 블록 생성/실행, 가스 시스템, 트랜잭션 자동 생성을 제공합니다.
 *
 * 이 모듈은 SharedModule을 통해 전역으로 제공되어,
 * 모든 시뮬레이션 모듈에서 사용할 수 있습니다.
 */
@Module({
  controllers: [BlockchainController],
  providers: [
    TransactionPoolService,
    BlockService,
    GasService,
    TransactionGeneratorService,
  ],
  exports: [
    TransactionPoolService,
    BlockService,
    GasService,
    TransactionGeneratorService,
  ],
})
export class BlockchainModule {}
