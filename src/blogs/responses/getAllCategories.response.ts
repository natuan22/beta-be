import { ApiProperty } from '@nestjs/swagger';

export class GetAllCategoriesResponse {
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

  @ApiProperty({ type: Date })
  created_at: Date;

  @ApiProperty({ type: Date })
  updated_at: Date;

  @ApiProperty({ type: [GetAllCategoriesResponse], isArray: true, description: 'List of subcategories' })
  children: GetAllCategoriesResponse[] | null;

  constructor(data: Partial<GetAllCategoriesResponse>) {
    this.id = data?.id ?? 0;
    this.name = data?.name ?? '';
    this.description = data?.description ?? '';
    this.published = data?.published ?? 0;
    this.parent_id = data?.parent_id ?? null;
    this.created_at = data?.created_at ?? new Date();
    this.updated_at = data?.updated_at ?? new Date();
    this.children = data?.children ?? null;
  }

  static mapToList(data?: GetAllCategoriesResponse[]): GetAllCategoriesResponse[] {
    return data ? data.map(item => new GetAllCategoriesResponse(item)) : [];
  }
}
