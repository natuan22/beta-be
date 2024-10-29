import { Module } from '@nestjs/common';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';
import { MssqlService } from '../mssql/mssql.service';

@Module({
  controllers: [AnalysisController],
  providers: [AnalysisService, MssqlService],
})
export class AnalysisModule {}
