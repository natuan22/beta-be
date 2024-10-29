import { ApiProperty } from '@nestjs/swagger';

export class DeleteBetaListDto {
  @ApiProperty({
    type: String,
  })
  code: string;
}
