import { Module } from '@nestjs/common';
import { InvestmentModule } from '../investment/investment.module';
import { MssqlService } from '../mssql/mssql.service';
import { StockService } from '../stock/stock.service';
import { KafkaConsumer } from './kafka.consumer';
import { KafkaService } from './kafka.service';

@Module({
  imports: [InvestmentModule],
  controllers: [KafkaConsumer],
  providers: [KafkaService, StockService, MssqlService],
})
export class KafkaModule {}
