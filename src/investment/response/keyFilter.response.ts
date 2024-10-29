import { ApiProperty } from '@nestjs/swagger';

interface KeyFilter {
  marketCap_max: number;
  marketCap_min: number;
  closePrice_max: number;
  closePrice_min: number;
  shareout_max: number;
  shareout_min: number;
  PE_max: number;
  PE_min: number;
  PB_max: number;
  PB_min: number;
  EPS_max: number;
  EPS_min: number;
  BVPS_max: number;
  BVPS_min: number;
  EBIT_max: number;
  EBIT_min: number;
  ROA_max: number;
  ROA_min: number;
  ROE_max: number;
  ROE_min: number;
  DSCR_max: number;
  DSCR_min: number;
  totalDebtToTotalAssets_max: number;
  totalDebtToTotalAssets_min: number;
  ACR_max: number;
  ACR_min: number;
  currentRatio_min: number;
  currentRatio_max: number;
  quickRatio_max: number;
  quickRatio_min: number;
  cashRatio_max: number;
  cashRatio_min: number;
  interestCoverageRatio_max: number;
  interestCoverageRatio_min: number;
  FAT_max: number;
  FAT_min: number;
  ATR_max: number;
  ATR_min: number;
  CTR_max: number;
  CTR_min: number;
  CT_max: number;
  CT_min: number;
  totalVol_max: number;
  totalVol_min: number;
  totalVol_AVG_5_max: number;
  totalVol_AVG_5_min: number;
  totalVol_AVG_10_max: number;
  totalVol_AVG_10_min: number;
  totalVol_MIN_5_max: number;
  totalVol_MIN_5_min: number;
  totalVol_MIN_10_max: number;
  totalVol_MIN_10_min: number;
  totalVol_MAX_5_max: number;
  totalVol_MAX_5_min: number;
  totalVol_MAX_10_max: number;
  totalVol_MAX_10_min: number;
  growthRevenue_max: number;
  growthRevenue_min: number;
  growthRevenueSamePeriod_max: number;
  growthRevenueSamePeriod_min: number;
  growthProfitBeforeRevenue_max: number;
  growthProfitBeforeRevenue_min: number;
  growthProfitBeforeRevenueSamePeriod_max: number;
  growthProfitBeforeRevenueSamePeriod_min: number;
  growthProfitAfterRevenue_max: number;
  growthProfitAfterRevenue_min: number;
  growthProfitAfterRevenueSamePeriod_max: number;
  growthProfitAfterRevenueSamePeriod_min: number;
  growthEPS_max: number;
  growthEPS_min: number;
  growthEPSSamePeriod_max: number;
  growthEPSSamePeriod_min: number;
  rsi_max: number;
  rsi_min: number;
  stochK_max: number;
  stochK_min: number;
  stochD_max: number;
  stochD_min: number;
  stochRsiK_max: number;
  stochRsiK_min: number;
  stochRsiD_max: number;
  stochRsiD_min: number;
  macd_max: number;
  macd_min: number;
  macd_signal_max: number;
  macd_signal_min: number;
  macdHistogram_max: number;
  macdHistogram_min: number;
  adx_max: number;
  adx_min: number;
  williamR_max: number;
  williamR_min: number;
  cci_max: number;
  cci_min: number;
  ma5_max: number;
  ma5_min: number;
  ema5_max: number;
  ema5_min: number;
  ma10_max: number;
  ma10_min: number;
  ema10_max: number;
  ema10_min: number;
  ma20_max: number;
  ma20_min: number;
  ema20_max: number;
  ema20_min: number;
  ma50_max: number;
  ma50_min: number;
  ema50_max: number;
  ema50_min: number;
  ma100_max: number;
  ma100_min: number;
  ema100_max: number;
  ema100_min: number;
  ma200_max: number;
  ma200_min: number;
  ema200_max: number;
  ema200_min: number;
  Beta_max: number;
  Beta_min: number;
  liquidity_max: number;
  liquidity_min: number;
  payment_max: number;
  payment_min: number;
  performance_max: number;
  performance_min: number;
}

export class KeyFilterResponse {
  @ApiProperty({
    type: String,
  })
  name: string;

  @ApiProperty({
    type: String,
  })
  key: string;

  @ApiProperty({
    type: Number,
  })
  max: number;

  @ApiProperty({
    type: Number,
  })
  min: number;

  static mapToList(data: KeyFilter) {
    return [
      {
        name: 'Vốn hóa (Tỷ VNĐ)',
        key: 'marketCap',
        min: data.marketCap_min / 1000000000,
        max: data.marketCap_max / 1000000000,
      },
      {
        name: 'Thị giá (x1000 vnđ)',
        key: 'closePrice',
        min: data.closePrice_min,
        max: data.closePrice_max,
      },
      {
        name: 'Khối lượng cổ phiếu lưu hành (triệu CP)',
        key: 'shareout',
        min: data.shareout_min / 1000000,
        max: data.shareout_max / 1000000,
      },
      {
        name: 'Beta',
        key: 'Beta',
        min: data.Beta_min,
        max: data.Beta_max,
      },
      {
        name: 'PE',
        key: 'PE',
        // min: data.PE_min,
        // max: data.PE_max,
        min: -1000,
        max: 1500,
      },
      {
        name: 'PB',
        key: 'PB',
        min: data.PB_min,
        max: data.PB_max,
      },
      {
        name: 'EPS',
        key: 'EPS',
        // min: data.EPS_min,
        // max: data.EPS_max,
        min: -15000,
        max: 15000,
      },
      {
        name: 'BVPS',
        key: 'BVPS',
        // min: data.BVPS_min,
        // max: data.BVPS_max,
        min: -35000,
        max: 50000,
      },
      {
        name: 'Tỷ lệ EBIT (Tỷ)',
        key: 'EBIT',
        min: data.EBIT_min / 1000000000,
        max: data.EBIT_max / 1000000000,
      },
      {
        name: 'Lợi nhuận trên tài sản (ROA)',
        key: 'ROA',
        min: data.ROA_min,
        max: data.ROA_max,
      },
      {
        name: 'Lợi nhuận trên vốn chủ sở hữu (ROE)',
        key: 'ROE',
        min: data.ROE_min,
        max: data.ROE_max,
      },
      {
        name: 'Chỉ số khả năng trả nợ (DSCR)',
        key: 'DSCR',
        min: data.DSCR_min,
        max: data.DSCR_max,
      },
      {
        name: 'Tỷ lệ nợ hiện tại trên tổng tài sản (totalDebtToTotalAssets)',
        key: 'totalDebtToTotalAssets',
        min: data.totalDebtToTotalAssets_min,
        max: data.totalDebtToTotalAssets_max,
      },
      {
        name: 'Tỷ lệ đảm bảo trả nợ bằng tài sản (ACR)',
        key: 'ACR',
        min: data.ACR_min,
        max: data.ACR_max,
      },
      {
        name: 'Tỷ số thanh toán hiện hành (currentRatio)',
        key: 'quickRatio',
        min: data.currentRatio_min,
        max: data.currentRatio_max,
      },
      {
        name: 'Tỷ số thanh toán nhanh (quickRatio)',
        key: 'quickRatio',
        min: data.quickRatio_min,
        max: data.quickRatio_max,
      },
      {
        name: 'Tỷ số thanh toán tiền mặt (cashRatio)',
        key: 'cashRatio',
        min: data.cashRatio_min,
        max: data.cashRatio_max,
      },
      {
        name: 'Khả năng thanh toán lãi vay (interestCoverageRatio)',
        key: 'interestCoverageRatio',
        min: data.interestCoverageRatio_min,
        max: data.interestCoverageRatio_max,
      },
      {
        name: 'Vòng quay tài sản cố định (FAT)',
        key: 'FAT',
        min: data.FAT_min,
        max: data.FAT_max,
      },
      {
        name: 'Vòng quay tổng tài sản (ATR)',
        key: 'ATR',
        min: data.ATR_min,
        max: data.ATR_max,
      },
      {
        name: 'Vòng quay tiền (CTR)',
        key: 'CTR',
        min: data.CTR_min,
        max: data.CTR_max,
      },
      {
        name: 'Vòng quay vốn chủ sở hữu (CT)',
        key: 'CT',
        min: data.CT_min,
        max: data.CT_max,
      },
      {
        name: 'Tổng KLGD trong phiên (Triệu)',
        key: 'totalVol',
        min: data.totalVol_min / 1000000,
        max: data.totalVol_max / 1000000,
      },
      {
        name: 'KLGD trung bình 5 phiên',
        key: 'totalVol_AVG_5',
        min: data.totalVol_AVG_5_min / 1000000,
        max: data.totalVol_AVG_5_max / 1000000,
      },
      {
        name: 'KLGD trung bình 10 phiên',
        key: 'totalVol_AVG_10',
        min: data.totalVol_AVG_10_min / 1000000,
        max: data.totalVol_AVG_10_max / 1000000,
      },
      {
        name: 'KLGD thấp nhất 5 phiên',
        key: 'totalVol_MIN_5',
        min: data.totalVol_MIN_5_min / 1000000,
        max: data.totalVol_MIN_5_max / 1000000,
      },
      {
        name: 'KLGD thấp nhất 10 phiên',
        key: 'totalVol_MIN_10',
        min: data.totalVol_MIN_10_min / 1000000,
        max: data.totalVol_MIN_10_max / 1000000,
      },
      {
        name: 'KLGD cao nhất 5 phiên',
        key: 'totalVol_MAX_5',
        min: data.totalVol_MAX_5_min / 1000000,
        max: data.totalVol_MAX_5_max / 1000000,
      },
      {
        name: 'KLGD cao nhất 10 phiên',
        key: 'totalVol_MAX_10',
        min: data.totalVol_MAX_10_min / 1000000,
        max: data.totalVol_MAX_10_max / 1000000,
      },
      {
        name: 'Tăng trưởng doanh thu quý gần nhất so với cùng kỳ',
        key: 'growthRevenueSamePeriod',
        // min: data.growthRevenueSamePeriod_min,
        // max: data.growthRevenueSamePeriod_max,
        min: -1000,
        max: 2000,
      },
      {
        name: 'Tăng trưởng doanh thu quý gần nhất so với kỳ liền kề',
        key: 'growthRevenue',
        // min: data.growthRevenue_min,
        // max: data.growthRevenue_max,
        min: data.growthRevenue_min,
        max: 2000,
      },
      {
        name: 'Tăng trưởng lợi nhuận sau thuế quý gần nhất so với cùng kỳ',
        key: 'growthProfitAfterRevenueSamePeriod',
        // min: data.growthProfitAfterRevenueSamePeriod_min,
        // max: data.growthProfitAfterRevenueSamePeriod_max,
        min: -3000,
        max: 3000,
      },
      {
        name: 'Tăng trưởng lợi nhuận sau thuế quý gần nhất so với kỳ liền kề',
        key: 'growthProfitAfterRevenue',
        // min: data.growthProfitAfterRevenue_min,
        // max: data.growthProfitAfterRevenue_max,
        min: -5000,
        max: 5000,
      },
      {
        name: 'Tăng trưởng EPS quý gần nhất so với cùng kỳ',
        key: 'growthEPSSamePeriod',
        // min: data.growthEPSSamePeriod_min,
        // max: data.growthEPSSamePeriod_max,
        min: -3000,
        max: 3000,
      },
      {
        name: 'Tăng trưởng EPS quý gần nhất so với kỳ liền kề',
        key: 'growthEPS',
        // min: data.growthEPS_min,
        // max: data.growthEPS_max,
        min: -3000,
        max: 3000,
      },
      {
        name: 'Tăng trưởng lợi nhuận trước thuế quý gần nhất so với cùng kỳ',
        key: 'growthProfitBeforeRevenueSamePeriod',
        min: data.growthProfitBeforeRevenueSamePeriod_min,
        max: data.growthProfitBeforeRevenueSamePeriod_max,
      },
      {
        name: 'Tăng trưởng lợi nhuận trước thuế quý gần nhất so với kỳ liền kề',
        key: 'growthProfitBeforeRevenue',
        min: data.growthProfitBeforeRevenue_min,
        max: data.growthProfitBeforeRevenue_max,
      },
      {
        name: 'MA5',
        key: 'ma5',
        min: data.ma5_min,
        max: data.ma5_max,
      },
      {
        name: 'MA10',
        key: 'ma10',
        min: data.ma10_min,
        max: data.ma10_max,
      },
      {
        name: 'EMA5',
        key: 'ema5',
        min: data.ema5_min,
        max: data.ema5_max,
      },
      {
        name: 'EMA10',
        key: 'ema10',
        min: data.ema10_min,
        max: data.ema10_max,
      },
      {
        name: 'RSI(14)',
        key: 'rsi',
        min: data.rsi_min,
        max: data.rsi_max,
      },
      {
        name: 'Thanh khoản doanh nghiệp rating',
        key: 'liquidity',
        min: data.liquidity_min,
        max: data.liquidity_max,
      },
      {
        name: 'Khả năng thanh toán doanh nghiệp rating',
        key: 'payment',
        min: data.payment_min,
        max: data.payment_max,
      },
      {
        name: 'Hiệu quả hoạt động doanh nghiệp rating',
        key: 'performance',
        min: data.performance_min,
        max: data.performance_max,
      },
    ];
  }
}
