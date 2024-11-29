import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetPostsWithTagsDto {
  @IsString()
  @ApiProperty({ type: String, example: 'Technology,Finance,test dev, ...' })
  tags: string;
}
