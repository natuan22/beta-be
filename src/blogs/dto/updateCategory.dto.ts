import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateCategoryDto {
  @IsNotEmpty()
  @IsInt()
  @ApiProperty({ type: Number })
  id: number;

  @IsOptional()
  @IsString()
  @ApiProperty({ type: String })
  name?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ type: String, nullable: true })
  description?: string | null;

  @IsOptional()
  @IsInt({ message: 'Published must be an integer' })
  @IsIn([0, 1], { message: 'Published must be either 0 or 1' })
  @ApiProperty({ type: Number, description: 'Indicates if the category is published (0 - no, 1 - yes)', default: 0 })
  published?: number;

  @IsOptional()
  @IsInt()
  @ApiProperty({ type: Number, description: 'ID of the parent category, if any', nullable: true })
  parent_id?: number | null;
}
