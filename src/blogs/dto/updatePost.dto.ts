import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdatePostDto {
  @ApiProperty({ type: Number })
  id: number;

  @IsOptional()
  @IsString()
  @ApiProperty({ type: String })
  title?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ type: String, nullable: true })
  description?: string | null;

  @IsOptional()
  @IsString()
  @ApiProperty({ type: String })
  content?: string;

  @IsOptional()
  @ApiProperty({ example: '/blogs/post/originalName or file' })
  thumbnail?: any;

  @IsOptional()
  @ApiProperty({ type: Number, description: 'Indicates if the post is published (0 - no, 1 - yes)', default: 0 })
  published?: number;

  @ApiProperty({ type: Number, example: 1 })
  category_id: number;

  @IsArray({ message: 'Tags must be an array of tag names' })
  @IsOptional()
  @IsString({ each: true, message: 'Each tag must be a string' })
  @ApiProperty({ type: [String], example: ['Technology', 'Finance'], description: 'Array of tag names' })
  tags?: string[];
}
