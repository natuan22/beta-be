import { ApiProperty } from '@nestjs/swagger';
import { StockDto } from '../../shares/dto/stock.dto';

export class HistoricalPEPBDto extends StockDto {
  @ApiProperty({
    type: String,
    description: `1 - 1year, 3 - 3year, 5 - 5year`,
  })
  period: string;
}
