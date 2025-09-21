import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { OracleService } from './oracle.service';
import { OracleController } from './oracle.controller';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [OracleService],
  controllers: [OracleController],
})
export class OracleModule {}
