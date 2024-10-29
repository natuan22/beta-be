import { Module } from '@nestjs/common';
import { WatchlistService } from './watchlist.service';
import { WatchlistController } from './watchlist.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WatchListEntity } from './entities/watchlist.entity';
import { DB_SERVER } from '../constants';
import { JwtService } from '@nestjs/jwt';
import { ReportService } from '../report/report.service';
import { ReportModule } from '../report/report.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WatchListEntity], DB_SERVER),
    ReportModule,
  ],
  controllers: [WatchlistController],
  providers: [WatchlistService, JwtService],
})
export class WatchlistModule {}
