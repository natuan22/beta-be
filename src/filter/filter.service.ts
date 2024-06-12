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
      if (redisData) return redisData

      const day_52_week = moment().subtract(52, 'week').format('YYYY-MM-DD')
      const query = `
      with temp as (select code, floor,
              TyleNDTNNdangnamgiu,
              closePrice, 
              lead(closePrice) over (partition by code order by date desc) as closePrice_pre,
              min_1_week, max_1_week, min_1_month, max_1_month, min_3_month, max_3_month, min_6_month, max_6_month, min_1_year, max_1_year,
              perChange1D, perChange5D, perChange1M, perChange3M, perChange6M, perChange1Y, perChangeYTD, beta,
              volume as totalVol, TyLeKLMBCD, KNnetVal, KNnetVol,
              ma5, ma10, ma20, ma50, ma100, ma200, ema5, ema10, ema20, ema50, ema100, ema200,
              lead(ma5) over (partition by code order by date desc) as ma5_pre,
              lead(ma10) over (partition by code order by date desc) as ma10_pre,
              lead(ma20) over (partition by code order by date desc) as ma20_pre,
              lead(ma50) over (partition by code order by date desc) as ma50_pre,
              lead(ma100) over (partition by code order by date desc) as ma100_pre,
              lead(ma200) over (partition by code order by date desc) as ma200_pre,
              lead(ema5) over (partition by code order by date desc) as ema5_pre,
              lead(ema10) over (partition by code order by date desc) as ema10_pre,
              lead(ema20) over (partition by code order by date desc) as ema20_pre,
              lead(ema50) over (partition by code order by date desc) as ema50_pre,
              lead(ema100) over (partition by code order by date desc) as ema100_pre,
              lead(ema200) over (partition by code order by date desc) as ema200_pre,
              rsi,
              lead(rsi) over (partition by code order by date desc) as rsi_pre,
              macd, macd_signal,
              lead(macd) over (partition by code order by date desc) as macd_pre,
              lead(macd_signal) over (partition by code order by date desc) as macd_signal_pre,
              BBL,
              BBU,
              doanh_thu_4_quy, loi_nhuan_4_quy,
              tang_truong_doanh_thu_4_quy, tang_truong_loi_nhuan_4_quy,
              qoq_doanh_thu, qoq_loi_nhuan,
              yoy_doanh_thu, yoy_loi_nhuan,
              EPS, BVPS, PE, PB, PS, marketCap,
              TinHieuChiBaoKyThuat as tech,
              TinHieuDuongXuHuong as trend,
              TinHieuTongHop as overview,
              date
      from VISUALIZED_DATA.dbo.filterResource where date in (select distinct top 2 date from VISUALIZED_DATA.dbo.filterResource order by date desc)),
      min_max as (
        select code, min(closePrice) as PRICE_LOWEST_CR_52W, max(closePrice) as PRICE_HIGHEST_CR_52W from marketTrade.dbo.tickerTradeVND where date >= '${day_52_week}' group by code
      )
      select t.*, m.totalVal, i.LV4,
      r.netVal as buyVal, r.netVol as buyVol,
      b.MB, b.Mua, b.Ban,  
      l.PRICE_HIGHEST_CR_52W, l.PRICE_LOWEST_CR_52W
      from temp t
      inner join marketInfor.dbo.info i on i.code = t.code
      inner join marketTrade.dbo.tickerTradeVND m on m.code = t.code and m.date = t.date
      inner join PHANTICH.dbo.MBChuDong b on b.MCK = t.code and b.Ngay = (select max(Ngay) from PHANTICH.dbo.MBChuDong)
      inner join marketTrade.dbo.[foreign] r on r.code = t.code and r.date = (select max(date) from marketTrade.dbo.[foreign] where type = 'STOCK')
      left join min_max l on l.code = t.code
      where t.date = (select max(date) from temp)
      and i.status = 'listed'
      `

      //Query lấy totalVol trung bình
      const query_2 = `
      with last_date as (
          select top 1 date from marketTrade.dbo.tickerTradeVND where type = 'STOCK' order by date desc
      ),
      day_5 as (select avg(totalVol) as avg_totalVol_5d, code
                from marketTrade.dbo.tickerTradeVND
                where type = 'STOCK'
                  and date >= dateadd(day, -5, (select date from last_date))
                group by code
                ),
          day_10 as (select avg(totalVol) as avg_totalVol_10d, code
                from marketTrade.dbo.tickerTradeVND
                where type = 'STOCK'
                  and date >= dateadd(day, -10, (select date from last_date))
                group by code
                ),
          day_20 as (select avg(totalVol) as avg_totalVol_20d, code
                from marketTrade.dbo.tickerTradeVND
                where type = 'STOCK'
                  and date >= dateadd(day, -20, (select date from last_date))
                group by code
                ),
          day_60 as (select avg(totalVol) as avg_totalVol_60d, code
                from marketTrade.dbo.tickerTradeVND
                where type = 'STOCK'
                  and date >= dateadd(day, -60, (select date from last_date))
                group by code
                )
      select d5.code, d5.avg_totalVol_5d, d10.avg_totalVol_10d, d20.avg_totalVol_20d, d60.avg_totalVol_60d from day_5 d5
      inner join day_10 d10 on d10.code = d5.code
      inner join day_20 d20 on d20.code = d5.code
      inner join day_60 d60 on d60.code = d5.code
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
      with roae as (
        select code,
               ROE as roae,
               ROA as roaa,
               yearQuarter
      from RATIO.dbo.ratioInYearQuarter
      where right(yearQuarter, 1) <> 0
      ),
      sum_roaa as (
        select roaa +
        lead(roaa) over (partition by code order by yearQuarter desc)
        + lead(roaa, 2) over (partition by code order by yearQuarter desc)
         + lead(roaa, 3) over (partition by code order by yearQuarter desc)
        as roaa,
          roae +
              lead(roae) over (partition by code order by yearQuarter desc)
              + lead(roae, 2) over (partition by code order by yearQuarter desc)
              + lead(roae, 3) over (partition by code order by yearQuarter desc)
        as roae, code, yearQuarter
        from roae
      ),
        roaa
      AS (
        select code, roaa as ROA, roae as ROE from sum_roaa where yearQuarter = (select max(yearQuarter) from sum_roaa)
      )
        select * from roaa
      `;

      const [data, data_2, data_3, data_4] = await Promise.all(
        [
          this.mssqlService.query<FilterResponse[]>(query),
        this.mssqlService.query(query_2),
        this.mssqlService.query(query_3),
        this.mssqlService.query(query_4)
        ])
      const dataMapped = FilterResponse.mapToList(data, data_2, data_3, data_4)
      await this.redis.set('filter2', dataMapped, { ttl: 60 })
      return dataMapped
    } catch (e) {
      throw new CatchException(e)
    }
  }


}
