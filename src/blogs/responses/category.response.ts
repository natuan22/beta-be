import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import { BaseResponse } from '../../utils/utils.response';

export class CategoryResponse {
  @ApiProperty({ type: Number, example: 1 })
  id: number;

  @ApiProperty({ type: String, example: 'Kiến thức tổng quát' })
  name: string;

  @ApiProperty({ type: String, example: 'Mô tả về danh mục này' })
  description: string;

  @ApiProperty({ type: Number, example: 1 })
  published: number;

  @ApiProperty({ type: Number, example: null })
  parent_id: number | null;

  constructor(data: any) {
    this.id = data?.id || 0;
    this.name = data?.name || '';
    this.description = data?.description || '';
    this.published = data?.published || 0;
    this.parent_id = data?.parent_id || null;
  }
}

export class CategorySwagger extends PartialType(BaseResponse) {
  @ApiProperty({
    type: CategoryResponse,
  })
  data: CategoryResponse;
}
