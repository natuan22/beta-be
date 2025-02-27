import { ApiProperty } from '@nestjs/swagger';

export class NewsProxyDto {
  @ApiProperty({
    type: String,
  })
  url: string;
}
