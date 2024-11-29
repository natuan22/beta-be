import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateCategoryDto {
    @IsNotEmpty({ message: 'Name is required' })
    @IsString({ message: 'Name must be a string' })
    @ApiProperty({ type: String, example: 'Kiến thức tổng quát' })
    name: string;

    @IsOptional()
    @IsString({ message: 'Description must be a string' })
    @ApiProperty({ type: String, example: 'Một mô tả ngắn gọn về danh mục', nullable: true })
    description?: string;

    @IsOptional()
    @IsInt({ message: 'Published must be an integer' })
    @IsIn([0, 1], { message: 'Published must be either 0 or 1' })
    @ApiProperty({ type: Number, example: 1, default: 0 })
    published?: number;

    @IsOptional()
    @IsInt({ message: 'Parent ID must be an integer' })
    @IsPositive({ message: 'Parent ID must be a positive number' })
    @ApiProperty({ type: Number, example: 1, nullable: true })
    parent_id?: number;
}
