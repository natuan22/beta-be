import {
  CacheModule,
  MiddlewareConsumer,
  Module,
  NestModule,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ClientProxyFactory } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MinioModule } from 'nestjs-minio-client';
import { KafkaModule as KafkaConfigModule } from 'ngthminhdev-nestjs-kafka';
import { AuthModule } from './auth/auth.module';
import { DeviceEntity } from './auth/entities/device.entity';
import { ConfigModuleModule } from './config-module/config-module.module';
import { ConfigServiceProvider } from './config-module/config-module.service';
import { DB_SERVER } from './constants';
import { HttpConfigModule } from './http/http.module';
import { InvestmentModule } from './investment/investment.module';
import { KafkaModule } from './kafka/kafka.module';
import { MacroModule } from './macro/macro.module';
import { MarketModule } from './market/market.module';
import { RealIpMiddleware } from './middlewares/real-ip.middleware';
import { MssqlModule } from './mssql/mssql.module';
import { NewsModule } from './news/news.module';
import { QueueModule } from './queue/queue.module';
import { ReportModule } from './report/report.module';
import { RetailModule } from './retail/retail.module';
import { SharesModule } from './shares/shares.module';
import { SocketModule } from './socket/socket.module';
import { StockModule } from './stock/stock.module';
import { UserEntity } from './user/entities/user.entity';
import { UserModule } from './user/user.module';
import { WatchlistModule } from './watchlist/watchlist.module';
import { FilterModule } from './filter/filter.module';
import { AnalysisModule } from './analysis/analysis.module';
import { TCBSModule } from './tcbs/tcbs.module';
import { BlogsModule } from './blogs/blogs.module';
import { PostSchedulerModule } from './blogs/queues/post-scheduler.module';
import { SignalWarningModule } from './signal-warning/signal-warning.module';

@Module({
  imports: [
    //env
    ConfigModule.forRoot({ isGlobal: true }),

    //ORM
    // TypeOrmModule.forRootAsync({
    //   imports: [ConfigModuleModule],
    //   useFactory: (config: ConfigServiceProvider) =>
    //     config.createTypeOrmOptions(),
    //   inject: [ConfigServiceProvider],
    // }),
    TypeOrmModule.forRootAsync({ name: DB_SERVER, imports: [ConfigModuleModule], 
      useFactory: (config: ConfigServiceProvider) => config.createMssqlOptions(), inject: [ConfigServiceProvider]
    }),

    //jwt
    JwtModule.registerAsync({ imports: [ConfigModuleModule],
      useFactory: (config: ConfigServiceProvider) => config.createJwtOptions(), inject: [ConfigServiceProvider]
    }),

    //redis
    CacheModule.registerAsync({ imports: [ConfigModuleModule], isGlobal: true, inject: [ConfigServiceProvider],
      useFactory: async (config: ConfigServiceProvider) => { return await config.createRedisOptions() },
    }),

    //kakfa
    KafkaConfigModule.registerAsync({ imports: [ConfigModuleModule], inject: [ConfigServiceProvider],
      useFactory: (config: ConfigServiceProvider) => ClientProxyFactory.create(config.createKafkaConfig())
    }),

    //Minio
    MinioModule.registerAsync({ imports: [ConfigModuleModule], inject: [ConfigServiceProvider], isGlobal: true,
      useFactory: (configService: ConfigServiceProvider) => configService.minioConfig()
    }),

    //aplication modules
    ConfigModuleModule,
    MssqlModule,
    StockModule,
    AuthModule,
    UserModule,
    QueueModule,
    SocketModule,
    MarketModule,
    MacroModule,
    KafkaModule,
    RetailModule,
    NewsModule,
    ReportModule,
    SharesModule,
    InvestmentModule,
    HttpConfigModule,
    WatchlistModule,
    FilterModule,
    AnalysisModule,
    TCBSModule,
    BlogsModule,
    PostSchedulerModule,
    SignalWarningModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RealIpMiddleware).forRoutes('*');
  }
}
