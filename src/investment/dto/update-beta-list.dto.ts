import { ApiProperty } from '@nestjs/swagger';

export class UpdateBetaListDto {
  @ApiProperty({
    type: String,
  })
  code: string;

  @ApiProperty({
    type: Number,
  })
  currPT: number;

  @ApiProperty({
    type: Number,
  })
  nextPT: number;

  @ApiProperty({
    type: Number,
  })
  ma: number;
}
