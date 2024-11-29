import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { PostEntity } from "./entities/post.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { DB_SERVER } from "../constants";
import { CreatePostDto } from "./dto/createPost.dto";
import { PostResponse } from "./responses/post.response";
import { TagEntity } from "./entities/tag.entity";
import { CategoryEntity } from "./entities/catetory.entity";
import { MinioOptionService } from "../minio/minio.service";
import { CatchException } from "../exceptions/common.exception";
import { UtilCommonTemplate } from "../utils/utils.common";
import { GetAllPostResponse } from "./responses/getAllPosts.response";
import * as moment from 'moment';
import { UpdatePostDto } from "./dto/updatePost.dto";

@Injectable()
export class PostService {
    constructor(
        @InjectRepository(CategoryEntity, DB_SERVER)
        private readonly categoryRepo: Repository<CategoryEntity>,
        @InjectRepository(PostEntity, DB_SERVER)
        private readonly postRepo: Repository<PostEntity>,
        @InjectRepository(TagEntity, DB_SERVER)
        private readonly tagRepo: Repository<TagEntity>,
        private readonly minio: MinioOptionService,
    ) {}
    
    async createPost(data: CreatePostDto): Promise<PostResponse> {
        const category = await this.categoryRepo.findOne({ where: { id: data.category_id }});
        if (!category) {
            throw new HttpException('Không tìm thấy danh mục bạn muốn thêm bài viết', HttpStatus.NOT_FOUND);
        }

        // Find or create the tags
        let tags: TagEntity[] = [];
        if (data.tags && data.tags.length > 0) {
            // Find tags by their names instead of IDs
            tags = await this.tagRepo.find({ where: { name: In(data.tags) }});

            // Find missing tag names
            const missingTagNames = data.tags.filter(tagName => !tags.some(tag => tag.name === tagName));
            if (missingTagNames.length > 0) {
                // Optionally, create missing tags here
                const missingTags = missingTagNames.map(tagName => {
                    const newTag = new TagEntity();
                    newTag.name = tagName;
                    newTag.published = 1;
                    return newTag;
                });

                // Save new tags
                const savedTags = await this.tagRepo.save(missingTags);
                tags = [...tags, ...savedTags];
            }
        }

        let thumbnailPath: string | `/resources/blogs/post/default_thumnail_post.png`;
        const now = moment().format('DD-MM-YYYY');
        if (data.thumbnail) {
            // Upload the file to MinIO
            const minioPath = `blogs/post/${now}/${UtilCommonTemplate.removeVietnameseString(data.thumbnail.originalName)}`
            await this.minio.put(
                `resources`, minioPath, data.thumbnail.buffer,
                { 'Content-Type': data.thumbnail.mimetype, 'X-Amz-Meta-Testing': 1234 }
            );
            
            // Set the thumbnail to the MinIO path
            thumbnailPath = `/resources/${minioPath}`;
        }

        const post = this.postRepo.create({
            title: data.title,
            description: data.description,
            content: data.content,
            thumbnail: thumbnailPath,
            published: data.published || 0,
            category,
            tags,
        });
        
        await this.postRepo.save(post);

        return new PostResponse(post);
    }

    async updatePost(data: UpdatePostDto): Promise<PostResponse> {
        try {
            // Lấy bài viết cần cập nhật
            const post = await this.postRepo.findOne({ where: { id: data.id }, relations: ['category', 'tags'] });
            if (!post) {
                throw new HttpException('Không tìm thấy bài viết', HttpStatus.NOT_FOUND);
            }
    
            // Lấy danh mục bài viết cần sửa
            const category = await this.categoryRepo.findOne({ where: { id: data.category_id } });
            if (!category) {
                throw new HttpException('Không tìm thấy danh mục bạn muốn sửa cho bài viết', HttpStatus.NOT_FOUND);
            }
    
            // Xử lý thumbnail
            let thumbnailPath: string | `/resources/blogs/post/default_thumnail_post.png` = '/resources/blogs/post/default_thumnail_post.png';
            if (data.thumbnail) {
                if (typeof data.thumbnail === 'string') {
                    thumbnailPath = data.thumbnail;
                } else {
                    const now = moment().format('DD-MM-YYYY');
                    const minioPath = `blogs/post/${now}/${UtilCommonTemplate.removeVietnameseString(data.thumbnail.originalName)}`;
                    await this.minio.put(
                        `resources`, minioPath, data.thumbnail.buffer,
                        { 'Content-Type': data.thumbnail.mimetype, 'X-Amz-Meta-Testing': 1234 }
                    );
                    
                    thumbnailPath = `/resources/${minioPath}`;
                }
            }
    
            // Xử lý các tag mới
            let updatedTags = [];
            if (data.tags && data.tags.length > 0) {
                // Tạo các tag mới nếu chưa tồn tại trong cơ sở dữ liệu
                for (const tagName of data.tags) {
                    let tag = await this.tagRepo.findOne({ where: { name: tagName } });
                    if (!tag) {
                        tag = this.tagRepo.create({ name: tagName });
                        tag = await this.tagRepo.save(tag);
                    }
                    updatedTags.push(tag);
                }
    
                // Xóa các mối quan hệ cũ (tag không có trong data.tags)
                post.tags = post.tags.filter((existingTag) => data.tags.includes(existingTag.name));
                
                // Thêm mối quan hệ mới (các tag trong updatedTags mà chưa có trong post.tags)
                updatedTags.forEach((newTag) => {
                    if (!post.tags.some((existingTag) => existingTag.id === newTag.id)) {
                        post.tags.push(newTag);
                    }
                });
            }
            
            // Cập nhật bài viết với các thông tin mới
            post.title = data.title;
            post.description = data.description;
            post.content = data.content;
            post.thumbnail = thumbnailPath;
            post.published = data.published || 0;
            post.category = category;
    
            // Lưu bài viết và các mối quan hệ mới
            await this.postRepo.save(post);
            
            // Lấy lại bài viết đã cập nhật và trả về kết quả
            const updatedPost = await this.postRepo.findOne({ where: { id: post.id }, relations: ['category', 'tags'] });
            return new PostResponse(updatedPost);
        } catch (error) {
            throw new CatchException(error);
        }
    }
    

    async uploadContentImage(files: any[]) {
        try {
            const urls = [];
            const now = moment().format('DD-MM-YYYY');
            
            for (const file of files) {
                const filePath = `blogs/post/${now}/${UtilCommonTemplate.removeVietnameseString(file.originalname)}`;
                
                await this.minio.put(
                    `resources`, filePath, file.buffer, 
                    { 'Content-Type': file.mimetype, 'X-Amz-Meta-Testing': 1234 }
                );
                const url = `/resources/${filePath}`;
                urls.push(url)
            }
            return { urls };
        } catch (e) {
            throw new CatchException(e);
        }
    }

    async getPostWithId(id: number) {
        try {
            const post = await this.postRepo.findOne({ where: { id }, relations: ['category', 'tags'] })
            if (!post) {
                throw new HttpException('Không tìm thấy bài viết', HttpStatus.NOT_FOUND);
            }
            return new PostResponse(post)
        } catch (error) {
            throw new CatchException(error);
        }
    }

    async findAllPostWithTag(tags: string[]) {
        try {
            // Tìm các bài viết có liên quan đến các tags
            const posts = await this.postRepo
              .createQueryBuilder('post')
              .leftJoinAndSelect('post.tags', 'tag') // Giả sử mỗi bài viết có quan hệ nhiều-nhiều với bảng tags
              .where('tag.name IN (:...tags)', { tags }) // Lọc các bài viết có ít nhất một tag trong danh sách tags
              .getMany(); // Lấy tất cả các bài viết phù hợp
        
            // Chuyển đổi dữ liệu sang định dạng GetAllPostResponse
            const postResponses = posts.map((post) => new GetAllPostResponse({
              id: post.id,
              title: post.title,
              description: post.description,
              content: post.content,
              thumbnail: post.thumbnail,
              published: post.published,
              created_at: post.created_at,
              updated_at: post.updated_at,
              category: post.category ? {
                id: post.category.id,
                name: post.category.name,
                description: post.category.description,
                published: post.category.published,
                parent_id: post.category.parent_id,
              } : null,
              tags: post.tags ? post.tags.map(tag => ({
                id: tag.id,
                name: tag.name,
                description: tag.description,
                published: tag.published,
              })) : [],
            }));
        
            return postResponses;
          } catch (e) {
            throw new CatchException(e);
          }
    }

    async findAllPost() {
        try {
            // Lấy danh sách bài viết và mối quan hệ
            const posts = await this.postRepo.find({ relations: ['category', 'tags'] });
    
            // Chuyển đổi dữ liệu sang định dạng GetAllPostResponse
            const postResponses = posts.map((post) => new GetAllPostResponse({
                id: post.id,
                title: post.title,
                description: post.description,
                content: post.content,
                thumbnail: post.thumbnail,
                published: post.published,
                created_at: post.created_at,
                updated_at: post.updated_at,
                category: post.category ? {
                    id: post.category.id,
                    name: post.category.name,
                    description: post.category.description,
                    published: post.category.published,
                    parent_id: post.category.parent_id,
                } : null,
                tags: post.tags ? post.tags.map(tag => ({
                    id: tag.id,
                    name: tag.name,
                    description: tag.description,
                    published: tag.published,
                })) : [],
            }));
    
            return postResponses;
        } catch (e) {
            throw new CatchException(e);
        }
    }
}