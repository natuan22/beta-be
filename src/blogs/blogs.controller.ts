import { Body, Controller, Get, HttpStatus, Param, Post, Query, Req, Res, UploadedFile, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CatchException } from '../exceptions/common.exception';
import { BaseResponse } from '../utils/utils.response';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/createCategory.dto';
import { CategoryResponse, CategorySwagger } from './responses/category.response';
import { UpdateCategoryDto } from './dto/updateCategory.dto';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Role, Roles } from '../guards/roles.decorator';
import { PostService } from './post.service';
import { CreatePostDto } from './dto/createPost.dto';
import { PostResponse, PostSwagger } from './responses/post.response';
import { TagService } from './tag.service';
import { FormDataRequest } from 'nestjs-form-data';
import { UploadContentImageResponse } from './responses/uploadContentImage.response';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { PostDataDto } from './dto/postData.dto';
import { UpdatePostDto } from './dto/updatePost.dto';
import { GetPostsWithTagsDto } from './dto/getPostsWithTags.dto';

@ApiTags('Blogs - API')
@Controller('blogs')
export class BlogsController {
  constructor(
    private readonly categoryService: CategoryService,
    private readonly postService: PostService,
    private readonly tagService: TagService
  ) {}

  /**
  * 
  * Category
  * 
  **/
  // @UseGuards(AuthGuard, RolesGuard)
  // @Roles(Role.AdminBlogs)
  @ApiOperation({ summary: 'Tạo danh mục' })
  @ApiBody({ type: CreateCategoryDto })
  @ApiResponse({ status: HttpStatus.CREATED, type: CategorySwagger })
  @Post('/category/create')
  async createCategory(@Body() body: CreateCategoryDto, @Res() res: Response) {
    try {
      const data: CategoryResponse = await this.categoryService.createCategory(body);
      return res.status(HttpStatus.CREATED).send(new BaseResponse({ data }));
    } catch (e) {
      throw new CatchException(e);
    }
  }

  // @UseGuards(AuthGuard, RolesGuard)
  // @Roles(Role.AdminBlogs)
  @ApiOperation({ summary: 'Chỉnh sửa danh mục' })
  @ApiBody({ type: UpdateCategoryDto })
  @ApiResponse({ status: HttpStatus.OK, type: CategorySwagger })
  @Post('/category/update')
  async updateCategory(@Body() body: UpdateCategoryDto, @Res() res: Response) {
    try {
      const data = await this.categoryService.updateCategory(body);
      return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
    } catch (e) {
      throw new CatchException(e);
    }
  }

  // @UseGuards(AuthGuard, RolesGuard)
  // @Roles(Role.AdminBlogs)
  @ApiOperation({ summary: 'Lấy tất cả categories' })
  @Get('/category')
  async findAllCate(@Res() res: Response) {
    const data = await this.categoryService.findAllCate();
    return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
  }
  
  /**
  * 
  * Post
  * 
  **/
  // @UseGuards(AuthGuard, RolesGuard)
  // @Roles(Role.AdminBlogs)
  @FormDataRequest()
  @ApiOperation({ summary: 'Thêm bài viết mới' })
  @ApiResponse({ status: HttpStatus.CREATED, type: PostSwagger })
  @Post('/post/create')
  async createPost(@Body() body: CreatePostDto, @Res() res: Response) {
    try {
      const data: PostResponse = await this.postService.createPost(body);
      return res.status(HttpStatus.CREATED).send(new BaseResponse({ data }));
    } catch (e) {
      throw new CatchException(e);
    }
  }

  // @UseGuards(AuthGuard, RolesGuard)
  // @Roles(Role.AdminBlogs)
  @FormDataRequest()
  @ApiOperation({ summary: 'Chỉnh sửa danh mục' })
  @ApiBody({ type: UpdatePostDto })
  @ApiResponse({ status: HttpStatus.OK, type: PostSwagger })
  @Post('/post/update')
  async updatePost(@Body() body: UpdatePostDto, @Res() res: Response) {
    try {
      const data = await this.postService.updatePost(body);
      return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
    } catch (e) {
      throw new CatchException(e);
    }
  }

  // @UseGuards(AuthGuard, RolesGuard)
  // @Roles(Role.AdminBlogs)
  @ApiOperation({ summary: 'Upload ảnh trong content của post' })
  @UseInterceptors(AnyFilesInterceptor())
  @ApiOkResponse({ status: HttpStatus.OK, type: UploadContentImageResponse })
  @Post('/post/content-image-upload')
  async uploadContentImage(@UploadedFiles() files: any, @Res() res: Response) {
    try {
      const data = await this.postService.uploadContentImage(files);

      return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
    } catch (error) {
      throw new CatchException(error);
    }
  }
  
  // @UseGuards(AuthGuard, RolesGuard)
  // @Roles(Role.AdminBlogs)
  @ApiOperation({ summary: 'Lấy posts with id' })
  @Get('/post/:id')
  async getPostWithId(@Param() p: PostDataDto, @Res() res: Response) {
    const data = await this.postService.getPostWithId(p.id);
    return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
  }

  // @UseGuards(AuthGuard, RolesGuard)
  // @Roles(Role.AdminBlogs)
  @ApiOperation({ summary: 'Lấy posts with tags' })
  @Get('/post-tags')
  async findAllPostWithTag(@Query() q: GetPostsWithTagsDto, @Res() res: Response) {
    const data = await this.postService.findAllPostWithTag(q.tags.split(','));
    return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
  }

  // @UseGuards(AuthGuard, RolesGuard)
  // @Roles(Role.AdminBlogs)
  @ApiOperation({ summary: 'Lấy tất cả posts' })
  @Get('/post')
  async findAllPost(@Res() res: Response) {
    const data = await this.postService.findAllPost();
    return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
  }

  /**
  * 
  * Tag
  * 
  **/
  // @UseGuards(AuthGuard, RolesGuard)
  // @Roles(Role.AdminBlogs)
  @ApiOperation({ summary: 'Lấy tất cả tags' })
  @Get('/tag')
  async findAllTag(@Res() res: Response) {
    const data = await this.tagService.findAllTag();
    return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
  }

  
}
