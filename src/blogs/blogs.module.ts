import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NestjsFormDataModule } from 'nestjs-form-data';
import { DB_SERVER } from '../constants';
import { QueueEnum } from '../enums/queue.enum';
import { MinioOptionModule } from '../minio/minio.module';
import { CategoryService } from './category.service';
import { CategoryEntity } from './entities/catetory.entity';
import { PostEntity } from './entities/post.entity';
import { TagEntity } from './entities/tag.entity';
import { PostService } from './post.service';
import { PostSchedulerService } from './queues/post-scheduler.service';
import { TagService } from './tag.service';
import { BlogsControllerAdmin } from './blogs-admin.controller';
import { BlogsControllerUser } from './blogs-user.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([CategoryEntity, PostEntity, TagEntity], DB_SERVER), 
    NestjsFormDataModule, 
    MinioOptionModule,
    BullModule.registerQueue({ name: QueueEnum.PostScheduler }),
  ],
  controllers: [BlogsControllerAdmin, BlogsControllerUser],
  providers: [CategoryService, PostService, TagService, JwtService, PostSchedulerService],
})
export class BlogsModule {}
