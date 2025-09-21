import { Module } from '@nestjs/common';
import { MarketService } from './market.service';
import { MarketController } from './market.controller';
import { MarketTransactionService } from './providers/market-transaction.service';

@Module({
  providers: [MarketService, MarketTransactionService],
  controllers: [MarketController],
})
export class MarketModule {}
