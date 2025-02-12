import { ApiProperty } from '@nestjs/swagger';

export class TestQueryDto {
  @ApiProperty({ type: String })
  stock: string;
}
