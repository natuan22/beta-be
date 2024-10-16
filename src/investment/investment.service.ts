import { CACHE_MANAGER, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cache } from 'cache-manager';
import * as moment from 'moment';
import * as calTech from 'technicalindicators';
import { StepInstance } from 'twilio/lib/rest/studio/v1/flow/engagement/step';
import { Repository } from 'typeorm';
import { DB_SERVER } from '../constants';
import { TimeToLive } from '../enums/common.enum';
import { RedisKeys } from '../enums/redis-keys.enum';
import { CatchException, ExceptionResponse } from '../exceptions/common.exception';
import { MssqlService } from '../mssql/mssql.service';
import { ReportService } from '../report/report.service';
import { UtilCommonTemplate } from '../utils/utils.common';
import { EmulatorInvestmentDto } from './dto/emulator.dto';
import { InvestmentFilterDto } from './dto/investment-filter.dto';
import { SaveFilterDto, ValueSaveFilter } from './dto/save-filter.dto';
import { FilterUserEntity } from './entities/filter.entity';
import { EmulatorInvestmentResponse } from './response/emulatorInvestment.response';
import { FilterUserResponse } from './response/filterUser.response';
import { InvestmentFilterResponse } from './response/investmentFilter.response';
import { KeyFilterResponse } from './response/keyFilter.response';
import { InvestmentSearchResponse } from './response/searchStockInvestment.response';
import { DataBuySell, TickerTransLogResponse } from './response/tickerTransLog.response';
import { UtilsRandomUserAgent } from '../tcbs/utils/utils.random-user-agent';
import axios from 'axios';

@Injectable()
export class InvestmentService {
  constructor(
    private readonly mssqlService: MssqlService,
    @Inject(CACHE_MANAGER)
    private readonly redis: Cache,
    @InjectRepository(FilterUserEntity, DB_SERVER) private readonly filterUserRepo: Repository<FilterUserEntity>,
  ) { }


  async filter(b: InvestmentFilterDto) {
    const result = b.filter.map(item => `${item.key} >= ${item.from} and ${item.key} <= ${item.to}`).join(` and `)
    const inds: string = b.industry ? UtilCommonTemplate.getIndustryFilter(b.industry.split(',')) : '';

    const query = `
    SELECT
      COUNT(*) OVER () as count, *
    FROM VISUALIZED_DATA.dbo.filterInvesting
    WHERE ${result}
    AND floor IN (${b.exchange.toUpperCase() == 'ALL' ? `'HOSE', 'HNX', 'UPCOM'` : `${b.exchange.split(',').map(item => `'${item.toUpperCase()}'`)}`})
    ${inds ? `AND LV2 IN ${inds}` : ``}
    AND LEN(code) = 3
    ORDER BY code asc
    `

    const data = await this.mssqlService.query<InvestmentFilterResponse[]>(query)
    const dataMapped = InvestmentFilterResponse.mapToList(data)
    return dataMapped

  }

  async keyFilter() {
    const redisData = await this.redis.get(`${RedisKeys.minMaxFilter}`)
    if (redisData) return redisData

    const columns = await this.mssqlService.query(`SELECT top 1 * FROM VISUALIZED_DATA.dbo.filterInvesting`)
    const arr_column = Object.keys(columns[0]).slice(3, Object.keys(columns[0]).length - 1)

    const ex = arr_column.map(item => `max([${item}]) as ${item}_max, min([${item}]) as ${item}_min`).join(', ')

    const query = `
    select
      ${ex}
    from VISUALIZED_DATA.dbo.filterInvesting
    where len(code) = 3
    `

    const data = await this.mssqlService.query(query)

    const dataMapped = KeyFilterResponse.mapToList(data[0])
    await this.redis.set(RedisKeys.minMaxFilter, dataMapped, { ttl: TimeToLive.OneHour })
    return dataMapped
  }

  async saveFilter(user_id: number, b: SaveFilterDto) {
    try {

      const new_filter = this.filterUserRepo.create({...b, value: JSON.stringify(b.value), user: {user_id}})
      await this.filterUserRepo.save(new_filter)

    } catch (error) {
      throw new CatchException(error)
    }
  }

  async getFilterUser(user_id: number){
    try {
      const data = await this.filterUserRepo.find({where: {user: {user_id}}, order: {created_at: 'ASC'}})
      const dataMapped = FilterUserResponse.mapToList(data)
      return dataMapped
    } catch (e) {
      throw new CatchException(e)
    }
  }
  
  async updateFilter(filter_id: number, user_id: number, b: SaveFilterDto){
    try {
      const filter = await this.filterUserRepo.findOne({where: {user: {user_id}, filter_id}})
      if(!filter) throw new ExceptionResponse(HttpStatus.BAD_REQUEST, 'Filter not found')

      await this.filterUserRepo.update({filter_id}, {...b, value: JSON.stringify(b.value)})

    } catch (e) {
      throw new CatchException(e)
    }
  }

  async deleteFilter(filter_id: number, user_id: number){
    try {
      const filter = await this.filterUserRepo.findOne({where: {user: {user_id}, filter_id}})
      if(!filter) throw new ExceptionResponse(HttpStatus.BAD_REQUEST, 'Filter not found') 

      await this.filterUserRepo.delete({filter_id})
    } catch (e) {
      throw new CatchException(e)
    }
  }

  async emulatorInvestment(b: EmulatorInvestmentDto) {
    try {
      const value = b.value * 1000000
      const from = moment(b.from, 'M/YYYY')
      const to = moment(b.to, 'M/YYYY')

      if (to.month() == moment().month()) throw new ExceptionResponse(HttpStatus.BAD_REQUEST, 'To không được là tháng hiện tại')
      if (to.isBefore(from)) throw new ExceptionResponse(HttpStatus.BAD_REQUEST, 'From To không đúng')

      const date = [...this.getMonth(to.diff(from, 'month') + 1, moment(b.to, 'M/YYYY').add(1, 'month')), from.startOf('month').format('YYYY-MM-DD')]

      const query_date = b.isPeriodic ? (await this.mssqlService.query(`
      with date_ranges as (
          select
          ${date.map((item, index) => `min(case when date >= '${item}' then date else null end) as date_${index + 1}`).join(',')}
          from marketTrade.dbo.historyTicker
          where date >= '${date[date.length - 1]}'
      )
      select *
      from date_ranges;
      `))[0] : []

      //Lấy giá cổ phiếu
      const query = !b.isPeriodic ? `
      select closePrice, code, date from marketTrade.dbo.historyTicker 
      where date >= '${from.startOf('month').format('YYYY-MM-DD')}' 
      and date <= '${to.endOf('month').format('YYYY-MM-DD')}'
      and code in (${b.category.map(item => `'${item.code}'`).join(',')})
      order by date asc
      `
        : `
      select closePrice, code, date from marketTrade.dbo.historyTicker 
      where date in (${Object.values(query_date).map(item => `'${UtilCommonTemplate.toDate(item)}'`).join(',')})
      and code in (${b.category.map(item => `'${item.code}'`).join(',')})
      order by date asc
      `

      //Lấy giá VNINDEX
      const query_2 = !b.isPeriodic ? `
      select closePrice, code, date from marketTrade.dbo.indexTradeVND 
      where date >= '${from.startOf('month').format('YYYY-MM-DD')}' 
      and date <= '${to.endOf('month').format('YYYY-MM-DD')}'
      and code = 'VNINDEX'
      order by date asc
      ` : `
      select closePrice, code, date from marketTrade.dbo.indexTradeVND 
      where date in (${Object.values(query_date).map(item => `'${UtilCommonTemplate.toDate(item)}'`).join(',')})
      and code = 'VNINDEX'
      order by date asc
      `

      //Kỳ hạn 5 năm
      const query_3 = `
      select top 1 laiSuatPhatHanh as value from [marketBonds].[dbo].[BondsInfor] where code ='VCB' and kyHan =N'5 năm' order by ngayPhatHanh desc
      `

      const promise = this.mssqlService.query(query)
      const promise_2 = this.mssqlService.query(query_2)
      const promise_3 = this.mssqlService.query(query_3)

      const [data, data_2, data_3] = await Promise.all([promise, promise_2, promise_3]) as any

      const result = {}
      const date_arr = data.filter(item => item.code == b.category[0].code).map(item => item.date)

      for (const item of b.category) {
        const list_price = data.filter(i => i.code == item.code).map(item => item.closePrice);

        const gttd_1_arr = []
        const gttd_2_arr = []
        const gttd_3_arr = []

        const lai_lo_1_arr = []
        const lai_lo_2_arr = []
        const lai_lo_3_arr = []

        const loi_nhuan_danh_muc_1 = []
        const loi_nhuan_danh_muc_2 = []
        const loi_nhuan_danh_muc_3 = []

        for (let i = 0; i < list_price.length; i++) {
          let gttd_1 = 0
          let gttd_2 = 0
          let gttd_3 = 0

          if (i == 0) {
            //Tính giá trị thay đổi
            gttd_1 = value * item.category_1 / 100
            gttd_2 = value * item.category_2 / 100
            gttd_3 = value * item.category_3 / 100
          } else {
            gttd_1 = ((value * item.category_1 / 100) / list_price[i - 1]) * list_price[i]
            gttd_2 = ((value * item.category_2 / 100) / list_price[i - 1]) * list_price[i]
            gttd_3 = ((value * item.category_3 / 100) / list_price[i - 1]) * list_price[i]
          }

          gttd_1_arr.push(gttd_1)
          gttd_2_arr.push(gttd_2)
          gttd_3_arr.push(gttd_3)

          //Tính lãi lỗ
          const lai_lo_1 = gttd_1 - gttd_1_arr[0]
          const lai_lo_2 = gttd_2 - gttd_2_arr[0]
          const lai_lo_3 = gttd_3 - gttd_3_arr[0]

          //Tính lợi nhuận
          const loi_nhuan_1 = lai_lo_1 / gttd_1_arr[0] * 100
          const loi_nhuan_2 = lai_lo_2 / gttd_2_arr[0] * 100
          const loi_nhuan_3 = lai_lo_3 / gttd_3_arr[0] * 100

          loi_nhuan_danh_muc_1.push(loi_nhuan_1)
          loi_nhuan_danh_muc_2.push(loi_nhuan_2)
          loi_nhuan_danh_muc_3.push(loi_nhuan_3)

          lai_lo_1_arr.push(lai_lo_1)
          lai_lo_2_arr.push(lai_lo_2)
          lai_lo_3_arr.push(lai_lo_3)
        }

        const so_tien_thu_duoc_1 = (value * item.category_1 / 100) / list_price[0] * list_price[list_price.length - 1]
        const so_tien_thu_duoc_2 = (value * item.category_2 / 100) / list_price[0] * list_price[list_price.length - 1]
        const so_tien_thu_duoc_3 = (value * item.category_3 / 100) / list_price[0] * list_price[list_price.length - 1]

        result[item.code] = { so_tien_thu_duoc_1, so_tien_thu_duoc_2, so_tien_thu_duoc_3, loi_nhuan_danh_muc_1, loi_nhuan_danh_muc_2, loi_nhuan_danh_muc_3, gttd_1_arr, gttd_2_arr, gttd_3_arr, lai_lo_1_arr, lai_lo_2_arr, lai_lo_3_arr }
      }

      let loi_nhuan_theo_co_phieu_1 = []
      let loi_nhuan_theo_co_phieu_2 = []
      let loi_nhuan_theo_co_phieu_3 = []

      let so_tien_thu_duoc_1 = 0
      let so_tien_thu_duoc_2 = 0
      let so_tien_thu_duoc_3 = 0

      let loi_nhuan_1_arr = []
      let loi_nhuan_2_arr = []
      let loi_nhuan_3_arr = []

      let gttd_1_arr = []
      let gttd_2_arr = []
      let gttd_3_arr = []

      let lai_lo_1_arr = []
      let lai_lo_2_arr = []
      let lai_lo_3_arr = []

      for (const item of Object.keys(result)) {

        so_tien_thu_duoc_1 += result[item].so_tien_thu_duoc_1
        so_tien_thu_duoc_2 += result[item].so_tien_thu_duoc_2
        so_tien_thu_duoc_3 += result[item].so_tien_thu_duoc_3

        loi_nhuan_1_arr = this.addArrays(loi_nhuan_1_arr, result[item].loi_nhuan_danh_muc_1)
        loi_nhuan_2_arr = this.addArrays(loi_nhuan_2_arr, result[item].loi_nhuan_danh_muc_2)
        loi_nhuan_3_arr = this.addArrays(loi_nhuan_3_arr, result[item].loi_nhuan_danh_muc_3)

        gttd_1_arr = this.addArrays(gttd_1_arr, result[item].gttd_1_arr)
        gttd_2_arr = this.addArrays(gttd_2_arr, result[item].gttd_2_arr)
        gttd_3_arr = this.addArrays(gttd_3_arr, result[item].gttd_3_arr)

        lai_lo_1_arr = this.addArrays(lai_lo_1_arr, result[item].lai_lo_1_arr)
        lai_lo_2_arr = this.addArrays(lai_lo_2_arr, result[item].lai_lo_2_arr)
        lai_lo_3_arr = this.addArrays(lai_lo_3_arr, result[item].lai_lo_3_arr)

        loi_nhuan_theo_co_phieu_1.push(...result[item].loi_nhuan_danh_muc_1.map((i, index) => ({ code: item, value: i, date: date_arr[index] })))
        loi_nhuan_theo_co_phieu_2.push(...result[item].loi_nhuan_danh_muc_2.map((i, index) => ({ code: item, value: i, date: date_arr[index] })))
        loi_nhuan_theo_co_phieu_3.push(...result[item].loi_nhuan_danh_muc_3.map((i, index) => ({ code: item, value: i, date: date_arr[index] })))
      }

      const loi_nhuan_danh_muc_1 = (so_tien_thu_duoc_1 - value) / value * 100
      const loi_nhuan_danh_muc_2 = (so_tien_thu_duoc_2 - value) / value * 100
      const loi_nhuan_danh_muc_3 = (so_tien_thu_duoc_3 - value) / value * 100

      const loi_nhuan_cao_nhat_1 = Math.max(...loi_nhuan_1_arr.filter(item => item > 0))
      const loi_nhuan_cao_nhat_2 = Math.max(...loi_nhuan_2_arr.filter(item => item > 0))
      const loi_nhuan_cao_nhat_3 = Math.max(...loi_nhuan_3_arr.filter(item => item > 0))

      const loi_nhuan_thap_nhat_1 = Math.min(...loi_nhuan_1_arr.filter(item => item > 0))
      const loi_nhuan_thap_nhat_2 = Math.min(...loi_nhuan_2_arr.filter(item => item > 0))
      const loi_nhuan_thap_nhat_3 = Math.min(...loi_nhuan_3_arr.filter(item => item > 0))

      const loi_nhuan_am_thap_nhat_1 = Math.min(...loi_nhuan_1_arr.filter(item => item < 0))
      const loi_nhuan_am_thap_nhat_2 = Math.min(...loi_nhuan_2_arr.filter(item => item < 0))
      const loi_nhuan_am_thap_nhat_3 = Math.min(...loi_nhuan_3_arr.filter(item => item < 0))

      const tg_loi_nhuan_cao_nhat_1 = date_arr[loi_nhuan_1_arr.findIndex(item => item == loi_nhuan_cao_nhat_1)]
      const tg_loi_nhuan_cao_nhat_2 = date_arr[loi_nhuan_2_arr.findIndex(item => item == loi_nhuan_cao_nhat_2)]
      const tg_loi_nhuan_cao_nhat_3 = date_arr[loi_nhuan_3_arr.findIndex(item => item == loi_nhuan_cao_nhat_3)]

      const tg_loi_nhuan_thap_nhat_1 = date_arr[loi_nhuan_1_arr.findIndex(item => item == loi_nhuan_thap_nhat_1)]
      const tg_loi_nhuan_thap_nhat_2 = date_arr[loi_nhuan_2_arr.findIndex(item => item == loi_nhuan_thap_nhat_2)]
      const tg_loi_nhuan_thap_nhat_3 = date_arr[loi_nhuan_3_arr.findIndex(item => item == loi_nhuan_thap_nhat_3)]

      const tg_loi_nhuan_am_thap_nhat_1 = date_arr[loi_nhuan_1_arr.findIndex(item => item == loi_nhuan_am_thap_nhat_1)]
      const tg_loi_nhuan_am_thap_nhat_2 = date_arr[loi_nhuan_2_arr.findIndex(item => item == loi_nhuan_am_thap_nhat_2)]
      const tg_loi_nhuan_am_thap_nhat_3 = date_arr[loi_nhuan_3_arr.findIndex(item => item == loi_nhuan_am_thap_nhat_3)]

      const loi_nhuan_trung_binh_1 = loi_nhuan_1_arr.reduce((acc, curr) => acc + curr, 0) / loi_nhuan_1_arr.length
      const loi_nhuan_trung_binh_2 = loi_nhuan_2_arr.reduce((acc, curr) => acc + curr, 0) / loi_nhuan_2_arr.length
      const loi_nhuan_trung_binh_3 = loi_nhuan_3_arr.reduce((acc, curr) => acc + curr, 0) / loi_nhuan_3_arr.length

      const gia_tri_danh_muc_cao_nhat_1 = Math.max(...gttd_1_arr)
      const gia_tri_danh_muc_cao_nhat_2 = Math.max(...gttd_2_arr)
      const gia_tri_danh_muc_cao_nhat_3 = Math.max(...gttd_3_arr)

      const gia_tri_danh_muc_thap_nhat_1 = Math.min(...gttd_1_arr)
      const gia_tri_danh_muc_thap_nhat_2 = Math.min(...gttd_2_arr)
      const gia_tri_danh_muc_thap_nhat_3 = Math.min(...gttd_3_arr)

      const rf = data_3[0].value
      const sharpe_1 = this.sharpeCalculate(rf, loi_nhuan_danh_muc_1, (gia_tri_danh_muc_cao_nhat_1 + gia_tri_danh_muc_thap_nhat_1) / 2, gia_tri_danh_muc_cao_nhat_1)
      const sharpe_2 = this.sharpeCalculate(rf, loi_nhuan_danh_muc_2, (gia_tri_danh_muc_cao_nhat_2 + gia_tri_danh_muc_thap_nhat_2) / 2, gia_tri_danh_muc_cao_nhat_2)
      const sharpe_3 = this.sharpeCalculate(rf, loi_nhuan_danh_muc_3, (gia_tri_danh_muc_cao_nhat_3 + gia_tri_danh_muc_thap_nhat_3) / 2, gia_tri_danh_muc_cao_nhat_3)

      const roc_1 = loi_nhuan_1_arr
      const roc_2 = loi_nhuan_2_arr
      const roc_3 = loi_nhuan_3_arr

      const roc_tt = data_2.map((item, index) => index == 0 ? 0 : (item.closePrice - data_2[0].closePrice) / data_2[0].closePrice * 100)

      const beta_1 = this.betaCalculate(roc_1, roc_tt)
      const beta_2 = this.betaCalculate(roc_2, roc_tt)
      const beta_3 = this.betaCalculate(roc_3, roc_tt)

      const alpha_1 = this.alphaCalculate(loi_nhuan_danh_muc_1, rf, roc_tt[roc_tt.length - 1], beta_1)
      const alpha_2 = this.alphaCalculate(loi_nhuan_danh_muc_2, rf, roc_tt[roc_tt.length - 1], beta_2)
      const alpha_3 = this.alphaCalculate(loi_nhuan_danh_muc_3, rf, roc_tt[roc_tt.length - 1], beta_3)

      //Hiệu quả đầu tư theo danh mục
      const percent_loi_nhuan_danh_muc = loi_nhuan_1_arr.map((item_1, index) => ({ name: 'Danh mục 1', value: item_1, date: date_arr[index] })).concat(loi_nhuan_2_arr.map((item_2, index) => ({ name: 'Danh mục 2', value: item_2, date: date_arr[index] }))).concat(loi_nhuan_3_arr.map((item_3, index) => ({ name: 'Danh mục 3', value: item_3, date: date_arr[index] })))
      const percent_loi_nhuan = [...roc_tt.map((item, index) => ({ name: 'VNINDEX', value: item, date: date_arr[index] }))].concat(percent_loi_nhuan_danh_muc).sort((a, b) => Date.parse(a.date) - Date.parse(b.date)).map(item => ({ ...item, date: UtilCommonTemplate.toDate(item.date) }))

      //Hiệu quả đầu tư theo cổ phiếu
      const hieu_qua_dau_tu_co_phieu = {
        danh_muc_1: loi_nhuan_theo_co_phieu_1.sort((a, b) => Date.parse(a.date) - Date.parse(b.date)).map(item => ({ ...item, date: UtilCommonTemplate.toDate(item.date) })),
        danh_muc_2: loi_nhuan_theo_co_phieu_2.sort((a, b) => Date.parse(a.date) - Date.parse(b.date)).map(item => ({ ...item, date: UtilCommonTemplate.toDate(item.date) })),
        danh_muc_3: loi_nhuan_theo_co_phieu_3.sort((a, b) => Date.parse(a.date) - Date.parse(b.date)).map(item => ({ ...item, date: UtilCommonTemplate.toDate(item.date) })),
      }

      //Biểu đồ lãi lỗ theo danh mục
      const bieu_do_lai_lo_danh_muc = lai_lo_1_arr.map((item, index) => ({ name: 'Danh mục 1', value: item, date: UtilCommonTemplate.toDate(date_arr[index]) })).concat(lai_lo_2_arr.map((item, index) => ({ name: 'Danh mục 2', value: item, date: UtilCommonTemplate.toDate(date_arr[index]) }))).concat(lai_lo_3_arr.map((item, index) => ({ name: 'Danh mục 3', value: item, date: UtilCommonTemplate.toDate(date_arr[index]) })))
      const bieu_do_lai_lo_vn_index = data_2.map((item) => ({ name: item.code, value: item.closePrice - data_2[0].closePrice, date: UtilCommonTemplate.toDate(item.date) }))
      const bieu_do_lai_lo = bieu_do_lai_lo_danh_muc.concat(bieu_do_lai_lo_vn_index).sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
      const dataMapped = EmulatorInvestmentResponse.mapToList({
        value: b.value,
        so_tien_thu_duoc_1,
        so_tien_thu_duoc_2,
        so_tien_thu_duoc_3,
        loi_nhuan_danh_muc_1,
        loi_nhuan_danh_muc_2,
        loi_nhuan_danh_muc_3,
        lai_thap_nhat_danh_muc_1: loi_nhuan_thap_nhat_1,
        lai_thap_nhat_danh_muc_2: loi_nhuan_thap_nhat_2,
        lai_thap_nhat_danh_muc_3: loi_nhuan_thap_nhat_3,
        lai_cao_nhat_danh_muc_1: loi_nhuan_cao_nhat_1,
        lai_cao_nhat_danh_muc_2: loi_nhuan_cao_nhat_2,
        lai_cao_nhat_danh_muc_3: loi_nhuan_cao_nhat_3,
        lai_trung_binh_danh_muc_1: loi_nhuan_trung_binh_1,
        lai_trung_binh_danh_muc_2: loi_nhuan_trung_binh_2,
        lai_trung_binh_danh_muc_3: loi_nhuan_trung_binh_3,
        loi_nhuan_am_cao_nhat_danh_muc_1: loi_nhuan_am_thap_nhat_1,
        loi_nhuan_am_cao_nhat_danh_muc_2: loi_nhuan_am_thap_nhat_2,
        loi_nhuan_am_cao_nhat_danh_muc_3: loi_nhuan_am_thap_nhat_3,
        tg_loi_nhuan_cao_nhat_1,
        tg_loi_nhuan_cao_nhat_2,
        tg_loi_nhuan_cao_nhat_3,
        tg_loi_nhuan_thap_nhat_1,
        tg_loi_nhuan_thap_nhat_2,
        tg_loi_nhuan_thap_nhat_3,
        tg_loi_nhuan_am_thap_nhat_1,
        tg_loi_nhuan_am_thap_nhat_2,
        tg_loi_nhuan_am_thap_nhat_3,
        sharpe_1,
        sharpe_2,
        sharpe_3,
        beta_1,
        beta_2,
        beta_3,
        alpha_1,
        alpha_2,
        alpha_3,
        percent_loi_nhuan,
        hieu_qua_dau_tu_co_phieu,
        bieu_do_lai_lo
      })
      return dataMapped
    } catch (e) {
      throw new CatchException(e)
    }
  }

  async search(stock: string) {
    const query = `
      with temp as (select code, companyName as company_name, floor, status from marketInfor.dbo.info
      where code like N'%${UtilCommonTemplate.normalizedString(stock)}%' and type = 'STOCK')
      select * from temp where status = 'listed'
    `
    const data = await this.mssqlService.query<InvestmentSearchResponse[]>(query)
    const dataMapped = InvestmentSearchResponse.mapToList(data)
    return dataMapped
  }

  private sharpeCalculate(rf: number, rp: number, TBGT_DM: number, gtcn: number) {
    return (rp - rf) / ((gtcn - TBGT_DM) / TBGT_DM)
  }

  private betaCalculate(roc_danh_muc: number[], roc_tt: number[]) {
    return this.calculateCovariance(roc_danh_muc, roc_tt) / this.calculateVariance(roc_tt)
  }

  private alphaCalculate(rp: number, rf: number, rm: number, beta: number) {
    return rp - (rf + (rm - rf) * beta)
  }

  private calculateVariance(data: number[]) {
    if (data.length < 2) {
      throw new Error("Tập dữ liệu phải có ít nhất 2 giá trị.");
    }

    const N = data.length;
    const mean = data.reduce((sum, value) => sum + value, 0) / N;

    let variance = 0;

    for (let i = 0; i < N; i++) {
      variance += (data[i] - mean) ** 2;
    }

    variance /= (N - 1); // Chia cho (N-1) để tính variance mẫu

    return variance;
  }


  private calculateCovariance(X: number[], Y: number[]) {
    if (X.length !== Y.length || X.length < 2) {
      throw new Error("X và Y phải có cùng độ dài và ít nhất 2 giá trị.");
    }

    const N = X.length;
    const meanX = X.reduce((sum, value) => sum + value, 0) / N;
    const meanY = Y.reduce((sum, value) => sum + value, 0) / N;

    let covariance = 0;

    for (let i = 0; i < N; i++) {
      covariance += (X[i] - meanX) * (Y[i] - meanY);
    }

    covariance /= (N - 1); // Chia cho (N-1) để tính covariance mẫu

    return covariance;
  }


  private addArrays(...arrays) {
    const maxLength = Math.max(...arrays.map(arr => arr.length));
    const result = new Array(maxLength).fill(0);

    for (let i = 0; i < maxLength; i++) {
      for (const arr of arrays) {
        if (i < arr.length) {
          result[i] += arr[i];
        }
      }
    }

    return result;
  }

  private getMonth(
    count: number,
    date: moment.Moment | Date | string = new Date(),
    results = [],
  ) {
    if (count === 0) {
      return results
    }
    let previousEndDate: moment.Moment | Date | string;
    previousEndDate = moment(date).subtract(1, 'month').endOf('month');
    results.push(previousEndDate.format('YYYY-MM-DD'));

    return this.getMonth(count - 1, previousEndDate, results);
  }

  async test(stock: string | any[], from: string, to: string, haveMa?: 0 | 1, realtimePrice?: number, role?: number){
    const listStock: any = !Array.isArray(stock) ? `= '${stock}'` : `in (${stock.map(item => `'${item.code}'`).join(',')})` 

    const [dataRedis, dateRedis, dateToRedis] = await Promise.all([
      this.redis.get(`price:${listStock}`),
      this.redis.get(`price:${from}`),
      this.redis.get(`price:${to}`),
    ])

    let [data, lastPrice, date, dateTo] = await Promise.all([
          !dataRedis ? this.mssqlService.query(`select closePrice, date, code from marketTrade.dbo.historyTicker where code ${listStock} order by date asc`) as any : [], 
          !realtimePrice ? this.mssqlService.query(`
          WITH LatestTrade AS (
            SELECT
                closePrice,
                date,
                code,
                ROW_NUMBER() OVER (PARTITION BY code ORDER BY date DESC, time DESC) AS rn
            FROM
                tradeIntraday.dbo.tickerTradeVNDIntraday
            WHERE
                code ${listStock}
        )
        SELECT
            closePrice,
            date,
            code
        FROM
            LatestTrade
        WHERE
            rn = 1
        ORDER BY
            code;
          `) : 1 as any, 
          !dateRedis ? this.mssqlService.query(`select top 1 date from marketTrade.dbo.historyTicker where date >= '${moment(from).format('YYYY-MM-DD')}' order by date asc`) : [],
          !dateToRedis ? this.mssqlService.query(`select top 1 date from marketTrade.dbo.historyTicker where date <= '${moment(to).format('YYYY-MM-DD')}' order by date desc`) : []
      ])

    if(realtimePrice && !dataRedis){
      await this.redis.set(`price:${listStock}`, data, {ttl: 180})
    }
    if(!dateRedis){
      await this.redis.set(`price:${from}`, date, {ttl: 180})
    }
    if(!dateToRedis){
      await this.redis.set(`price:${to}`, dateTo, {ttl: 180})
    }

    if(dataRedis){
      data = dataRedis
    }
    if(dateRedis){
      date = dateRedis
    }
    if(dateToRedis){
      dateTo = dateToRedis
    }

    if(Array.isArray(stock)){
      const arr = []

      stock.map((item: any) => {
        const price = data.filter(res => res.code == item.code)
        price[price.length - 1]['closePrice'] = !realtimePrice ? (lastPrice.find(price => price.code == item.code)).closePrice : realtimePrice
        
        const result = !haveMa ? this.calculateMAIndex([...data.filter(res => res.code == item.code)], date, dateTo) : this.calculateMAIndex([...data.filter(res => res.code == item.code)], date, dateTo, item.ma)
        arr.push({
          code: item.code,
          name: result.max.name,
          total: result.max.total,
          closePrice: result.data[result.data.length - 1].closePrice,
          signal: result.max.signal,
          ma: result.max.ma,
          closePricePrev: result.data[result.data.length - 1].closePricePrev
        })
      })

      return arr
    }
    
    const result = this.calculateMAIndex(data, date, dateTo, undefined, role)
    return result
  }

  private calculateMAIndex(data: any, date: any, dateTo: any, maNumber?: number, role?: number){
    const price = data.map(item => item.closePrice)
    const dateFormat = data.map(item => ({...item, date: UtilCommonTemplate.toDateV2(item.date)}))
    const indexDateFrom = dateFormat.findIndex(item => item.date == UtilCommonTemplate.toDateV2(date[0].date))
    const indexDateTo = dateFormat.findIndex(item => item.date == UtilCommonTemplate.toDateV2(dateTo[0].date))
    
    const arr = []
    let ma = !role ? [5, 10, 20, 50, 60, 100] : Array.from({ length: 96 }, (_, i) => i + 5);
    if(maNumber) {ma = [maNumber]} 

      ma.forEach(value => {
        const ma = calTech.sma({values: price, period: value})
        const maReverse = [...ma].reverse()
        const newData = [...dateFormat].reverse().map((item, index) => ({...item, ma: maReverse[index] || 0}))
  
        let isBuy = false
        let indexBuy = 0
        let count = 0
        let total = 1
        let min = 0, max = 0
        const detail = []
        let lastSignal = 0 // 0 - Mua, 1 - Bán, 2 - Hold mua, 3 - Hold bán
  
        const dataWithMa = [...newData].reverse().slice(indexDateFrom, indexDateTo + 1)
         
        dataWithMa.map((item, index) => {
          if(dataWithMa[index - 1]?.closePrice && (item.closePrice > item.ma) && (dataWithMa[index - 1].closePrice <= dataWithMa[index - 1].ma) && !isBuy){
            isBuy = true
            indexBuy = index 
            count += 1
          }
          if(index == dataWithMa.length - 1){
            lastSignal = (dataWithMa[index - 1]?.closePrice && (item.closePrice > item.ma) && (dataWithMa[index - 1].closePrice < dataWithMa[index - 1].ma)) ? 0 : ((dataWithMa[index - 1]?.closePrice && (item.closePrice < item.ma) && (dataWithMa[index - 1].closePrice > dataWithMa[index - 1].ma)) ? 1 : (isBuy ? 2 : 3))
          }
          if((dataWithMa[index - 1]?.closePrice && (item.closePrice < item.ma) && (dataWithMa[index - 1].closePrice > dataWithMa[index - 1].ma) && isBuy) || (index == (dataWithMa.length - 1) && isBuy)){
            isBuy = false
            const percent = (item.closePrice - dataWithMa[indexBuy].closePrice) / dataWithMa[indexBuy].closePrice * 100
  
            total = total * (1 + percent / 100)
            min = Math.min(min, (percent / 100))
            max = Math.max(max, (percent / 100))
  
            detail.push({
              date_buy: dataWithMa[indexBuy].date,
              date_sell: item.date,
              price_buy: dataWithMa[indexBuy].closePrice,
              price_sell: item.closePrice,
              profit: percent
            })
          }
          
        })
  
        arr.push({
          name: `MA_${value}`,
          total: total - 1,
          count: count,
          min,
          max,
          detail,
          closePrice: price[price.length - 1],
          signal: lastSignal,
          ma: maReverse[0],
          closePricePrev: price[price.length - 2]
        })
      })
   
    const max = arr.reduce((acc, curr) => (!acc?.total ? arr[0] : curr.total > acc.total ? curr : acc), arr[0]);
    
    return {
      max: max,
      data: arr
    }
  }

  async allStock(){
    try {
      const data: any = await this.mssqlService.query(`select code from marketInfor.dbo.info where status = 'listed' and type = 'STOCK'`)
      return data.map(item => item.code)
    } catch (e) {
      throw new CatchException(e)
    }
  }

  async testAllStock(code: string[], from: string, to: string){
    const data = await this.test(code.map(item => ({code: item})), from, to)
    return data
  }

  async createBetaWatchList(body: any){
    const data: any = await this.redis.get('beta-watch-list') || []
    if(data.find(item => item.code == body.code)) throw new ExceptionResponse(HttpStatus.BAD_REQUEST, 'Mã đã tồn tại')
    
    const newItem = {
      code: body.code,
      price_2024: body?.price_2024 ? parseFloat(body?.price_2024) : 0,
      price_2025: body?.price_2025 ? parseFloat(body?.price_2025) : 0,
      ma: body?.ma ? parseInt(body?.ma ) : 0
    }
    let price

    if(!body?.is_beta_page) {
      price = await this.test(body.code, body.from, body.to)
    }else {
      price = await this.test([{code: body.code, ma: body.ma}], moment().subtract(2, 'year').format('YYYY-MM-DD'), moment().format('YYYY-MM-DD'), 1)
    }

    await this.redis.set('beta-watch-list', [...data, newItem], {ttl: 0})
    return price
  }

  async updateBetaWatchList(body: any){
    const data: any = await this.redis.get('beta-watch-list')
    if(!data) throw new ExceptionResponse(HttpStatus.BAD_REQUEST, 'Không có mã')

    const index = data.findIndex(item => item.code == body.code)
    if(index == -1) throw new ExceptionResponse(HttpStatus.BAD_REQUEST, 'Mã không tồn tại')

    const newItem = {
      code: body.code,
      price_2024: body?.price_2024 ? parseFloat(body?.price_2024) : 0,
      price_2025: body?.price_2025 ? parseFloat(body?.price_2025) : 0,
      ma: body?.ma ? parseInt(body?.ma ) : 0
    }

    data[index] = newItem
    
    await this.redis.set('beta-watch-list', data, {ttl: 0})

    if(body?.is_beta_page){
      const price = await this.test([{code: body.code, ma: body.ma}], moment().subtract(2, 'year').format('YYYY-MM-DD'), moment().format('YYYY-MM-DD'), 1)
      return price
    }
  }

  async deleteBetaWatchList(code: string){
    const data: any = await this.redis.get('beta-watch-list')
    const index = data.findIndex(item => item.code == code)
    if(index == -1) throw new ExceptionResponse(HttpStatus.BAD_REQUEST, 'Mã không tồn tại')
    
    await this.redis.set('beta-watch-list', data.filter(item => item.code != code), {ttl: 0})
  }

  async getBetaWatchList(from: string, to: string){
    const data: any = await this.redis.get('beta-watch-list')
    if(from){
      const result: any = await this.testAllStock(data.map(item => item.code), from, to)
      return result.map((item, index) => ({...item, price_2024: data[index].price_2024 || 0, price_2025: data[index].price_2025 || 0}))
    }
      const result: any = await this.test(data.map(item => ({code: item.code, ma: item.ma})), moment().subtract(2, 'year').format('YYYY-MM-DD'), moment().format('YYYY-MM-DD'), 1)
      return result.map((item, index) => ({...item, price_2024: data[index].price_2024 || 0, price_2025: data[index].price_2025 || 0, name: `MA_${data[index].ma}`}))
  }

  async tickerTransLog(code: string) {
    const redisData = await this.redis.get(`${RedisKeys.tickerTransLog}:${code}`);
    if (redisData) return redisData;
    
    try {
      const response = await axios.get(
        `https://priceapi.bsc.com.vn/datafeed/alltranslogs/${code}`,
        {
          headers: {
            "host": "priceapi.bsc.com.vn",
            "origin": "https://trading.bsc.com.vn",
            "referer": "https://trading.bsc.com.vn/",
            "User-Agent": UtilsRandomUserAgent.getRandomUserAgent(),
            "x-devicetype": "WEB",
            "x-lang": 'vi'
          },
        }
      );

      const query = ` SELECT closePrice
                      FROM marketTrade.dbo.tickerTradeVND t
                      INNER JOIN (
                          SELECT MAX(date) AS max_previous_date
                          FROM tradeIntraday.dbo.tickerTradeVNDIntraday
                          WHERE date < (SELECT MAX(date) FROM tradeIntraday.dbo.tickerTradeVNDIntraday)
                      ) latest ON t.date = latest.max_previous_date
                      WHERE t.code = '${code}';
      `
      const data_2 = await this.mssqlService.query(query)
        
      const dataCal = response.data.d.map((item) => {
        const value = item.formattedMatchPrice * item.formattedVol;
        const type = value < 100_000_000 
                              ? "small"
                              : value < 1_000_000_000
                              ? "medium"
                              : "large";

        const currentDate = new Date();
        
        const [hours, minutes, seconds] = item.formattedTime.split(":").map(Number);
        
        const time = new Date(
          Date.UTC(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            currentDate.getDate(),
            hours,
            minutes,
            seconds
          )
        ).toISOString(); // Chuyển thành định dạng ISO

        return {
          time,
          action: item.lastColor === "S" ? "B" : item.lastColor === "B" ? "S" : item.lastColor,
          type,
          volume: +item.formattedVol,
          value: value,
          matchPrice: item.formattedMatchPrice / 1_000,
          priceChangeReference: item.formattedChangeValue / 1_000,
          perChangeReference: (item.formattedChangeValue / 1000 / data_2[0].closePrice) * 100,
          highlight: value > 1_000_000_000,
        }
      })

      const finalResponse = new TickerTransLogResponse({
        ticker : code,
        prevClosePrice: data_2[0].closePrice,
        data: DataBuySell.mapToList(dataCal)
      })

      await this.redis.set(`${RedisKeys.tickerTransLog}:${code}`, finalResponse, { ttl: TimeToLive.HaftMinute })

      return finalResponse

    } catch (err) {
      console.error(err);
    }
  }
}
