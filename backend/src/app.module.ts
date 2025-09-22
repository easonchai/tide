import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { MarketModule } from './market/market.module';
import { OracleModule } from './oracle/oracle.module';
import { ClientModule } from './client/client.module';
import { BlockchainModule } from './blockchain/blockchain.module';

@Module({
  imports: [
    PrismaModule,
    UserModule,
    MarketModule,
    OracleModule,
    ClientModule,
    BlockchainModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
