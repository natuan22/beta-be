import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { TopNetBuyingAndSellingDto } from './topNetBuyingAndSelling.dto';

export class TopNetBuyingAndSellingNewDto extends TopNetBuyingAndSellingDto {
  @IsNotEmpty()
  @ApiProperty({
    type: String,
    description: `HOSE, HNX, UPCOM`,
  })
  floor: string;
}
