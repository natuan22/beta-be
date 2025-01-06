import { ApiProperty } from '@nestjs/swagger';

export class CreateBetaListDto {
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

  @ApiProperty({
    type: Number,
    description: 'Truyền lên 1',
  })
  is_beta_page: Number;
}
