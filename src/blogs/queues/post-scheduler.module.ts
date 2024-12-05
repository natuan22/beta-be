import { BullModule } from "@nestjs/bull";
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModuleModule } from "../../config-module/config-module.module";
import { ConfigServiceProvider } from "../../config-module/config-module.service";
import { DB_SERVER } from "../../constants";
import { QueueEnum } from "../../enums/queue.enum";
import { PostEntity } from "../entities/post.entity";
import { PostSchedulerProcessor } from "./post-scheduler.processor";
import { PostSchedulerService } from "./post-scheduler.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([PostEntity], DB_SERVER),
    //queue
    BullModule.forRootAsync({ imports: [ConfigModuleModule], useFactory: (config: ConfigServiceProvider) => config.createBullOptions(), inject: [ConfigServiceProvider] }),
    BullModule.registerQueue({ name: QueueEnum.PostScheduler }),
  ],
  providers: [PostSchedulerService, PostSchedulerProcessor],
  exports: [PostSchedulerModule, PostSchedulerService, PostSchedulerProcessor],
})
export class PostSchedulerModule {}
