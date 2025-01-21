import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ContributePEPBDto {
  @IsOptional()
  @IsString()
  @ApiProperty({ type: String, example: 'FPT,ACB,VNM,...' })
  stock: string;

  @ApiProperty({
    type: String,
    description: `1 - 1year, 3 - 3year, 5 - 5year`,
  })
  period: string;
}
