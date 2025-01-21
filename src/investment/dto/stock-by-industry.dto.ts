import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class StockByIndustryDto {
  @IsString()
  @ApiProperty({ type: String, example: 'Tài nguyên' })
  industry: string;
}
