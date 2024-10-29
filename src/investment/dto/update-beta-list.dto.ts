import { ApiProperty } from '@nestjs/swagger';

export class UpdateBetaListDto {
  @ApiProperty({
    type: String,
  })
  code: string;

  @ApiProperty({
    type: Number,
  })
  price_2024: number;

  @ApiProperty({
    type: Number,
  })
  price_2025: number;

  @ApiProperty({
    type: Number,
  })
  ma: number;
}
