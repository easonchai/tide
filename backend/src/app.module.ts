import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { MarketModule } from './market/market.module';

@Module({
  imports: [PrismaModule, UserModule, MarketModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
