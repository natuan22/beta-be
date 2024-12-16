import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import * as moment from 'moment';
import { In, Repository } from "typeorm";
import { DB_SERVER } from "../constants";
import { CatchException } from "../exceptions/common.exception";
import { MinioOptionService } from "../minio/minio.service";
import { UtilCommonTemplate } from "../utils/utils.common";
import { CreatePostDto } from "./dto/createPost.dto";
import { UpdatePostDto } from "./dto/updatePost.dto";
import { CategoryEntity } from "./entities/catetory.entity";
import { PostEntity } from "./entities/post.entity";
import { TagEntity } from "./entities/tag.entity";
import { PostSchedulerService } from "./queues/post-scheduler.service";
import { GetAllPostResponse } from "./responses/getAllPosts.response";
import { PostResponse } from "./responses/post.response";

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
        private readonly postSchedulerService: PostSchedulerService,
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
            scheduledAt: data.scheduledAt ? moment(data.scheduledAt).toDate() : null,
            category,
            tags,
        });
        
        await this.postRepo.save(post);

        if (post.scheduledAt) {
            await this.postSchedulerService.schedulePost(post.id, post.scheduledAt);
        }

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

            // Cập nhật scheduledAt (nếu có giá trị)
            if (data.scheduledAt) {
                post.scheduledAt = moment(data.scheduledAt).toDate();
            }

            // Lưu bài viết và các mối quan hệ mới
            await this.postRepo.save(post);

            // Add job to queue if scheduledAt is updated
            if (post.scheduledAt) {
                await this.postSchedulerService.schedulePost(post.id, post.scheduledAt);
            }

            // Lấy lại bài viết đã cập nhật và trả về kết quả
            const updatedPost = await this.postRepo.findOne({ where: { id: post.id }, relations: ['category', 'tags'] });
            return new PostResponse(updatedPost);
        } catch (error) {
            throw new CatchException(error);
        }
    }
    
    async deletePost(id: any) {
        if (!id) {
          throw new Error('ID không được để trống.');
        }
      
        // Nếu id là một mảng, xử lý xóa nhiều bài viết
        if (Array.isArray(id)) {
            id = id.map((item) => (typeof item === 'string' && !isNaN(Number(item)) ? Number(item) : item));
            const result = await this.postRepo.delete(id);
            return result.affected || 0; // Số lượng bài viết đã xóa
        }

        if (typeof id === 'string' && !isNaN(Number(id))) { id = Number(id) }

        // Nếu id là một giá trị đơn lẻ, xử lý xóa một bài viết
        const result = await this.postRepo.delete({ id });
        return result.affected || 0; // Số lượng bài viết đã xóa
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
            const posts = await this.postRepo.createQueryBuilder('post').leftJoinAndSelect('post.tags', 'tag').where('tag.name IN (:...tags)', { tags }).getMany();
        
            const postResponses = posts.map((post) => {
                const { id, title, description, content, thumbnail, published, created_at, updated_at, scheduledAt, category, tags } = post;
            
                return new GetAllPostResponse({ 
                    id, title, description, content, thumbnail, published, created_at, updated_at, scheduledAt,
                    category: category ? { id: category.id, name: category.name, description: category.description, published: category.published, parent_id: category.parent_id } : null,
                    tags: tags?.map(({ id, name, description, published }) => ({ id, name, description, published, })) || [],
                });
            });
        
            return postResponses;
        } catch (e) {
            throw new CatchException(e);
        }
    }

    async findAllPost() {
        try {
            // Lấy danh sách bài viết và mối quan hệ
            const posts = await this.postRepo.find({ relations: ['category', 'tags'], order: { created_at: 'DESC' } });
    
            const postResponses = posts.map((post) => {
                const { id, title, description, content, thumbnail, published, created_at, updated_at, scheduledAt, category, tags } = post;
            
                return new GetAllPostResponse({ 
                    id, title, description, content, thumbnail, published, created_at, updated_at, scheduledAt,
                    category: category ? { id: category.id, name: category.name, description: category.description, published: category.published, parent_id: category.parent_id } : null,
                    tags: tags?.map(({ id, name, description, published }) => ({ id, name, description, published, })) || [],
                });
            });
    
            return postResponses;
        } catch (e) {
            throw new CatchException(e);
        }
    }

    async findAllPostWithQuery(query: any) {
        try {
            const conditions: any = {};
      
            if (query.tags) {
                const tags = query.tags.split(',');
                conditions.tags = tags;
            }
        
            if (query.categories) {
                const categories = query.categories.split(',');
                conditions.categories = categories;
            }

            // Start building the query
            const qb = this.postRepo.createQueryBuilder('post')
                .leftJoinAndSelect('post.tags', 'tag')
                .leftJoinAndSelect('post.category', 'category')
                .where('post.published = :published', { published: 1 });

            // Apply tag filter if tags are provided
            if (conditions.tags && conditions.tags.length > 0) {
                qb.andWhere('tag.name IN (:...tags)', { tags: conditions.tags });
            }

            // Apply category filter if categories are provided
            if (conditions.categories && conditions.categories.length > 0) {
                qb.andWhere('category.id IN (:...categories)', { categories: conditions.categories });
            }

            qb.orderBy('post.created_at', 'DESC');

            const posts = await qb.getMany();

            if (!posts.length) {
                return { message: 'No posts found with the given criteria.' };
            }

            const postResponses = posts.map((post) => {
                const { id, title, description, content, thumbnail, published, created_at, updated_at, scheduledAt, category, tags } = post;
            
                return new GetAllPostResponse({ 
                    id, title, description, content, thumbnail, published, created_at, updated_at, scheduledAt,
                    category: category ? { id: category.id, name: category.name, description: category.description, published: category.published, parent_id: category.parent_id } : null,
                    tags: tags?.map(({ id, name, description, published }) => ({ id, name, description, published })) || [],
                });
            });
    
            return postResponses;
        } catch (e) {
            throw new Error(`Error fetching posts: ${e.message}`);
        }
    }
}