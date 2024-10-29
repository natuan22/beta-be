import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class StockDto {
  @IsNotEmpty({ message: 'stock not found' })
  @IsString()
  @Length(1, 5, { message: 'stock chỉ đc từ 1 đến 5 kí tự' })
  @ApiProperty({
    type: String,
  })
  stock: string;
}
