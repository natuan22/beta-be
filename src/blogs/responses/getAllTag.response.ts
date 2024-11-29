import { ApiProperty } from '@nestjs/swagger';

export class GetAllTagResponse {
    @ApiProperty({ type: String, example: 'Kiến thức tổng quát' })
    name: string;
  
    @ApiProperty({ type: String, example: 'Mô tả về danh mục này' })
    description: string;
  
    @ApiProperty({ type: Number, example: 1 })
    published: number;

    @ApiProperty({ type: Date })
    created_at: Date;

    @ApiProperty({ type: Date })
    updated_at: Date;
  
    constructor(data: Partial<GetAllTagResponse>) {
      this.name = data?.name ?? '';
      this.description = data?.description ?? '';
      this.published = data?.published ?? 0;
      this.created_at = data?.created_at ?? new Date();
      this.updated_at = data?.updated_at ?? new Date();
    }

    static mapToList(data?: GetAllTagResponse[]): GetAllTagResponse[] {
      return data ? data.map(item => new GetAllTagResponse(item)) : [];
    }
}
