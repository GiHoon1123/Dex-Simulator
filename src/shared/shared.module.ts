import { Global, Module } from '@nestjs/common';
import { BlockchainModule } from './blockchain/blockchain.module';
import { PoolModule } from './pool/pool.module';

@Global()
@Module({
  imports: [BlockchainModule, PoolModule],
  exports: [BlockchainModule, PoolModule],
})
export class SharedModule {}
