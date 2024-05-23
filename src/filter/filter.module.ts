import { Module } from '@nestjs/common';
import { FilterService } from './filter.service';
import { FilterController } from './filter.controller';
import { MssqlService } from '../mssql/mssql.service';

@Module({
  controllers: [FilterController],
  providers: [FilterService, MssqlService]
})
export class FilterModule {}
