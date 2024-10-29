import { ApiProperty, PartialType } from '@nestjs/swagger';
import { MarketBreadthKafkaInterface } from '../../kafka/interfaces/market-breadth-kafka.interface';
import { BaseResponse } from '../../utils/utils.response';

export class MarketBreadthResponse {
  @ApiProperty({
    type: String,
    example: 'VNINDEX',
  })
  index: string;

  @ApiProperty({
    type: 'float',
    example: 45,
  })
  noChange: number;

  @ApiProperty({
    type: 'float',
    example: 45,
  })
  decline: number;

  @ApiProperty({
    type: 'float',
    example: 45,
  })
  advance: number;

  @ApiProperty({
    type: String,
    example: '09:15:55',
  })
  time: any;

  constructor(data?: MarketBreadthKafkaInterface) {
    this.index = data?.index || '';
    this.noChange = data?.noChange || 0;
    this.decline = data?.decline || 0;
    this.advance = data?.advance || 0;
    this.time = Date.UTC(
      new Date().getFullYear(),
      new Date().getMonth(),
      new Date().getDate(),
      +data?.time?.split(':')![0],
      +data?.time?.split(':')![1],
    ).valueOf();
  }

  public mapToList(data?: MarketBreadthKafkaInterface[]) {
    return data.map((item) => new MarketBreadthResponse(item));
  }
}

export class MarketBreadthSwagger extends PartialType(BaseResponse) {
  @ApiProperty({
    type: MarketBreadthResponse,
    isArray: true,
  })
  data: MarketBreadthResponse;
}
