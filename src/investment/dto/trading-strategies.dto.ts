

import { ApiProperty } from '@nestjs/swagger';
import { StockDto } from '../../shares/dto/stock.dto';

export class TradingStrategiesDto extends StockDto {
  @ApiProperty({ type: String, example: 'ma, sar, macdSignal, macdHistogram, maShortCutLong' })
  indicator: string;

  @ApiProperty({ type: String })
  from: string;

  @ApiProperty({ type: String })
  to: string;

  @ApiProperty({ type: String, required: false })
  maShort?: string;

  @ApiProperty({ type: String, required: false })
  maLong?: string;
}
