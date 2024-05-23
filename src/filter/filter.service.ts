import { Injectable } from '@nestjs/common';
import { CatchException } from '../exceptions/common.exception';
import { MssqlService } from '../mssql/mssql.service';

@Injectable()
export class FilterService {
  constructor(
    private readonly mssqlService: MssqlService
  ){}
  
  async get() {
    try {
      const query = `
      with temp as (select code, floor,
        TyleNDTNNdangnamgiu,
        closePrice, min_1_week, max_1_week, min_1_month, max_1_month, min_3_month, max_3_month, min_6_month, max_6_month, min_1_year, max_1_year,
        perChange1D, perChange5D, perChange1M, perChange3M, perChange6M, perChange1Y, beta,
        volume, TyLeKLMBCD, KNnetVal, KNnetVol,
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
        lead(BBL) over (partition by code order by date desc) as BBL_pre,
        doanh_thu_4_quy, loi_nhuan_4_quy,
        tang_truong_doanh_thu_4_quy, tang_truong_loi_nhuan_4_quy,
        qoq_doanh_thu, qoq_loi_nhuan,
        yoy_doanh_thu, yoy_loi_nhuan,
        EPS, BVPS, PE, PB, PS, marketCap,
        date
 from VISUALIZED_DATA.dbo.filterResource where date in (select distinct top 2 date from VISUALIZED_DATA.dbo.filterResource order by date desc))
 select t.*, i.LV4 from temp t
 inner join marketInfor.dbo.info i on i.code = t.code
 where date = (select max(date) from temp)
 and i.status = 'listed'`
      const data = await this.mssqlService.query(query)
      return data
    } catch (e) {
      throw new CatchException(e)
    }
  }
}
