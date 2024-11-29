import { PartialType } from "@nestjs/mapped-types";
import { ApiProperty } from "@nestjs/swagger";
import { BaseResponse } from "../../utils/utils.response";
import { TagResponse } from "./tag.response";
import { CategoryResponse } from "./category.response";

export class PostResponse {
    @ApiProperty({ type: Number, example: 1 })
    id: number;

    @ApiProperty({ type: String, example: 'Chứng khoán là gì? Những thông tin cơ bản về thị trường chứng khoán' })
    title: string;

    @ApiProperty({ type: String, example: 'Một mô tả ngắn gọn về bài viết' })
    description: string;

    @ApiProperty({ type: String, example: 'Nội dung bài viết' })
    content: string;

    @ApiProperty({ type: String, example: 'URL hình ảnh bài viết' })
    thumbnail: string;

    @ApiProperty({ type: Number, example: 1 })
    published: number;

    @ApiProperty({ type: CategoryResponse, example: { id: 1, name: 'Finance' } })
    category: CategoryResponse;
    
    @ApiProperty({ type: [TagResponse], example: ['Tag 1', 'Tag 2'] })
    tags: string[];

    @ApiProperty({ type: Date })
    created_at: Date;

    constructor(data: any) {
        this.id = data?.id || 0;
        this.title = data?.title || '';
        this.description = data?.description || '';
        this.content = data?.content || '';
        this.thumbnail = data?.thumbnail || '';
        this.published = data?.published || 0;
        this.created_at = data?.created_at ?? new Date();
        this.category = data?.category ? new CategoryResponse(data.category) : null;
        this.tags = Array.isArray(data?.tags) ? data.tags.map(tag => new TagResponse(tag)) : [];
    }
}

export class PostSwagger extends PartialType(BaseResponse) {
    @ApiProperty({
      type: PostResponse,
    })
    data: PostResponse;
}