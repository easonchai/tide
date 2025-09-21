import { Module } from '@nestjs/common';
import { ClientModule } from '../client/client.module';
import { BlockchainService } from './blockchain.service';

@Module({
  imports: [ClientModule],
  providers: [BlockchainService],
  exports: [BlockchainService],
})
export class BlockchainModule {}
