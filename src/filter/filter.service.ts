import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import * as moment from 'moment';
import { CatchException } from '../exceptions/common.exception';
import { MssqlService } from '../mssql/mssql.service';
import { FilterResponse } from './response/filter.response';

@Injectable()
export class FilterService {
  constructor(
    private readonly mssqlService: MssqlService,
    @Inject(CACHE_MANAGER)
    private readonly redis: Cache
  ) { }

  async get() {
    try {
      const redisData = await this.redis.get('filter2')
      // if (redisData) return redisData

      const day_52_week = moment().subtract(52, 'week').format('YYYY-MM-DD')
      const query = `
      WITH latest_dates AS (
          SELECT DISTINCT TOP 2 date
          FROM VISUALIZED_DATA.dbo.filterResource
          ORDER BY date DESC
      ),
      temp AS (
          SELECT 
              code, floor, TyleNDTNNdangnamgiu, closePrice,
              LEAD(closePrice) OVER (PARTITION BY code ORDER BY date DESC) AS closePrice_pre,
              min_1_week, max_1_week, min_1_month, max_1_month, min_3_month, max_3_month, 
              min_6_month, max_6_month, min_1_year, max_1_year,
              perChange1D, perChange5D, perChange1M, perChange3M, perChange6M, 
              perChange1Y, perChangeYTD, beta, volume AS totalVol, TyLeKLMBCD, 
              KNnetVal, KNnetVol,
              ma5, ma10, ma20, ma50, ma100, ma200, 
              ema5, ema10, ema20, ema50, ema100, ema200,
              LEAD(ma5) OVER (PARTITION BY code ORDER BY date DESC) AS ma5_pre,
              LEAD(ma10) OVER (PARTITION BY code ORDER BY date DESC) AS ma10_pre,
              LEAD(ma20) OVER (PARTITION BY code ORDER BY date DESC) AS ma20_pre,
              LEAD(ma50) OVER (PARTITION BY code ORDER BY date DESC) AS ma50_pre,
              LEAD(ma100) OVER (PARTITION BY code ORDER BY date DESC) AS ma100_pre,
              LEAD(ma200) OVER (PARTITION BY code ORDER BY date DESC) AS ma200_pre,
              LEAD(ema5) OVER (PARTITION BY code ORDER BY date DESC) AS ema5_pre,
              LEAD(ema10) OVER (PARTITION BY code ORDER BY date DESC) AS ema10_pre,
              LEAD(ema20) OVER (PARTITION BY code ORDER BY date DESC) AS ema20_pre,
              LEAD(ema50) OVER (PARTITION BY code ORDER BY date DESC) AS ema50_pre,
              LEAD(ema100) OVER (PARTITION BY code ORDER BY date DESC) AS ema100_pre,
              LEAD(ema200) OVER (PARTITION BY code ORDER BY date DESC) AS ema200_pre,
              rsi, LEAD(rsi) OVER (PARTITION BY code ORDER BY date DESC) AS rsi_pre,
              macd, macd_signal,
              LEAD(macd) OVER (PARTITION BY code ORDER BY date DESC) AS macd_pre,
              LEAD(macd_signal) OVER (PARTITION BY code ORDER BY date DESC) AS macd_signal_pre,
              BBL, BBU, doanh_thu_4_quy, loi_nhuan_4_quy,
              tang_truong_doanh_thu_4_quy, tang_truong_loi_nhuan_4_quy,
              qoq_doanh_thu, qoq_loi_nhuan, yoy_doanh_thu, yoy_loi_nhuan,
              EPS, 
              BVPS, PE, PB, PS, marketCap,
              TinHieuChiBaoKyThuat AS tech, 
              TinHieuDuongXuHuong AS trend, 
              TinHieuTongHop AS overview,
              LEAD(TinHieuChiBaoKyThuat) OVER (PARTITION BY code ORDER BY date DESC) AS tech_pre,
              LEAD(TinHieuDuongXuHuong) OVER (PARTITION BY code ORDER BY date DESC) AS trend_pre,
              LEAD(TinHieuTongHop) OVER (PARTITION BY code ORDER BY date DESC) AS overview_pre,
              date
          FROM VISUALIZED_DATA.dbo.filterResource
          WHERE date IN (SELECT date FROM latest_dates)
      ),
      min_max AS (
          SELECT 
              code, 
              MIN(closePrice) AS PRICE_LOWEST_CR_52W, 
              MAX(closePrice) AS PRICE_HIGHEST_CR_52W 
          FROM marketTrade.dbo.tickerTradeVND 
          WHERE date >= '${day_52_week}'
          GROUP BY code
      )
      SELECT 
          t.*, m.totalVal, i.LV4,
          r.netVal AS buyVal, r.netVol AS buyVol,
          b.MB, b.Mua, b.Ban,
          l.PRICE_HIGHEST_CR_52W, l.PRICE_LOWEST_CR_52W
      FROM temp t
      INNER JOIN marketInfor.dbo.info i ON i.code = t.code
      INNER JOIN marketTrade.dbo.tickerTradeVND m ON m.code = t.code AND m.date = t.date
      INNER JOIN PHANTICH.dbo.MBChuDong b ON b.MCK = t.code AND b.Ngay = (SELECT MAX(Ngay) FROM PHANTICH.dbo.MBChuDong)
      INNER JOIN marketTrade.dbo.[foreign] r ON r.code = t.code AND r.date = (SELECT MAX(date) FROM marketTrade.dbo.[foreign] WHERE type = 'STOCK')
      LEFT JOIN min_max l ON l.code = t.code
      WHERE t.date = (SELECT MAX(date) FROM temp)
      AND i.status = 'listed';
      `

      //Query lấy totalVol trung bình
      const query_2 = `
      with ranked_trades as (
          select code, totalVol, date,
                row_number() over (partition by code order by date desc) as rn
          from marketTrade.dbo.tickerTradeVND
          where type = 'STOCK'
      ),
      average_volumes as (
          select code,
                avg(case when rn <= 5 then totalVol end) as avg_totalVol_5d,
                avg(case when rn <= 10 then totalVol end) as avg_totalVol_10d,
                avg(case when rn <= 20 then totalVol end) as avg_totalVol_20d,
                avg(case when rn <= 60 then totalVol end) as avg_totalVol_60d
          from ranked_trades
          group by code
      )
      select code,
            avg_totalVol_5d,
            avg_totalVol_10d,
            avg_totalVol_20d,
            avg_totalVol_60d
      from average_volumes
      order by code;
      `

      const query_5 = `
      with ranked_trades as (
          select code, omVol, date,
                row_number() over (partition by code order by date desc) as rn
          from marketTrade.dbo.tickerTradeVND
          where type = 'STOCK'
      ),
      average_volumes as (
          select code,
                avg(case when rn > 1 and rn <= 6 then omVol end) as avg_totalVol_5d_excluding_last,
                avg(case when rn > 1 and rn <= 11 then omVol end) as avg_totalVol_10d_excluding_last,
                avg(case when rn > 1 and rn <= 21 then omVol end) as avg_totalVol_20d_excluding_last,
                avg(case when rn > 1 and rn <= 61 then omVol end) as avg_totalVol_60d_excluding_last,
                max(case when rn = 1 then omVol end) as last_totalVol
          from ranked_trades
          group by code
      ),
      percent_changes as (
          select code,
                avg_totalVol_5d_excluding_last,
                avg_totalVol_10d_excluding_last,
                avg_totalVol_20d_excluding_last,
                avg_totalVol_60d_excluding_last,
                last_totalVol,
                case when avg_totalVol_5d_excluding_last = 0 then 0 else (last_totalVol - avg_totalVol_5d_excluding_last) / avg_totalVol_5d_excluding_last * 100 end as pct_change_5d,
                case when avg_totalVol_10d_excluding_last = 0 then 0 else (last_totalVol - avg_totalVol_10d_excluding_last) / avg_totalVol_10d_excluding_last * 100 end as pct_change_10d,
                case when avg_totalVol_20d_excluding_last = 0 then 0 else (last_totalVol - avg_totalVol_20d_excluding_last) / avg_totalVol_20d_excluding_last * 100 end as pct_change_20d,
                case when avg_totalVol_60d_excluding_last = 0 then 0 else (last_totalVol - avg_totalVol_60d_excluding_last) / avg_totalVol_60d_excluding_last * 100 end as pct_change_60d
          from average_volumes
      )
      select code,
      pct_change_5d as perChangeOmVol_5d,
            pct_change_10d as perChangeOmVol_10d,
            pct_change_20d as perChangeOmVol_20d,
            pct_change_60d as perChangeOmVol_60d
      from percent_changes
      order by code;
      `

      //tính % thay đổi eps
      const query_6 = `
      with temp as (select code, (EPS - lead(EPS) over (partition by code order by yearQuarter desc)) / lead(EPS) over (partition by code order by yearQuarter desc) * 100 as perEPS, yearQuarter
            from RATIO.dbo.ratioInYearQuarter where right(yearQuarter, 1) <> 0 and type = 'STOCK')
      select * from temp where yearQuarter = (select max(yearQuarter) from temp)
      `

      const query_3 = `
      with yearQuarter4 as (
          select avg(grossProfitMargin) as grossProfitMarginQuarter,
                avg(netProfitMargin) as netProfitMarginQuarter,
                avg(EBITDAMargin) as EBITDAMarginQuarter,
                code
          from financialReport.dbo.calBCTC where yearQuarter in (select distinct top 4 yearQuarter from financialReport.dbo.calBCTC order by yearQuarter desc)
                                          group by code
      )
      select c.code,
            grossProfitMargin as grossProfitMarginYear,
            y.grossProfitMarginQuarter,
            netProfitMargin as netProfitMarginYear,
            y.netProfitMarginQuarter,
            EBITDAMargin,
            y.EBITDAMarginQuarter,
            currentRatio,
            quickRatio,
            interestCoverageRatio,
              DE,
              totalDebtToTotalAssets,
              ATR,
              c.VongQuayTaiSanNganHan, c.VongQuayCacKhoanPhaiThu, c.VongQuayHangTonKho, c.NoTraLaiDivVonChuSoHuu, c.NoTraLaiDivTongTaiSan
      from financialReport.dbo.calBCTC c inner join yearQuarter4 y on y.code = c.code
      where yearQuarter = (select top 1 yearQuarter from financialReport.dbo.calBCTC order by yearQuarter desc)
      `

      //roe, roa
      const query_4 = `
      WITH roae AS (
          SELECT code,
                ROE AS roae,
                ROA AS roaa,
                yearQuarter
          FROM RATIO.dbo.ratioInYearQuarter
          WHERE RIGHT(yearQuarter, 1) <> '0'
          AND yearQuarter >= '20224'
      ),
      sum_roaa AS (
          SELECT
              code,
              yearQuarter,
              roaa + LEAD(roaa, 1) OVER (PARTITION BY code ORDER BY yearQuarter DESC) +
                    LEAD(roaa, 2) OVER (PARTITION BY code ORDER BY yearQuarter DESC) +
                    LEAD(roaa, 3) OVER (PARTITION BY code ORDER BY yearQuarter DESC) AS roaa,
              roae + LEAD(roae, 1) OVER (PARTITION BY code ORDER BY yearQuarter DESC) +
                    LEAD(roae, 2) OVER (PARTITION BY code ORDER BY yearQuarter DESC) +
                    LEAD(roae, 3) OVER (PARTITION BY code ORDER BY yearQuarter DESC) AS roae
          FROM roae
      ),
      max_yearQuarter AS (
          SELECT MAX(yearQuarter) AS maxYQ FROM sum_roaa
      )
      SELECT s.code, s.roaa AS ROA, s.roae AS ROE
      FROM sum_roaa s
      JOIN max_yearQuarter m ON s.yearQuarter = m.maxYQ;
      `;

      const [data, data_2, data_3, data_4, data_5, data_6] = await Promise.all(
        [
          this.mssqlService.query<FilterResponse[]>(query),
        this.mssqlService.query(query_2),
        this.mssqlService.query(query_3),
        this.mssqlService.query(query_4),
        this.mssqlService.query(query_5),
        this.mssqlService.query(query_6),
        ])
      const dataMapped = FilterResponse.mapToList(data, data_2, data_3, data_4, data_5, data_6)
      await this.redis.set('filter2', dataMapped, { ttl: 500 })
      return dataMapped
    } catch (e) {
      throw new CatchException(e)
    }
  }


}
