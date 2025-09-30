import { Global, Module } from '@nestjs/common';
import { BlockchainModule } from './blockchain/blockchain.module';

@Global()
@Module({
  imports: [BlockchainModule],
  exports: [BlockchainModule],
})
export class SharedModule {}
