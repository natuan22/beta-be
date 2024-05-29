import { Injectable } from '@nestjs/common';
import { CatchException } from '../exceptions/common.exception';
import { MssqlService } from '../mssql/mssql.service';
import { FilterResponse } from './response/filter.response';

@Injectable()
export class FilterService {
  constructor(
    private readonly mssqlService: MssqlService
  ) { }

  async get() {
    try {
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
              date
      from VISUALIZED_DATA.dbo.filterResource where date in (select distinct top 2 date from VISUALIZED_DATA.dbo.filterResource order by date desc))
      select t.*, m.totalVal, i.LV4 from temp t
      inner join marketInfor.dbo.info i on i.code = t.code
      inner join marketTrade.dbo.tickerTradeVND m on m.code = t.code and m.date = t.date
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
          select avg(grossProfitMargin) as grossProfitMargin4Q,
                avg(netProfitMargin) as netProfitMargin4Q,
                avg(EBITDAMargin) as EBITDAMargin4Q,
                code
          from financialReport.dbo.calBCTC where yearQuarter in (select distinct top 4 yearQuarter from financialReport.dbo.calBCTC order by yearQuarter desc)
                                          group by code
      )
      select c.code,
            grossProfitMargin,
            y.grossProfitMargin4Q,
            netProfitMargin,
            y.netProfitMargin4Q,
            EBITDAMargin,
            y.EBITDAMargin4Q,
            currentRatio,
            quickRatio,
            interestCoverageRatio,
              DE,
              totalDebtToTotalAssets,
              ROE,
              ROA,
              ATR
      from financialReport.dbo.calBCTC c inner join yearQuarter4 y on y.code = c.code
      where yearQuarter = (select top 1 yearQuarter from financialReport.dbo.calBCTC order by yearQuarter desc)
      `

      const [data, data_2, data_3] = await Promise.all([this.mssqlService.query<FilterResponse[]>(query), this.mssqlService.query(query_2), this.mssqlService.query(query_3)]) 
      return FilterResponse.mapToList(data, data_2, data_3)
    } catch (e) {
      throw new CatchException(e)
    }
  }

  
}
