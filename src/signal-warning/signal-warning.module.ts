import { Module } from '@nestjs/common';
import { MssqlService } from '../mssql/mssql.service';
import { SignalWarningController } from './signal-warning.controller';
import { SignalWarningService } from './signal-warning.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SignalWarningUserEntity } from './entities/signal-warning.entity';
import { DB_SERVER } from '../constants';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [TypeOrmModule.forFeature([SignalWarningUserEntity], DB_SERVER)],
  controllers: [SignalWarningController],
  providers: [SignalWarningService, MssqlService, JwtService],
  exports: [SignalWarningModule, SignalWarningService],
})
export class SignalWarningModule {}
