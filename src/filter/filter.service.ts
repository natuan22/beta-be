import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import * as moment from 'moment';
import { CatchException } from '../exceptions/common.exception';
import { MssqlService } from '../mssql/mssql.service';
import { FilterResponse } from './response/filter.response';
import { TimeToLive } from '../enums/common.enum';

@Injectable()
export class FilterService {
  constructor(
    private readonly mssqlService: MssqlService,
    @Inject(CACHE_MANAGER)
    private readonly redis: Cache,
  ) {}

  async get() {
    try {
      const redisData = await this.redis.get('filter2');
      if (redisData) return redisData;

      const day_52_week = moment().subtract(52, 'week').format('YYYY-MM-DD');
      const query = `
        SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;

        WITH latest_dates AS (
            SELECT DISTINCT TOP 2 date
            FROM VISUALIZED_DATA.dbo.filterResource
            ORDER BY date DESC
        ),
        max_dates AS (
            SELECT MAX(date) AS max_ngay
            FROM tradeIntraday.dbo.tickerTransVNDIntraday
        ),
        max_foreign_date AS (
            SELECT MAX(date) AS max_foreign_date
            FROM marketTrade.dbo.[foreign]
            WHERE type = 'STOCK'
        ),
        min_max AS (
            SELECT code, MIN(closePrice) AS PRICE_LOWEST_CR_52W, MAX(closePrice) AS PRICE_HIGHEST_CR_52W
            FROM marketTrade.dbo.tickerTradeVND
            WHERE date >= '${day_52_week}'
            GROUP BY code
        ),
        MBChuDong AS (
          SELECT code, SUM(CASE WHEN action = 'B' THEN volume ELSE 0 END) AS Mua, SUM(CASE WHEN action = 'S' THEN volume ELSE 0 END) AS Ban,
                 CASE WHEN SUM(CASE WHEN action = 'S' THEN volume ELSE 0 END) = 0 THEN NULL
                    ELSE SUM(CASE WHEN action = 'B' THEN volume ELSE 0 END) / NULLIF(SUM(CASE WHEN action = 'S' THEN volume ELSE 0 END), 0) 
                 END AS MB
          FROM tradeIntraday.dbo.tickerTransVNDIntraday
          WHERE date = (SELECT max_ngay FROM max_dates)
          GROUP BY code
        ),
        temp AS (
            SELECT
                f.code, f.floor, f.TyleNDTNNdangnamgiu, f.closePrice, f.min_1_week, f.max_1_week, f.min_1_month, f.max_1_month, f.min_3_month, f.max_3_month, 
                f.min_6_month, f.max_6_month, f.min_1_year, f.max_1_year, f.perChange1D, f.perChange5D, f.perChange1M, f.perChange3M, f.perChange6M, 
                f.perChange1Y, f.perChangeYTD, f.beta, f.volume AS totalVol, f.TyLeKLMBCD, f.KNnetVal, f.KNnetVol, f.ma5, f.ma10, f.ma20, f.ma50, f.ma100, 
                f.ma200, f.ema5, f.ema10, f.ema20, f.ema50, f.ema100, f.ema200, f.rsi, f.macd, f.macd_signal, f.BBL, f.BBU, f.doanh_thu_4_quy, f.loi_nhuan_4_quy,
                f.tang_truong_doanh_thu_4_quy, f.tang_truong_loi_nhuan_4_quy, f.qoq_doanh_thu, f.qoq_loi_nhuan, f.yoy_doanh_thu, f.yoy_loi_nhuan, f.EPS, f.BVPS, 
                f.PE, f.PB, f.PS, f.marketCap, f.TinHieuChiBaoKyThuat AS tech, f.TinHieuDuongXuHuong AS trend, f.TinHieuTongHop AS overview, f.date,
                LEAD(f.closePrice) OVER (PARTITION BY f.code ORDER BY f.date DESC) AS closePrice_pre,
                LEAD(f.ma5) OVER (PARTITION BY f.code ORDER BY f.date DESC) AS ma5_pre,
                LEAD(f.ma10) OVER (PARTITION BY f.code ORDER BY f.date DESC) AS ma10_pre,
                LEAD(f.ma20) OVER (PARTITION BY f.code ORDER BY f.date DESC) AS ma20_pre,
                LEAD(f.ma50) OVER (PARTITION BY f.code ORDER BY f.date DESC) AS ma50_pre,
                LEAD(f.ma100) OVER (PARTITION BY f.code ORDER BY f.date DESC) AS ma100_pre,
                LEAD(f.ma200) OVER (PARTITION BY f.code ORDER BY f.date DESC) AS ma200_pre,
                LEAD(f.ema5) OVER (PARTITION BY f.code ORDER BY f.date DESC) AS ema5_pre,
                LEAD(f.ema10) OVER (PARTITION BY f.code ORDER BY f.date DESC) AS ema10_pre,
                LEAD(f.ema20) OVER (PARTITION BY f.code ORDER BY f.date DESC) AS ema20_pre,
                LEAD(f.ema50) OVER (PARTITION BY f.code ORDER BY f.date DESC) AS ema50_pre,
                LEAD(f.ema100) OVER (PARTITION BY f.code ORDER BY f.date DESC) AS ema100_pre,
                LEAD(f.ema200) OVER (PARTITION BY f.code ORDER BY f.date DESC) AS ema200_pre,
                LEAD(f.rsi) OVER (PARTITION BY f.code ORDER BY f.date DESC) AS rsi_pre,
                LEAD(f.macd) OVER (PARTITION BY f.code ORDER BY f.date DESC) AS macd_pre,
                LEAD(f.macd_signal) OVER (PARTITION BY f.code ORDER BY f.date DESC) AS macd_signal_pre,
                LEAD(f.TinHieuChiBaoKyThuat) OVER (PARTITION BY f.code ORDER BY f.date DESC) AS tech_pre,
                LEAD(f.TinHieuDuongXuHuong) OVER (PARTITION BY f.code ORDER BY f.date DESC) AS trend_pre,
                LEAD(f.TinHieuTongHop) OVER (PARTITION BY f.code ORDER BY f.date DESC) AS overview_pre
            FROM VISUALIZED_DATA.dbo.filterResource f
            WHERE f.date IN (SELECT date FROM latest_dates)
        )
        SELECT t.*, m.totalVal, i.LV4, r.netVal AS buyVal, r.netVol AS buyVol, b.MB, b.Mua, b.Ban, l.PRICE_HIGHEST_CR_52W, l.PRICE_LOWEST_CR_52W
        FROM temp t
        INNER JOIN marketInfor.dbo.info i ON i.code = t.code
        INNER JOIN marketTrade.dbo.tickerTradeVND m ON m.code = t.code AND m.date = t.date
        INNER JOIN marketTrade.dbo.[foreign] r ON r.code = t.code AND r.date = (SELECT max_foreign_date FROM max_foreign_date)
        LEFT JOIN MBChuDong b ON t.code = b.code
        LEFT JOIN min_max l ON l.code = t.code
        WHERE t.date = (SELECT MAX(date) FROM latest_dates)
        AND i.status = 'listed';
      `;

      //Query lấy totalVol trung bình
      const query_2 = `
        WITH ranked_trades AS (
            SELECT code, totalVol, date,
              row_number() OVER (PARTITION BY code ORDER BY date DESC) AS rn
            FROM marketTrade.dbo.tickerTradeVND
            WHERE type = 'STOCK'
        ),
        average_volumes AS (
            SELECT code,
                  AVG(CASE WHEN rn <= 5 THEN totalVol END) AS avg_totalVol_5d,
                  AVG(CASE WHEN rn <= 10 THEN totalVol END) AS avg_totalVol_10d,
                  AVG(CASE WHEN rn <= 20 THEN totalVol END) AS avg_totalVol_20d,
                  AVG(CASE WHEN rn <= 60 THEN totalVol END) AS avg_totalVol_60d
            FROM ranked_trades
            GROUP BY code
        )
        SELECT code, avg_totalVol_5d, avg_totalVol_10d, avg_totalVol_20d, avg_totalVol_60d
        FROM average_volumes
        ORDER BY code;
      `;

      const query_3 = `
        WITH yearQuarter4 AS (
            -- Lấy 4 quý mới nhất sử dụng DISTINCT TOP 4
            SELECT AVG(grossProfitMargin) AS grossProfitMarginQuarter,
                  AVG(netProfitMargin) AS netProfitMarginQuarter,
                  AVG(EBITDAMargin) AS EBITDAMarginQuarter,
                  code
            FROM financialReport.dbo.calBCTC
            WHERE yearQuarter IN (
                SELECT DISTINCT TOP 4 yearQuarter
                FROM financialReport.dbo.calBCTC
                ORDER BY yearQuarter DESC
            )
            GROUP BY code
        )
        SELECT c.code,
              c.grossProfitMargin AS grossProfitMarginYear,
              y.grossProfitMarginQuarter,
              c.netProfitMargin AS netProfitMarginYear,
              y.netProfitMarginQuarter,
              c.EBITDAMargin,
              y.EBITDAMarginQuarter,
              c.currentRatio,
              c.quickRatio,
              c.interestCoverageRatio,
              c.DE,
              c.totalDebtToTotalAssets,
              c.ATR,
              c.VongQuayTaiSanNganHan, 
              c.VongQuayCacKhoanPhaiThu, 
              c.VongQuayHangTonKho, 
              c.NoTraLaiDivVonChuSoHuu, 
              c.NoTraLaiDivTongTaiSan
        FROM financialReport.dbo.calBCTC c
        INNER JOIN yearQuarter4 y ON y.code = c.code
        -- Lấy năm/quý mới nhất
        WHERE yearQuarter = (
            SELECT TOP 1 yearQuarter
            FROM financialReport.dbo.calBCTC
            ORDER BY yearQuarter DESC
        );
      `;

      //roe, roa
      const query_4 = `
          WITH filtered_roae AS (
              SELECT code, ROE AS roae, ROA AS roaa, yearQuarter, 
                      ROW_NUMBER() OVER (PARTITION BY code ORDER BY yearQuarter DESC) AS rn
              FROM RATIO.dbo.ratioInYearQuarter
              WHERE RIGHT(yearQuarter, 1) <> '0'
          ),
          sum_roaa AS (
              SELECT code, SUM(roaa) AS roaa, SUM(roae) AS roae
              FROM filtered_roae
              WHERE rn <= 4
              GROUP BY code
          )
          SELECT code, roaa AS ROA, roae AS ROE
          FROM sum_roaa;
      `;

      const query_5 = `
        WITH ranked_trades AS (
            SELECT code, omVol, date,
                  ROW_NUMBER() OVER (PARTITION BY code ORDER BY date DESC) AS rn
            FROM marketTrade.dbo.tickerTradeVND
            WHERE type = 'STOCK'
        ),
        average_volumes AS (
            SELECT code,
                  AVG(CASE WHEN rn > 1 AND rn <= 6 THEN omVol END) AS avg_totalVol_5d_excluding_last,
                  AVG(CASE WHEN rn > 1 AND rn <= 11 THEN omVol END) AS avg_totalVol_10d_excluding_last,
                  AVG(CASE WHEN rn > 1 AND rn <= 21 THEN omVol END) AS avg_totalVol_20d_excluding_last,
                  AVG(CASE WHEN rn > 1 AND rn <= 61 THEN omVol END) AS avg_totalVol_60d_excluding_last,
                  MAX(CASE WHEN rn = 1 THEN omVol END) AS last_totalVol
            FROM ranked_trades
            GROUP BY code
        ),
        percent_changes AS (
            SELECT code,
                  avg_totalVol_5d_excluding_last,
                  avg_totalVol_10d_excluding_last,
                  avg_totalVol_20d_excluding_last,
                  avg_totalVol_60d_excluding_last,
                  last_totalVol,
                  CASE WHEN avg_totalVol_5d_excluding_last = 0 THEN 0 ELSE (last_totalVol - avg_totalVol_5d_excluding_last) / avg_totalVol_5d_excluding_last * 100 END AS pct_change_5d,
                  CASE WHEN avg_totalVol_10d_excluding_last = 0 THEN 0 ELSE (last_totalVol - avg_totalVol_10d_excluding_last) / avg_totalVol_10d_excluding_last * 100 END AS pct_change_10d,
                  CASE WHEN avg_totalVol_20d_excluding_last = 0 THEN 0 ELSE (last_totalVol - avg_totalVol_20d_excluding_last) / avg_totalVol_20d_excluding_last * 100 END AS pct_change_20d,
                  CASE WHEN avg_totalVol_60d_excluding_last = 0 THEN 0 ELSE (last_totalVol - avg_totalVol_60d_excluding_last) / avg_totalVol_60d_excluding_last * 100 END AS pct_change_60d
            FROM average_volumes
        )
        SELECT code,
              pct_change_5d AS perChangeOmVol_5d,
              pct_change_10d AS perChangeOmVol_10d,
              pct_change_20d AS perChangeOmVol_20d,
              pct_change_60d AS perChangeOmVol_60d
        FROM percent_changes
        ORDER BY code;
      `;

      //tính % thay đổi eps
      const query_6 = `
        WITH ranked_eps AS (
            SELECT code, EPS, yearQuarter,
                LEAD(EPS) OVER (PARTITION BY code ORDER BY yearQuarter DESC) AS next_EPS
            FROM RATIO.dbo.ratioInYearQuarter 
            WHERE RIGHT(yearQuarter, 1) <> '0' AND type = 'STOCK'
        ),
        temp AS (
            SELECT code, yearQuarter,
                (EPS - next_EPS) / NULLIF(next_EPS, 0) * 100 AS perEPS -- Sử dụng NULLIF để tránh chia cho 0
            FROM ranked_eps
        )
        SELECT * 
        FROM temp 
        WHERE yearQuarter = (SELECT MAX(yearQuarter) FROM temp);
      `;

      const [data, data_2, data_3, data_4, data_5, data_6] = await Promise.all([
        this.mssqlService.query<FilterResponse[]>(query),
        this.mssqlService.query(query_2),
        this.mssqlService.query(query_3),
        this.mssqlService.query(query_4),
        this.mssqlService.query(query_5),
        this.mssqlService.query(query_6),
      ]);

      const dataMapped = FilterResponse.mapToList(
        data,
        data_2,
        data_3,
        data_4,
        data_5,
        data_6,
      );

      await this.redis.set('filter2', dataMapped, {
        ttl: TimeToLive.TenMinutes,
      });
      return dataMapped;
    } catch (e) {
      throw new CatchException(e);
    }
  }
}
