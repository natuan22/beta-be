import { Controller, Get, HttpStatus, Param, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { BaseResponse } from '../utils/utils.response';
import { CategoryService } from './category.service';
import { GetPostsDto } from './dto/getPosts.dto';
import { PostDataDto } from './dto/postData.dto';
import { PostService } from './post.service';
import { TagService } from './tag.service';

@ApiTags('Blogs User - API')
@Controller('blogs-user')
export class BlogsControllerUser {
    constructor(
        private readonly categoryService: CategoryService,
        private readonly postService: PostService,
        private readonly tagService: TagService
    ) {}

    /**
     * 
     * User
     * 
    **/
    @ApiOperation({ summary: 'Lấy tất cả categories' })
    @Get('/category')
    async findAllCateUser(@Res() res: Response) {
        const data = await this.categoryService.findAllCateUser();
        return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
    }

    @ApiOperation({ summary: 'Lấy posts with query' })
    @Get('/post')
    async findAllPostWithCate(@Query() q: GetPostsDto, @Res() res: Response) {
        const data = await this.postService.findAllPostWithQuery(q);
        return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
    }

    @ApiOperation({ summary: 'Lấy posts with id' })
    @Get('/post/:id')
    async getUserPostWithId(@Param() p: PostDataDto, @Res() res: Response) {
        const data = await this.postService.getPostWithId(p.id);
        return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
    }
}