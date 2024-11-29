import { Module } from '@nestjs/common';
import { DB_SERVER } from '../constants';
import { TagEntity } from './entities/tag.entity';
import { PostEntity } from './entities/post.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoryEntity } from './entities/catetory.entity';
import { CategoryService } from './category.service';
import { JwtService } from '@nestjs/jwt';
import { BlogsController } from './blogs.controller';
import { PostService } from './post.service';
import { TagService } from './tag.service';
import { NestjsFormDataModule } from 'nestjs-form-data';
import { MinioOptionModule } from '../minio/minio.module';

@Module({
  imports: [TypeOrmModule.forFeature([CategoryEntity, PostEntity, TagEntity], DB_SERVER), NestjsFormDataModule, MinioOptionModule],
  controllers: [BlogsController],
  providers: [CategoryService, PostService, TagService, JwtService],
})
export class BlogsModule {}
