import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsIn, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreatePostDto {
    @IsNotEmpty({ message: 'Title is required' })
    @IsString({ message: 'Title must be a string' })
    @ApiProperty({ type: String, example: 'Chứng khoán là gì? Những thông tin cơ bản về thị trường chứng khoán' })
    title: string;

    @IsNotEmpty({ message: 'Description is required' })
    @IsString({ message: 'Description must be a string' })
    @ApiProperty({ type: String, example: 'Một mô tả ngắn gọn về bài viết'})
    description: string;

    @IsNotEmpty({ message: 'Content is required' })
    @IsString({ message: 'Content must be a string' })
    @ApiProperty({ type: String, example: 'Nội dung bài viết'})
    content: string;
    
    @IsOptional()
    @ApiProperty({ example: '/blogs/post/originalName or file'})
    thumbnail?: any;

    @IsOptional()
    @ApiProperty({ type: Number, example: 1, default: 0 })
    published?: number;

    @IsOptional()
    @ApiProperty({ type: String, example: '2024-12-10T10:00:00Z', description: 'Date and time when the post is scheduled to be published' })
    scheduledAt?: string;

    @ApiProperty({ type: Number, example: 1 })
    category_id: number;

    @IsArray({ message: 'Tags must be an array of tag names' })
    @IsOptional()
    @IsString({ each: true, message: 'Each tag must be a string' })
    @ApiProperty({ type: [String], example: ['Technology', 'Finance'], description: 'Array of tag names' })
    tags?: string[];
}
