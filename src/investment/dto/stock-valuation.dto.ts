import { ApiProperty } from '@nestjs/swagger';
import { StockDto } from '../../shares/dto/stock.dto';

export class StockValuationDto extends StockDto {
  @ApiProperty({ enum: [1, 3, 5], description: 'Chỉ nhận giá trị 1, 3 hoặc 5' })
  average: number;

  @ApiProperty({ type: Number, required: false })
  averageGrowthLNST: number;

  @ApiProperty({ type: Number, required: false })
  perWelfareFund: number;
}
