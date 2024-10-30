import { ApiProperty } from '@nestjs/swagger';
import * as _ from 'lodash';

export class BetaSmartResponse {
  @ApiProperty({
    type: Number,
  })
  signal: number;

  @ApiProperty({
    type: String,
  })
  code: string;

  @ApiProperty({
    type: Number,
  })
  closePrice: number;

  @ApiProperty({
    type: Number,
    description: 'KLGD (CP)',
  })
  totalVol: number;

  @ApiProperty({
    type: Number,
    description: 'GTGD (Tỷ đồng)',
  })
  totalVal: number;

  @ApiProperty({
    type: Number,
    description: '%D',
  })
  perChange: number;

  @ApiProperty({
    type: Number,
    description: '%M',
  })
  perChangeM: number;

  @ApiProperty({
    type: Number,
    description: '%YtD',
  })
  perChangeYtD: number;

  @ApiProperty({
    type: Number,
    description: '%YoY',
  })
  perChangeY: number;

  @ApiProperty({
    type: Number,
  })
  EPS: number;

  @ApiProperty({
    type: Number,
  })
  PE: number;

  @ApiProperty({
    type: Number,
  })
  BVPS: number;

  @ApiProperty({
    type: Number,
  })
  PB: number;

  @ApiProperty({
    type: Number,
  })
  ROA: number;

  @ApiProperty({
    type: Number,
  })
  ROE: number;

  @ApiProperty({
    type: Number,
    description: 'Giá cao nhất 52 tuần',
  })
  PRICE_HIGHEST_CR_52W: number;

  @ApiProperty({
    type: Number,
    description: 'Giá thấp nhất 52 tuần',
  })
  PRICE_LOWEST_CR_52W: number;

  constructor(data?: BetaSmartResponse) {
    this.signal = data?.signal;
    this.code = data?.code || '';
    this.closePrice = data?.closePrice || 0;
    this.totalVol = data?.totalVol || 0;
    this.totalVal = data?.totalVal / 1000000000 || 0;
    this.perChange = data?.perChange || 0;
    this.perChangeM = data?.perChangeM || 0;
    this.perChangeYtD = data?.perChangeYtD || 0;
    this.perChangeY = data?.perChangeY || 0;
    this.EPS = data?.EPS || 0;
    this.PE = data?.PE || 0;
    this.BVPS = data?.BVPS || 0;
    this.PB = data?.PB || 0;
    this.ROA = data?.ROA || 0;
    this.ROE = data?.ROE || 0;
    this.PRICE_HIGHEST_CR_52W = data?.PRICE_HIGHEST_CR_52W || 0;
    this.PRICE_LOWEST_CR_52W = data?.PRICE_LOWEST_CR_52W || 0;
  }

  static mapToList(data?: BetaSmartResponse[]) {
    return _.orderBy(
      data.map((item) => new BetaSmartResponse(item)),
      ['signal', 'code'],
      ['asc', 'asc'],
    );
  }
}
