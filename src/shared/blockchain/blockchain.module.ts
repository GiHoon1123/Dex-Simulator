import { Module } from '@nestjs/common';
import { BlockService } from './block.service';
import { GasService } from './gas.service';
import { TransactionPoolService } from './transaction-pool.service';

@Module({
  providers: [TransactionPoolService, BlockService, GasService],
  exports: [TransactionPoolService, BlockService, GasService],
})
export class BlockchainModule {}
