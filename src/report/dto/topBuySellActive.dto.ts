import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class TopBuySellActiveDto {
  @IsNotEmpty()
  @ApiProperty({
    type: String,
    description: `HOSE, HNX, UPCOM`,
  })
  floor: string;
}
