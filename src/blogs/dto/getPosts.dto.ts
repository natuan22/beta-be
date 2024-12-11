import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetPostsDto {
  @IsOptional()
  @IsString()
  @ApiProperty({ type: String, example: 'Technology,Finance,test dev, ...', required: false })
  tags?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ type: String, example: '1,3,6, ...', required: false })
  categories?: string;
}
