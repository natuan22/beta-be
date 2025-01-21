import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class IdParamSignalDto {
  @IsNotEmpty()
  @ApiProperty({
    type: Number,
  })
  id: number;
}
