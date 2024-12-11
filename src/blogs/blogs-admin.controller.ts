import { Body, Controller, Get, HttpStatus, Param, Post, Query, Res, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { FormDataRequest } from 'nestjs-form-data';
import { CatchException } from '../exceptions/common.exception';
import { AuthGuard } from '../guards/auth.guard';
import { Role, Roles } from '../guards/roles.decorator';
import { RolesGuard } from '../guards/roles.guard';
import { BaseResponse } from '../utils/utils.response';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/createCategory.dto';
import { CreatePostDto } from './dto/createPost.dto';
import { GetPostsWithTagsDto } from './dto/getPostsWithTags.dto';
import { PostDataDto } from './dto/postData.dto';
import { UpdateCategoryDto } from './dto/updateCategory.dto';
import { UpdatePostDto } from './dto/updatePost.dto';
import { PostService } from './post.service';
import { CategoryResponse, CategorySwagger } from './responses/category.response';
import { PostResponse, PostSwagger } from './responses/post.response';
import { UploadContentImageResponse } from './responses/uploadContentImage.response';
import { TagService } from './tag.service';

@ApiTags('Blogs Admin - API')
@Controller('blogs-admin')
export class BlogsControllerAdmin {
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
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.AdminBlogs)
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

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.AdminBlogs)
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

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.AdminBlogs)
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
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.AdminBlogs)
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

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.AdminBlogs)
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

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.AdminBlogs)
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

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.AdminBlogs)
  @ApiOperation({ summary: 'Xoá bài viết' })
  @ApiOkResponse({ status: HttpStatus.OK })
  @Post('/post/delete-post')
  async deletePost(@Body() body: { id: any }, @Res() res: Response) {
    try {
      let { id } = body;
      if (typeof id === 'string' && !isNaN(Number(id))) { id = Number(id) }
  
      if (Array.isArray(id)) { id = id.map((item) => (typeof item === 'string' && !isNaN(Number(item)) ? Number(item) : item)) }
      const deletedCount = await this.postService.deletePost(id);
  
      return res.status(HttpStatus.OK).send(new BaseResponse({ data: { deletedCount }, message: `${deletedCount} bài viết đã được xóa.` }));
    } catch (error) {
      throw new CatchException(error);
    }
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.AdminBlogs)
  @ApiOperation({ summary: 'Lấy tất cả posts' })
  @Get('/post')
  async findAllPost(@Res() res: Response) {
    const data = await this.postService.findAllPost();
    return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.AdminBlogs)
  @ApiOperation({ summary: 'Lấy tất cả tags' })
  @Get('/tag')
  async findAllTag(@Res() res: Response) {
    const data = await this.tagService.findAllTag();
    return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.AdminBlogs)
  @ApiOperation({ summary: 'Lấy posts with id' })
  @Get('/post/:id')
  async getPostWithId(@Param() p: PostDataDto, @Res() res: Response) {
    const data = await this.postService.getPostWithId(p.id);
    return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.AdminBlogs)
  @ApiOperation({ summary: 'Lấy posts with tags' })
  @Get('/post-tags')
  async findAllPostWithTag(@Query() q: GetPostsWithTagsDto, @Res() res: Response) {
    const data = await this.postService.findAllPostWithTag(q.tags.split(','));
    return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
  }
}
