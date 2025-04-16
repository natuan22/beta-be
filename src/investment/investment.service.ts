import { CACHE_MANAGER, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cache } from 'cache-manager';
import * as moment from 'moment';
import * as _ from 'lodash';
import * as calTech from 'technicalindicators';
import { StepInstance } from 'twilio/lib/rest/studio/v1/flow/engagement/step';
import { Repository } from 'typeorm';
import { DB_SERVER } from '../constants';
import { TimeToLive } from '../enums/common.enum';
import { RedisKeys } from '../enums/redis-keys.enum';
import {
  CatchException,
  ExceptionResponse,
} from '../exceptions/common.exception';
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
import {
  DataBuySell,
  TickerTransLogResponse,
} from './response/tickerTransLog.response';
import { UtilsRandomUserAgent } from '../tcbs/utils/utils.random-user-agent';
import axios from 'axios';
import { BetaSmartResponse } from './response/betaSmart.response';
import { StockValuationDto } from './dto/stock-valuation.dto';

@Injectable()
export class InvestmentService {
  constructor(
    private readonly mssqlService: MssqlService,
    @Inject(CACHE_MANAGER)
    private readonly redis: Cache,
    @InjectRepository(FilterUserEntity, DB_SERVER)
    private readonly filterUserRepo: Repository<FilterUserEntity>,
  ) {}

  async filter(b: InvestmentFilterDto) {
    const result = b.filter
      .map(
        (item) => `${item.key} >= ${item.from} and ${item.key} <= ${item.to}`,
      )
      .join(` and `);
    const inds: string = b.industry
      ? UtilCommonTemplate.getIndustryFilter(b.industry.split(','))
      : '';

    const query = `
      SELECT COUNT(*) OVER () as count, *
      FROM VISUALIZED_DATA.dbo.filterInvesting
      WHERE ${result}
      AND floor IN (${
        b.exchange.toUpperCase() == 'ALL'
          ? `'HOSE', 'HNX', 'UPCOM'`
          : `${b.exchange.split(',').map((item) => `'${item.toUpperCase()}'`)}`
      })
      ${inds ? `AND LV2 IN ${inds}` : ``}
      AND LEN(code) = 3
      ORDER BY code asc
    `;

    const data = await this.mssqlService.query<InvestmentFilterResponse[]>(
      query,
    );
    const dataMapped = InvestmentFilterResponse.mapToList(data);
    return dataMapped;
  }

  async keyFilter() {
    const redisData = await this.redis.get(`${RedisKeys.minMaxFilter}`);
    if (redisData) return redisData;

    const columns = await this.mssqlService.query(
      `SELECT top 1 * FROM VISUALIZED_DATA.dbo.filterInvesting`,
    );
    const arr_column = Object.keys(columns[0]).slice(
      3,
      Object.keys(columns[0]).length - 1,
    );

    const ex = arr_column
      .map(
        (item) =>
          `max([${item}]) as ${item}_max, min([${item}]) as ${item}_min`,
      )
      .join(', ');

    const query = `
    select
      ${ex}
    from VISUALIZED_DATA.dbo.filterInvesting
    where len(code) = 3
    `;

    const data = await this.mssqlService.query(query);

    const dataMapped = KeyFilterResponse.mapToList(data[0]);
    await this.redis.set(RedisKeys.minMaxFilter, dataMapped, {
      ttl: TimeToLive.OneHour,
    });
    return dataMapped;
  }

  async saveFilter(user_id: number, b: SaveFilterDto) {
    try {
      const new_filter = this.filterUserRepo.create({
        ...b,
        value: JSON.stringify(b.value),
        user: { user_id },
      });
      await this.filterUserRepo.save(new_filter);
    } catch (error) {
      throw new CatchException(error);
    }
  }

  async getFilterUser(user_id: number) {
    try {
      const data = await this.filterUserRepo.find({
        where: { user: { user_id } },
        order: { created_at: 'ASC' },
      });
      const dataMapped = FilterUserResponse.mapToList(data);
      return dataMapped;
    } catch (e) {
      throw new CatchException(e);
    }
  }

  async updateFilter(filter_id: number, user_id: number, b: SaveFilterDto) {
    try {
      const filter = await this.filterUserRepo.findOne({
        where: { user: { user_id }, filter_id },
      });
      if (!filter)
        throw new ExceptionResponse(HttpStatus.BAD_REQUEST, 'Filter not found');

      await this.filterUserRepo.update(
        { filter_id },
        { ...b, value: JSON.stringify(b.value) },
      );
    } catch (e) {
      throw new CatchException(e);
    }
  }

  async deleteFilter(filter_id: number, user_id: number) {
    try {
      const filter = await this.filterUserRepo.findOne({
        where: { user: { user_id }, filter_id },
      });
      if (!filter)
        throw new ExceptionResponse(HttpStatus.BAD_REQUEST, 'Filter not found');

      await this.filterUserRepo.delete({ filter_id });
    } catch (e) {
      throw new CatchException(e);
    }
  }

  async emulatorInvestment(b: EmulatorInvestmentDto) {
    try {
      const value = b.value * 1000000;
      const from = moment(b.from, 'M/YYYY');
      const to = moment(b.to, 'M/YYYY');

      if (to.month() == moment().month())
        throw new ExceptionResponse(
          HttpStatus.BAD_REQUEST,
          'To không được là tháng hiện tại',
        );
      if (to.isBefore(from))
        throw new ExceptionResponse(
          HttpStatus.BAD_REQUEST,
          'From To không đúng',
        );

      const date = [
        ...this.getMonth(
          to.diff(from, 'month') + 1,
          moment(b.to, 'M/YYYY').add(1, 'month'),
        ),
        from.startOf('month').format('YYYY-MM-DD'),
      ];

      const query_date = b.isPeriodic
        ? (
            await this.mssqlService.query(`
      with date_ranges as (
          select
          ${date
            .map(
              (item, index) =>
                `min(case when date >= '${item}' then date else null end) as date_${
                  index + 1
                }`,
            )
            .join(',')}
          from marketTrade.dbo.historyTicker
          where date >= '${date[date.length - 1]}'
      )
      select *
      from date_ranges;
      `)
          )[0]
        : [];

      //Lấy giá cổ phiếu
      const query = !b.isPeriodic
        ? `
      select closePrice, code, date from marketTrade.dbo.historyTicker 
      where date >= '${from.startOf('month').format('YYYY-MM-DD')}' 
      and date <= '${to.endOf('month').format('YYYY-MM-DD')}'
      and code in (${b.category.map((item) => `'${item.code}'`).join(',')})
      order by date asc
      `
        : `
      select closePrice, code, date from marketTrade.dbo.historyTicker 
      where date in (${Object.values(query_date)
        .map((item) => `'${UtilCommonTemplate.toDate(item)}'`)
        .join(',')})
      and code in (${b.category.map((item) => `'${item.code}'`).join(',')})
      order by date asc
      `;

      //Lấy giá VNINDEX
      const query_2 = !b.isPeriodic
        ? `
      select closePrice, code, date from marketTrade.dbo.indexTradeVND 
      where date >= '${from.startOf('month').format('YYYY-MM-DD')}' 
      and date <= '${to.endOf('month').format('YYYY-MM-DD')}'
      and code = 'VNINDEX'
      order by date asc
      `
        : `
      select closePrice, code, date from marketTrade.dbo.indexTradeVND 
      where date in (${Object.values(query_date)
        .map((item) => `'${UtilCommonTemplate.toDate(item)}'`)
        .join(',')})
      and code = 'VNINDEX'
      order by date asc
      `;

      //Kỳ hạn 5 năm
      const query_3 = `
      select top 1 laiSuatPhatHanh as value from [marketBonds].[dbo].[BondsInfor] where code ='VCB' and kyHan =N'5 năm' order by ngayPhatHanh desc
      `;

      const promise = this.mssqlService.query(query);
      const promise_2 = this.mssqlService.query(query_2);
      const promise_3 = this.mssqlService.query(query_3);

      const [data, data_2, data_3] = (await Promise.all([
        promise,
        promise_2,
        promise_3,
      ])) as any;

      const result = {};
      const date_arr = data
        .filter((item) => item.code == b.category[0].code)
        .map((item) => item.date);

      for (const item of b.category) {
        const list_price = data
          .filter((i) => i.code == item.code)
          .map((item) => item.closePrice);

        const gttd_1_arr = [];
        const gttd_2_arr = [];
        const gttd_3_arr = [];

        const lai_lo_1_arr = [];
        const lai_lo_2_arr = [];
        const lai_lo_3_arr = [];

        const loi_nhuan_danh_muc_1 = [];
        const loi_nhuan_danh_muc_2 = [];
        const loi_nhuan_danh_muc_3 = [];

        for (let i = 0; i < list_price.length; i++) {
          let gttd_1 = 0;
          let gttd_2 = 0;
          let gttd_3 = 0;

          if (i == 0) {
            //Tính giá trị thay đổi
            gttd_1 = (value * item.category_1) / 100;
            gttd_2 = (value * item.category_2) / 100;
            gttd_3 = (value * item.category_3) / 100;
          } else {
            gttd_1 =
              ((value * item.category_1) / 100 / list_price[i - 1]) *
              list_price[i];
            gttd_2 =
              ((value * item.category_2) / 100 / list_price[i - 1]) *
              list_price[i];
            gttd_3 =
              ((value * item.category_3) / 100 / list_price[i - 1]) *
              list_price[i];
          }

          gttd_1_arr.push(gttd_1);
          gttd_2_arr.push(gttd_2);
          gttd_3_arr.push(gttd_3);

          //Tính lãi lỗ
          const lai_lo_1 = gttd_1 - gttd_1_arr[0];
          const lai_lo_2 = gttd_2 - gttd_2_arr[0];
          const lai_lo_3 = gttd_3 - gttd_3_arr[0];

          //Tính lợi nhuận
          const loi_nhuan_1 = (lai_lo_1 / gttd_1_arr[0]) * 100;
          const loi_nhuan_2 = (lai_lo_2 / gttd_2_arr[0]) * 100;
          const loi_nhuan_3 = (lai_lo_3 / gttd_3_arr[0]) * 100;

          loi_nhuan_danh_muc_1.push(loi_nhuan_1);
          loi_nhuan_danh_muc_2.push(loi_nhuan_2);
          loi_nhuan_danh_muc_3.push(loi_nhuan_3);

          lai_lo_1_arr.push(lai_lo_1);
          lai_lo_2_arr.push(lai_lo_2);
          lai_lo_3_arr.push(lai_lo_3);
        }

        const so_tien_thu_duoc_1 =
          ((value * item.category_1) / 100 / list_price[0]) *
          list_price[list_price.length - 1];
        const so_tien_thu_duoc_2 =
          ((value * item.category_2) / 100 / list_price[0]) *
          list_price[list_price.length - 1];
        const so_tien_thu_duoc_3 =
          ((value * item.category_3) / 100 / list_price[0]) *
          list_price[list_price.length - 1];

        result[item.code] = {
          so_tien_thu_duoc_1,
          so_tien_thu_duoc_2,
          so_tien_thu_duoc_3,
          loi_nhuan_danh_muc_1,
          loi_nhuan_danh_muc_2,
          loi_nhuan_danh_muc_3,
          gttd_1_arr,
          gttd_2_arr,
          gttd_3_arr,
          lai_lo_1_arr,
          lai_lo_2_arr,
          lai_lo_3_arr,
        };
      }

      let loi_nhuan_theo_co_phieu_1 = [];
      let loi_nhuan_theo_co_phieu_2 = [];
      let loi_nhuan_theo_co_phieu_3 = [];

      let so_tien_thu_duoc_1 = 0;
      let so_tien_thu_duoc_2 = 0;
      let so_tien_thu_duoc_3 = 0;

      let loi_nhuan_1_arr = [];
      let loi_nhuan_2_arr = [];
      let loi_nhuan_3_arr = [];

      let gttd_1_arr = [];
      let gttd_2_arr = [];
      let gttd_3_arr = [];

      let lai_lo_1_arr = [];
      let lai_lo_2_arr = [];
      let lai_lo_3_arr = [];

      for (const item of Object.keys(result)) {
        so_tien_thu_duoc_1 += result[item].so_tien_thu_duoc_1;
        so_tien_thu_duoc_2 += result[item].so_tien_thu_duoc_2;
        so_tien_thu_duoc_3 += result[item].so_tien_thu_duoc_3;

        loi_nhuan_1_arr = this.addArrays(
          loi_nhuan_1_arr,
          result[item].loi_nhuan_danh_muc_1,
        );
        loi_nhuan_2_arr = this.addArrays(
          loi_nhuan_2_arr,
          result[item].loi_nhuan_danh_muc_2,
        );
        loi_nhuan_3_arr = this.addArrays(
          loi_nhuan_3_arr,
          result[item].loi_nhuan_danh_muc_3,
        );

        gttd_1_arr = this.addArrays(gttd_1_arr, result[item].gttd_1_arr);
        gttd_2_arr = this.addArrays(gttd_2_arr, result[item].gttd_2_arr);
        gttd_3_arr = this.addArrays(gttd_3_arr, result[item].gttd_3_arr);

        lai_lo_1_arr = this.addArrays(lai_lo_1_arr, result[item].lai_lo_1_arr);
        lai_lo_2_arr = this.addArrays(lai_lo_2_arr, result[item].lai_lo_2_arr);
        lai_lo_3_arr = this.addArrays(lai_lo_3_arr, result[item].lai_lo_3_arr);

        loi_nhuan_theo_co_phieu_1.push(
          ...result[item].loi_nhuan_danh_muc_1.map((i, index) => ({
            code: item,
            value: i,
            date: date_arr[index],
          })),
        );
        loi_nhuan_theo_co_phieu_2.push(
          ...result[item].loi_nhuan_danh_muc_2.map((i, index) => ({
            code: item,
            value: i,
            date: date_arr[index],
          })),
        );
        loi_nhuan_theo_co_phieu_3.push(
          ...result[item].loi_nhuan_danh_muc_3.map((i, index) => ({
            code: item,
            value: i,
            date: date_arr[index],
          })),
        );
      }

      const loi_nhuan_danh_muc_1 = ((so_tien_thu_duoc_1 - value) / value) * 100;
      const loi_nhuan_danh_muc_2 = ((so_tien_thu_duoc_2 - value) / value) * 100;
      const loi_nhuan_danh_muc_3 = ((so_tien_thu_duoc_3 - value) / value) * 100;

      const loi_nhuan_cao_nhat_1 = Math.max(
        ...loi_nhuan_1_arr.filter((item) => item > 0),
      );
      const loi_nhuan_cao_nhat_2 = Math.max(
        ...loi_nhuan_2_arr.filter((item) => item > 0),
      );
      const loi_nhuan_cao_nhat_3 = Math.max(
        ...loi_nhuan_3_arr.filter((item) => item > 0),
      );

      const loi_nhuan_thap_nhat_1 = Math.min(
        ...loi_nhuan_1_arr.filter((item) => item > 0),
      );
      const loi_nhuan_thap_nhat_2 = Math.min(
        ...loi_nhuan_2_arr.filter((item) => item > 0),
      );
      const loi_nhuan_thap_nhat_3 = Math.min(
        ...loi_nhuan_3_arr.filter((item) => item > 0),
      );

      const loi_nhuan_am_thap_nhat_1 = Math.min(
        ...loi_nhuan_1_arr.filter((item) => item < 0),
      );
      const loi_nhuan_am_thap_nhat_2 = Math.min(
        ...loi_nhuan_2_arr.filter((item) => item < 0),
      );
      const loi_nhuan_am_thap_nhat_3 = Math.min(
        ...loi_nhuan_3_arr.filter((item) => item < 0),
      );

      const tg_loi_nhuan_cao_nhat_1 =
        date_arr[
          loi_nhuan_1_arr.findIndex((item) => item == loi_nhuan_cao_nhat_1)
        ];
      const tg_loi_nhuan_cao_nhat_2 =
        date_arr[
          loi_nhuan_2_arr.findIndex((item) => item == loi_nhuan_cao_nhat_2)
        ];
      const tg_loi_nhuan_cao_nhat_3 =
        date_arr[
          loi_nhuan_3_arr.findIndex((item) => item == loi_nhuan_cao_nhat_3)
        ];

      const tg_loi_nhuan_thap_nhat_1 =
        date_arr[
          loi_nhuan_1_arr.findIndex((item) => item == loi_nhuan_thap_nhat_1)
        ];
      const tg_loi_nhuan_thap_nhat_2 =
        date_arr[
          loi_nhuan_2_arr.findIndex((item) => item == loi_nhuan_thap_nhat_2)
        ];
      const tg_loi_nhuan_thap_nhat_3 =
        date_arr[
          loi_nhuan_3_arr.findIndex((item) => item == loi_nhuan_thap_nhat_3)
        ];

      const tg_loi_nhuan_am_thap_nhat_1 =
        date_arr[
          loi_nhuan_1_arr.findIndex((item) => item == loi_nhuan_am_thap_nhat_1)
        ];
      const tg_loi_nhuan_am_thap_nhat_2 =
        date_arr[
          loi_nhuan_2_arr.findIndex((item) => item == loi_nhuan_am_thap_nhat_2)
        ];
      const tg_loi_nhuan_am_thap_nhat_3 =
        date_arr[
          loi_nhuan_3_arr.findIndex((item) => item == loi_nhuan_am_thap_nhat_3)
        ];

      const loi_nhuan_trung_binh_1 =
        loi_nhuan_1_arr.reduce((acc, curr) => acc + curr, 0) /
        loi_nhuan_1_arr.length;
      const loi_nhuan_trung_binh_2 =
        loi_nhuan_2_arr.reduce((acc, curr) => acc + curr, 0) /
        loi_nhuan_2_arr.length;
      const loi_nhuan_trung_binh_3 =
        loi_nhuan_3_arr.reduce((acc, curr) => acc + curr, 0) /
        loi_nhuan_3_arr.length;

      const gia_tri_danh_muc_cao_nhat_1 = Math.max(...gttd_1_arr);
      const gia_tri_danh_muc_cao_nhat_2 = Math.max(...gttd_2_arr);
      const gia_tri_danh_muc_cao_nhat_3 = Math.max(...gttd_3_arr);

      const gia_tri_danh_muc_thap_nhat_1 = Math.min(...gttd_1_arr);
      const gia_tri_danh_muc_thap_nhat_2 = Math.min(...gttd_2_arr);
      const gia_tri_danh_muc_thap_nhat_3 = Math.min(...gttd_3_arr);

      const rf = data_3[0].value;
      const sharpe_1 = this.sharpeCalculate(
        rf,
        loi_nhuan_danh_muc_1,
        (gia_tri_danh_muc_cao_nhat_1 + gia_tri_danh_muc_thap_nhat_1) / 2,
        gia_tri_danh_muc_cao_nhat_1,
      );
      const sharpe_2 = this.sharpeCalculate(
        rf,
        loi_nhuan_danh_muc_2,
        (gia_tri_danh_muc_cao_nhat_2 + gia_tri_danh_muc_thap_nhat_2) / 2,
        gia_tri_danh_muc_cao_nhat_2,
      );
      const sharpe_3 = this.sharpeCalculate(
        rf,
        loi_nhuan_danh_muc_3,
        (gia_tri_danh_muc_cao_nhat_3 + gia_tri_danh_muc_thap_nhat_3) / 2,
        gia_tri_danh_muc_cao_nhat_3,
      );

      const roc_1 = loi_nhuan_1_arr;
      const roc_2 = loi_nhuan_2_arr;
      const roc_3 = loi_nhuan_3_arr;

      const roc_tt = data_2.map((item, index) =>
        index == 0
          ? 0
          : ((item.closePrice - data_2[0].closePrice) / data_2[0].closePrice) *
            100,
      );

      const beta_1 = this.betaCalculate(roc_1, roc_tt);
      const beta_2 = this.betaCalculate(roc_2, roc_tt);
      const beta_3 = this.betaCalculate(roc_3, roc_tt);

      const alpha_1 = this.alphaCalculate(
        loi_nhuan_danh_muc_1,
        rf,
        roc_tt[roc_tt.length - 1],
        beta_1,
      );
      const alpha_2 = this.alphaCalculate(
        loi_nhuan_danh_muc_2,
        rf,
        roc_tt[roc_tt.length - 1],
        beta_2,
      );
      const alpha_3 = this.alphaCalculate(
        loi_nhuan_danh_muc_3,
        rf,
        roc_tt[roc_tt.length - 1],
        beta_3,
      );

      //Hiệu quả đầu tư theo danh mục
      const percent_loi_nhuan_danh_muc = loi_nhuan_1_arr
        .map((item_1, index) => ({
          name: 'Danh mục 1',
          value: item_1,
          date: date_arr[index],
        }))
        .concat(
          loi_nhuan_2_arr.map((item_2, index) => ({
            name: 'Danh mục 2',
            value: item_2,
            date: date_arr[index],
          })),
        )
        .concat(
          loi_nhuan_3_arr.map((item_3, index) => ({
            name: 'Danh mục 3',
            value: item_3,
            date: date_arr[index],
          })),
        );
      const percent_loi_nhuan = [
        ...roc_tt.map((item, index) => ({
          name: 'VNINDEX',
          value: item,
          date: date_arr[index],
        })),
      ]
        .concat(percent_loi_nhuan_danh_muc)
        .sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
        .map((item) => ({
          ...item,
          date: UtilCommonTemplate.toDate(item.date),
        }));

      //Hiệu quả đầu tư theo cổ phiếu
      const hieu_qua_dau_tu_co_phieu = {
        danh_muc_1: loi_nhuan_theo_co_phieu_1
          .sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
          .map((item) => ({
            ...item,
            date: UtilCommonTemplate.toDate(item.date),
          })),
        danh_muc_2: loi_nhuan_theo_co_phieu_2
          .sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
          .map((item) => ({
            ...item,
            date: UtilCommonTemplate.toDate(item.date),
          })),
        danh_muc_3: loi_nhuan_theo_co_phieu_3
          .sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
          .map((item) => ({
            ...item,
            date: UtilCommonTemplate.toDate(item.date),
          })),
      };

      //Biểu đồ lãi lỗ theo danh mục
      const bieu_do_lai_lo_danh_muc = lai_lo_1_arr
        .map((item, index) => ({
          name: 'Danh mục 1',
          value: item,
          date: UtilCommonTemplate.toDate(date_arr[index]),
        }))
        .concat(
          lai_lo_2_arr.map((item, index) => ({
            name: 'Danh mục 2',
            value: item,
            date: UtilCommonTemplate.toDate(date_arr[index]),
          })),
        )
        .concat(
          lai_lo_3_arr.map((item, index) => ({
            name: 'Danh mục 3',
            value: item,
            date: UtilCommonTemplate.toDate(date_arr[index]),
          })),
        );
      const bieu_do_lai_lo_vn_index = data_2.map((item) => ({
        name: item.code,
        value: item.closePrice - data_2[0].closePrice,
        date: UtilCommonTemplate.toDate(item.date),
      }));
      const bieu_do_lai_lo = bieu_do_lai_lo_danh_muc
        .concat(bieu_do_lai_lo_vn_index)
        .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
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
        bieu_do_lai_lo,
      });
      return dataMapped;
    } catch (e) {
      throw new CatchException(e);
    }
  }

  async search(stock: string) {
    const query = `
      with temp as (select code, companyName as company_name, floor, status from marketInfor.dbo.info
      where code like N'%${UtilCommonTemplate.normalizedString(
        stock,
      )}%' and type = 'STOCK')
      select * from temp where status = 'listed'
    `;
    const data = await this.mssqlService.query<InvestmentSearchResponse[]>(
      query,
    );
    const dataMapped = InvestmentSearchResponse.mapToList(data);
    return dataMapped;
  }

  private sharpeCalculate(
    rf: number,
    rp: number,
    TBGT_DM: number,
    gtcn: number,
  ) {
    return (rp - rf) / ((gtcn - TBGT_DM) / TBGT_DM);
  }

  private betaCalculate(roc_danh_muc: number[], roc_tt: number[]) {
    return (
      this.calculateCovariance(roc_danh_muc, roc_tt) /
      this.calculateVariance(roc_tt)
    );
  }

  private alphaCalculate(rp: number, rf: number, rm: number, beta: number) {
    return rp - (rf + (rm - rf) * beta);
  }

  private calculateVariance(data: number[]) {
    if (data.length < 2) {
      throw new Error('Tập dữ liệu phải có ít nhất 2 giá trị.');
    }

    const N = data.length;
    const mean = data.reduce((sum, value) => sum + value, 0) / N;

    let variance = 0;

    for (let i = 0; i < N; i++) {
      variance += (data[i] - mean) ** 2;
    }

    variance /= N - 1; // Chia cho (N-1) để tính variance mẫu

    return variance;
  }

  private calculateCovariance(X: number[], Y: number[]) {
    if (X.length !== Y.length || X.length < 2) {
      throw new Error('X và Y phải có cùng độ dài và ít nhất 2 giá trị.');
    }

    const N = X.length;
    const meanX = X.reduce((sum, value) => sum + value, 0) / N;
    const meanY = Y.reduce((sum, value) => sum + value, 0) / N;

    let covariance = 0;

    for (let i = 0; i < N; i++) {
      covariance += (X[i] - meanX) * (Y[i] - meanY);
    }

    covariance /= N - 1; // Chia cho (N-1) để tính covariance mẫu

    return covariance;
  }

  private addArrays(...arrays) {
    const maxLength = Math.max(...arrays.map((arr) => arr.length));
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
      return results;
    }
    let previousEndDate: moment.Moment | Date | string;
    previousEndDate = moment(date).subtract(1, 'month').endOf('month');
    results.push(previousEndDate.format('YYYY-MM-DD'));

    return this.getMonth(count - 1, previousEndDate, results);
  }

  /**
   * Chỉ báo MA
   */
  async tradingStrategiesMa(stock: string | any[], from: string, to: string, haveMa?: 0 | 1, realtimePrice?: number, role?: number) {
    try {
      // Format stock list consistently
      const listStock = Array.isArray(stock) ? `in (${stock.map(item => `'${item.code}'`).join(',')})` : `= '${stock}'`;

      // Prepare cache keys
      const priceKey = `price:${listStock}`;
      const fromKey = `price:${from}`;
      const toKey = `price:${to}`;

      // Get cached data in parallel
      const [dataRedis, dateRedis, dateToRedis] = await Promise.all([
        this.redis.get(priceKey),
        this.redis.get(fromKey),
        this.redis.get(toKey),
      ]);

      // Prepare queries
      const queries = {
        data: !dataRedis && `SELECT closePrice, date, code FROM marketTrade.dbo.historyTicker WHERE code ${listStock} ORDER BY date ASC`,
        lastPrice: !realtimePrice && `
          WITH LatestTrade AS (
            SELECT closePrice, date, code, ROW_NUMBER() OVER (PARTITION BY code ORDER BY date DESC, time DESC) AS rn
            FROM tradeIntraday.dbo.tickerTradeVNDIntraday
            WHERE code ${listStock}
          )
          SELECT closePrice, date, code FROM LatestTrade WHERE rn = 1 ORDER BY code
        `,
        date: !dateRedis && `SELECT TOP 1 date FROM marketTrade.dbo.historyTicker WHERE date >= '${moment(from).format('YYYY-MM-DD')}' ORDER BY date ASC`,
        dateTo: !dateToRedis && `SELECT TOP 1 date FROM marketTrade.dbo.historyTicker WHERE date <= '${moment(to).format('YYYY-MM-DD')}' ORDER BY date DESC`
      };

      // Execute necessary queries in parallel
      const [data, lastPrice, date, dateTo] = await Promise.all([
        queries.data ? this.mssqlService.query(queries.data) : [],
        queries.lastPrice ? this.mssqlService.query(queries.lastPrice) : realtimePrice,
        queries.date ? this.mssqlService.query(queries.date) : [],
        queries.dateTo ? this.mssqlService.query(queries.dateTo) : []
      ]);

      // Cache valid results
      const cachePromises = [];
      if (realtimePrice && !dataRedis && UtilCommonTemplate.hasValidData(data)) {
        cachePromises.push(this.redis.set(priceKey, data, { ttl: 180 }));
      }
      if (!dateRedis && UtilCommonTemplate.hasValidData(date)) {
        cachePromises.push(this.redis.set(fromKey, date, { ttl: 180 }));
      }
      if (!dateToRedis && UtilCommonTemplate.hasValidData(dateTo)) {
        cachePromises.push(this.redis.set(toKey, dateTo, { ttl: 180 }));
      }
      if (cachePromises.length > 0) {
        await Promise.all(cachePromises);
      }

      // Use cached data if available
      const finalData = (dataRedis || data) as Array<{ code: string; closePrice: number; date: string }>;
      const finalDate = dateRedis || date;
      const finalDateTo = dateToRedis || dateTo;
      const lastPriceData = lastPrice as Array<{ code: string; closePrice: number }> | number;

      // Process array of stocks
      if (Array.isArray(stock)) {
        return stock.map((item: any) => {
          const stockData = finalData?.filter(res => res.code === item.code);
          if (!stockData?.length) return null;

          // Update latest price
          const latestPrice = !realtimePrice && typeof lastPriceData !== 'number' ? lastPriceData.find(price => price.code === item.code)?.closePrice : realtimePrice;
          if (latestPrice) {
            stockData[stockData.length - 1].closePrice = latestPrice;
          }

          // Calculate indicators
          const result = !haveMa ? this.calculateMAIndex([...stockData], finalDate, finalDateTo) : this.calculateMAIndex([...stockData], finalDate, finalDateTo, item.ma);

          return {
            code: item.code,
            name: result.max.name,
            total: result.max.total,
            closePrice: result.data[result.data.length - 1].closePrice,
            signal: result.max.signal,
            ma: result.max.ma,
            closePricePrev: result.data[result.data.length - 1].closePricePrev
          };
        }).filter(Boolean);
      }
      
      // Process single stock
      return this.calculateMAIndex(finalData, finalDate, finalDateTo, undefined, role);
    } catch (error) {
      throw new CatchException(error);
    }
  }

  private calculateMAIndex(data: any, date: any, dateTo: any, maNumber?: number, role?: number) {
    const price = data.map((item) => item.closePrice);
    const dateFormat = data.map((item) => ({ ...item, date: UtilCommonTemplate.toDateV2(item.date) }));
    const indexDateFrom = dateFormat.findIndex((item) => item.date == UtilCommonTemplate.toDateV2(date[0].date));
    const indexDateTo = dateFormat.findIndex((item) => item.date == UtilCommonTemplate.toDateV2(dateTo[0].date));

    const arr = [];
    let ma = !role ? [5, 10, 20, 50, 60, 100] : Array.from({ length: 96 }, (_, i) => i + 5);
    if (maNumber) {
      ma = [maNumber];
    }
    
    ma.forEach((value) => {
      const ma = calTech.sma({ values: price, period: value });
      const maReverse = [...ma].reverse();
      const newData = [...dateFormat].reverse().map((item, index) => ({ ...item, ma: maReverse[index] || 0 }));

      let isBuy = false;
      let indexBuy = 0;
      let count = 0;
      let total = 1;
      let min = 0, max = 0;
      const detail = [];
      let lastSignal = 0; // 0 - Mua, 1 - Bán, 2 - Hold mua, 3 - Hold bán

      const dataWithMa = [...newData].reverse().slice(indexDateFrom, indexDateTo + 1);

      dataWithMa.map((item, index) => {
        if (dataWithMa[index - 1]?.closePrice && item.closePrice > item.ma && dataWithMa[index - 1].closePrice <= dataWithMa[index - 1].ma && !isBuy) {
          isBuy = true;
          indexBuy = index;
          count += 1;
        }

        if (index == dataWithMa.length - 1) {
          lastSignal = 
            dataWithMa[index - 1]?.closePrice && item.closePrice > item.ma && dataWithMa[index - 1].closePrice < dataWithMa[index - 1].ma 
                ? 0 
                : dataWithMa[index - 1]?.closePrice && item.closePrice < item.ma && dataWithMa[index - 1].closePrice > dataWithMa[index - 1].ma 
                ? 1 
                : isBuy 
                ? 2 
                : 3;
        }
      
        if ((dataWithMa[index - 1]?.closePrice && item.closePrice < item.ma && dataWithMa[index - 1].closePrice > dataWithMa[index - 1].ma && isBuy) || (index == dataWithMa.length - 1 && isBuy)) {
          isBuy = false;
          const percent = ((item.closePrice - dataWithMa[indexBuy].closePrice) / dataWithMa[indexBuy].closePrice) * 100;

          total = total * (1 + percent / 100);
          min = Math.min(min, percent / 100);
          max = Math.max(max, percent / 100);

          detail.push({
            date_buy: dataWithMa[indexBuy].date,
            date_sell: item.date,
            price_buy: dataWithMa[indexBuy].closePrice,
            price_sell: item.closePrice,
            profit: percent,
          });
        }
      });

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
        closePricePrev: price[price.length - 2],
      });
    });

    const max = arr.reduce((acc, curr) => !acc?.total ? arr[0] : curr.total > acc.total ? curr : acc, arr[0]);

    return { max: max, data: arr };
  }

  /**
   * Chỉ báo SAR
   */
  async tradingStrategiesSar(stock: string | any[], from: string, to: string) {
    try {
      const listStock = Array.isArray(stock) ? `in (${stock.map(item => `'${item.code}'`).join(',')})` : `= '${stock}'`;

      const priceKey = `price:${listStock}`;
      const fromKey = `price:${from}`;
      const toKey = `price:${to}`;

      const [dataRedis, dateRedis, dateToRedis] = await Promise.all([
        this.redis.get(priceKey),
        this.redis.get(fromKey),
        this.redis.get(toKey),
      ]);
      
      const queries = {
        data: !dataRedis && `SELECT closePrice, highPrice, lowPrice, date, code FROM marketTrade.dbo.historyTicker WHERE code ${listStock} ORDER BY date ASC`,
        lastPrice: `
          WITH LatestTrade AS (
            SELECT closePrice, date, code, ROW_NUMBER() OVER (PARTITION BY code ORDER BY date DESC, time DESC) AS rn
            FROM tradeIntraday.dbo.tickerTradeVNDIntraday
            WHERE code ${listStock}
          )
          SELECT closePrice, date, code FROM LatestTrade WHERE rn = 1 ORDER BY code
        `,
        date: !dateRedis && `SELECT TOP 1 date FROM marketTrade.dbo.historyTicker WHERE date >= '${moment(from).format('YYYY-MM-DD')}' ORDER BY date ASC`,
        dateTo: !dateToRedis && `SELECT TOP 1 date FROM marketTrade.dbo.historyTicker WHERE date <= '${moment(to).format('YYYY-MM-DD')}' ORDER BY date DESC`
      };

      // Execute necessary queries in parallel
      const [data, lastPrice, date, dateTo] = await Promise.all([
        queries.data ? this.mssqlService.query(queries.data) : [],
        this.mssqlService.query(queries.lastPrice),
        queries.date ? this.mssqlService.query(queries.date) : [],
        queries.dateTo ? this.mssqlService.query(queries.dateTo) : []
      ]);

      // Cache valid results
      const cachePromises = [];
      if (!dataRedis && UtilCommonTemplate.hasValidData(data)) {
        cachePromises.push(this.redis.set(priceKey, data, { ttl: 180 }));
      }
      if (!dateRedis && UtilCommonTemplate.hasValidData(date)) {
        cachePromises.push(this.redis.set(fromKey, date, { ttl: 180 }));
      }
      if (!dateToRedis && UtilCommonTemplate.hasValidData(dateTo)) {
        cachePromises.push(this.redis.set(toKey, dateTo, { ttl: 180 }));
      }
      if (cachePromises.length > 0) {
        await Promise.all(cachePromises);
      }

      // Use cached data if available
      const finalData = (dataRedis || data) as Array<{ code: string; closePrice: number; highPrice: number; lowPrice: number; date: string }>;
      const finalDate = dateRedis || date;
      const finalDateTo = dateToRedis || dateTo;
      const lastPriceData = lastPrice as Array<{ code: string; closePrice: number }>;

      // Process array of stocks
      if (Array.isArray(stock)) {
        return stock.map((item: any) => {
          const stockData = finalData?.filter(res => res.code === item.code);
          if (!stockData?.length) return null;

          // Update latest price
          const latestPrice = lastPriceData.find(price => price.code === item.code)?.closePrice;
          if (latestPrice) {
            stockData[stockData.length - 1].closePrice = latestPrice;
          }

          // Calculate indicators
          const result = this.calculatePSARIndex([...stockData], finalDate, finalDateTo);

          return {
            code: item.code,
            name: result.max.name,
            total: result.max.total,
            closePrice: result.data[0].closePrice,
            signal: result.max.signal,
            ma: result.max.psar,
            closePricePrev: result.data[0].closePricePrev
          };
        }).filter(Boolean);
      }

      // Process single stock
      return this.calculatePSARIndex(finalData, finalDate, finalDateTo);
    } catch (error) {
      throw new CatchException(error);
    }
  }

  private calculatePSARIndex(data: any, date: any, dateTo: any) {
    const price = data.map((item) => item.closePrice);
    const highPrice = data.map((item) => item.highPrice);
    const lowPrice = data.map((item) => item.lowPrice);
    const dateFormat = data.map((item) => ({ ...item, date: UtilCommonTemplate.toDateV2(item.date) }));
    const indexDateFrom = dateFormat.findIndex((item) => item.date == UtilCommonTemplate.toDateV2(date[0].date));
    const indexDateTo = dateFormat.findIndex((item) => item.date == UtilCommonTemplate.toDateV2(dateTo[0].date));

    const psar = calTech.psar({ high: highPrice, low: lowPrice, max: 0.2, step: 0.02 });
    const newData = dateFormat.map((item, index) => ({ ...item, psar: psar[index] || 0 }));

    let isBuy = false;
    let indexBuy = 0;
    let count = 0;
    let total = 1;
    let min = 0, max = 0;
    const detail = [];
    let lastSignal = 0; // 0 - Mua, 1 - Bán, 2 - Hold mua, 3 - Hold bán

    const dataWithPSAR = newData.slice(indexDateFrom, indexDateTo + 1);
    
    dataWithPSAR.map((item, index) => {
      if (item.closePrice > item.psar && !isBuy) {
        isBuy = true;
        indexBuy = index;
        count += 1;
      }

      if (index == dataWithPSAR.length - 1) {
        lastSignal = item.closePrice > item.psar ? 0 : item.closePrice < item.psar ? 1 : isBuy ? 2 : 3;
      }
    
      if ((item.closePrice < item.psar && isBuy) || (index == dataWithPSAR.length - 1 && isBuy)) {
        isBuy = false;
        const percent = ((item.closePrice - dataWithPSAR[indexBuy].closePrice) / dataWithPSAR[indexBuy].closePrice) * 100;

        total = total * (1 + percent / 100);
        min = Math.min(min, percent / 100);
        max = Math.max(max, percent / 100);

        detail.push({
          date_buy: dataWithPSAR[indexBuy].date,
          date_sell: item.date,
          price_buy: dataWithPSAR[indexBuy].closePrice,
          price_sell: item.closePrice,
          profit: percent,
        });
      }
    });

    const result = {
      name: 'SAR',
      total: total - 1,
      count: count,
      min,
      max,
      detail,
      closePrice: price[price.length - 1],
      signal: lastSignal,
      psar: psar[psar.length - 1],
      closePricePrev: price[price.length - 2],
    };

    return { max: result, data: [result] };
  }

  /**
   * Chỉ báo MACD
   */
  async tradingStrategiesMacdSignal(stock: string | any[], from: string, to: string, indicator: string) {
    try {
      const listStock = Array.isArray(stock) ? `in (${stock.map(item => `'${item.code}'`).join(',')})` : `= '${stock}'`;

      const priceKey = `price:${listStock}`;
      const fromKey = `price:${from}`;
      const toKey = `price:${to}`;

      const [dataRedis, dateRedis, dateToRedis] = await Promise.all([
        this.redis.get(priceKey),
        this.redis.get(fromKey),
        this.redis.get(toKey),
      ]);
      
      const queries = {
        data: !dataRedis && `SELECT closePrice, highPrice, lowPrice, date, code FROM marketTrade.dbo.historyTicker WHERE code ${listStock} ORDER BY date ASC`,
        lastPrice: `
          WITH LatestTrade AS (
            SELECT closePrice, date, code, ROW_NUMBER() OVER (PARTITION BY code ORDER BY date DESC, time DESC) AS rn
            FROM tradeIntraday.dbo.tickerTradeVNDIntraday
            WHERE code ${listStock}
          )
          SELECT closePrice, date, code FROM LatestTrade WHERE rn = 1 ORDER BY code
        `,
        date: !dateRedis && `SELECT TOP 1 date FROM marketTrade.dbo.historyTicker WHERE date >= '${moment(from).format('YYYY-MM-DD')}' ORDER BY date ASC`,
        dateTo: !dateToRedis && `SELECT TOP 1 date FROM marketTrade.dbo.historyTicker WHERE date <= '${moment(to).format('YYYY-MM-DD')}' ORDER BY date DESC`
      };

      // Execute necessary queries in parallel
      const [data, lastPrice, date, dateTo] = await Promise.all([
        queries.data ? this.mssqlService.query(queries.data) : [],
        this.mssqlService.query(queries.lastPrice),
        queries.date ? this.mssqlService.query(queries.date) : [],
        queries.dateTo ? this.mssqlService.query(queries.dateTo) : []
      ]);

      // Cache valid results
      const cachePromises = [];
      if (!dataRedis && UtilCommonTemplate.hasValidData(data)) {
        cachePromises.push(this.redis.set(priceKey, data, { ttl: 180 }));
      }
      if (!dateRedis && UtilCommonTemplate.hasValidData(date)) {
        cachePromises.push(this.redis.set(fromKey, date, { ttl: 180 }));
      }
      if (!dateToRedis && UtilCommonTemplate.hasValidData(dateTo)) {
        cachePromises.push(this.redis.set(toKey, dateTo, { ttl: 180 }));
      }
      if (cachePromises.length > 0) {
        await Promise.all(cachePromises);
      }

      // Use cached data if available
      const finalData = (dataRedis || data) as Array<{ code: string; closePrice: number; highPrice: number; lowPrice: number; date: string }>;
      const finalDate = dateRedis || date;
      const finalDateTo = dateToRedis || dateTo;
      const lastPriceData = lastPrice as Array<{ code: string; closePrice: number }>;

      // Process array of stocks
      if (Array.isArray(stock)) {
        return stock.map((item: any) => {
          const stockData = finalData?.filter(res => res.code === item.code);
          if (!stockData?.length) return null;

          // Update latest price
          const latestPrice = lastPriceData.find(price => price.code === item.code)?.closePrice;
          if (latestPrice) {
            stockData[stockData.length - 1].closePrice = latestPrice;
          }

          // Calculate indicators
          const result = this.calculateMACDIndex([...stockData], finalDate, finalDateTo, indicator);

          return {
            code: item.code,
            name: result.max.name,
            total: result.max.total,
            closePrice: result.data[result.data.length - 1].closePrice,
            signal: result.max.signal,
            ma: result.max.macd,
            closePricePrev: result.data[result.data.length - 1].closePricePrev
          };
        }).filter(Boolean);
      }
      
      // Process single stock
      return this.calculateMACDIndex(finalData, finalDate, finalDateTo, indicator);
    } catch (error) {
      throw new CatchException(error);
    }
  }

  private calculateMACDIndex(data: any, date: any, dateTo: any, indicator: string) {
    const dataReverse = [...data].reverse();

    const price = dataReverse.map((item) => item.closePrice);
    const dateFormat = dataReverse.map((item) => ({ ...item, date: UtilCommonTemplate.toDateV2(item.date) }));
    const indexDateFrom = dateFormat.findIndex((item) => item.date == UtilCommonTemplate.toDateV2(date[0].date));
    const indexDateTo = dateFormat.findIndex((item) => item.date == UtilCommonTemplate.toDateV2(dateTo[0].date));
    
    const macdResults = calTech.macd({ values: [...price].reverse(), fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, SimpleMAOscillator: false, SimpleMASignal: false }).reverse();
    const macd = macdResults.map(value => value.MACD);
    const macdSignal = macdResults.map(value => value.signal);
    const macdHistogram = macdResults.map(value => value.histogram);

    const dataWithMACD = dateFormat.map((item, index) => ({ 
      ...item, 
      macd: macd[index] || 0, 
      signal: macdSignal[index] || 0, 
      histogram: macdHistogram[index] || 0 
    })).slice(indexDateTo +  1, indexDateFrom).reverse();

    let isBuy = false;
    let indexBuy = 0;
    let count = 0;
    let total = 1;
    let min = 0, max = 0;
    const detail = [];
    let lastSignal = 0;

    const processSignal = (item: any, index: number, prevItem?: any) => {
      const shouldBuy = this.determineBuySignal(item, prevItem, indicator);
      const shouldSell = this.determineSellSignal(item, prevItem, isBuy, index, dataWithMACD.length - 1, indicator);

      if (shouldBuy && !isBuy) {
        isBuy = true;
        indexBuy = index;
        count += 1;
      }

      if(index === dataWithMACD.length - 1) {
        lastSignal = this.determineLastSignal(item, dataWithMACD[index - 1], isBuy, indicator);
      }

      if(shouldSell && isBuy) {
        isBuy = false;
        const percent = ((item.closePrice - dataWithMACD[indexBuy].closePrice) / dataWithMACD[indexBuy].closePrice) * 100;

        total = total * (1 + percent / 100);
        min = Math.min(min, percent / 100);
        max = Math.max(max, percent / 100);

        detail.push({
          date_buy: dataWithMACD[indexBuy].date,
          date_sell: item.date,
          price_buy: dataWithMACD[indexBuy].closePrice,
          price_sell: item.closePrice,
          profit: percent,
        })
      }
    }
    
    dataWithMACD.forEach((item, index) => {
      processSignal(item, index, dataWithMACD[index - 1]);
    });
    
    const name = indicator == 'macdSignal' ? 'MACD_Signal' : indicator == 'macdHistogram' ? 'MACD_Histogram' : 'MACD'
    const result = {
      name,
      total: total - 1,
      count: count,
      min,
      max,
      detail,
      closePrice: price[price.length - 1],
      signal: lastSignal,
      macd: macdResults[macdResults.length - 1],
      closePricePrev: price[price.length - 2],
    };

    return { max: result, data: [result] };
  }

  private determineLastSignal(item: any, prevItem: any, isBuy: boolean, indicator: string): number {
    if (!prevItem) return 3; // Default to hold sell if no previous data

    switch (indicator) {
      case 'macdSignal':
        if (item.macd > item.signal) return 0; // Buy signal
        if (item.macd < item.signal) return 1; // Sell signal
        return isBuy ? 2 : 3; // Hold buy or hold sell
      case 'macdHistogram':
        if (item.macd < item.signal && item.histogram > prevItem.histogram) return 0; // Buy signal
        if (item.macd > item.signal && item.histogram < prevItem.histogram) return 1; // Sell signal
        return isBuy ? 2 : 3; // Hold buy or hold sell
      default:
        return 3; // Default to hold sell for unknown indicators
    }
  }

  private determineBuySignal(item: any, prevItem: any, indicator: string): boolean {
    if (!prevItem) return false;

    switch (indicator) {
      case 'macdSignal':
        return prevItem.macd < prevItem.signal && item.macd > item.signal;
      case 'macdHistogram':
        return item.macd < item.signal && item.histogram > prevItem.histogram;
      default:
        return false;
    }
  }

  private determineSellSignal(item: any, prevItem: any, isBuy: boolean, index: number, lastIndex: number, indicator: string): boolean {
    if (!isBuy) return false;
    if (index === lastIndex) return true;

    switch (indicator) {
      case 'macdSignal':
        return prevItem.macd > prevItem.signal && item.macd < item.signal;
      case 'macdHistogram':
        return item.macd > item.signal && item.histogram < prevItem.histogram;
      default:
        return false;
    }
  }

  /**
   * Chỉ báo MA ngắn cắt MA dài
   */
  async tradingStrategiesMaShortCutLong(stock: string | any[], from: string, to: string, maShort: string, maLong: string) {
    try {
      const listStock = Array.isArray(stock) ? `in (${stock.map(item => `'${item.code}'`).join(',')})` : `= '${stock}'`;

      const priceKey = `price:${listStock}`;
      const fromKey = `price:${from}`;
      const toKey = `price:${to}`;

      const [dataRedis, dateRedis, dateToRedis] = await Promise.all([
        this.redis.get(priceKey),
        this.redis.get(fromKey),
        this.redis.get(toKey),
      ]);

      const queries = {
        data: !dataRedis && `SELECT closePrice, highPrice, lowPrice, date, code FROM marketTrade.dbo.historyTicker WHERE code ${listStock} ORDER BY date ASC`,
        lastPrice: `
          WITH LatestTrade AS (
            SELECT closePrice, date, code, ROW_NUMBER() OVER (PARTITION BY code ORDER BY date DESC, time DESC) AS rn
            FROM tradeIntraday.dbo.tickerTradeVNDIntraday
            WHERE code ${listStock}
          )
          SELECT closePrice, date, code FROM LatestTrade WHERE rn = 1 ORDER BY code
        `,
        date: !dateRedis && `SELECT TOP 1 date FROM marketTrade.dbo.historyTicker WHERE date >= '${moment(from).format('YYYY-MM-DD')}' ORDER BY date ASC`,
        dateTo: !dateToRedis && `SELECT TOP 1 date FROM marketTrade.dbo.historyTicker WHERE date <= '${moment(to).format('YYYY-MM-DD')}' ORDER BY date DESC`
      };

      // Execute necessary queries in parallel
      const [data, lastPrice, date, dateTo] = await Promise.all([
        queries.data ? this.mssqlService.query(queries.data) : [],
        this.mssqlService.query(queries.lastPrice),
        queries.date ? this.mssqlService.query(queries.date) : [],
        queries.dateTo ? this.mssqlService.query(queries.dateTo) : []
      ]);

      // Cache valid results
      const cachePromises = [];
      if (!dataRedis && UtilCommonTemplate.hasValidData(data)) {
        cachePromises.push(this.redis.set(priceKey, data, { ttl: 180 }));
      }
      if (!dateRedis && UtilCommonTemplate.hasValidData(date)) {
        cachePromises.push(this.redis.set(fromKey, date, { ttl: 180 }));
      }
      if (!dateToRedis && UtilCommonTemplate.hasValidData(dateTo)) {
        cachePromises.push(this.redis.set(toKey, dateTo, { ttl: 180 }));
      }
      if (cachePromises.length > 0) {
        await Promise.all(cachePromises);
      }

      // Use cached data if available
      const finalData = (dataRedis || data) as Array<{ code: string; closePrice: number; highPrice: number; lowPrice: number; date: string }>;
      const finalDate = dateRedis || date;
      const finalDateTo = dateToRedis || dateTo;
      const lastPriceData = lastPrice as Array<{ code: string; closePrice: number }>;

      // Process array of stocks
      if (Array.isArray(stock)) {
        return stock.map((item: any) => {
          const stockData = finalData?.filter(res => res.code === item.code);
          if (!stockData?.length) return null;

          // Update latest price
          const latestPrice = lastPriceData.find(price => price.code === item.code)?.closePrice;
          if (latestPrice) {
            stockData[stockData.length - 1].closePrice = latestPrice;
          }

          // Calculate indicators
          const result = this.calculateMaShortCutLong([...stockData], finalDate, finalDateTo, maShort, maLong);

          return {
            code: item.code,
            // name: result.max.name,
            // total: result.max.total,
            // closePrice: result.data[result.data.length - 1].closePrice,
            // signal: result.max.signal,
            // ma: result.max.macd,
            // closePricePrev: result.data[result.data.length - 1].closePricePrev
          };
        }).filter(Boolean);
      }
      
      // Process single stock
      return this.calculateMaShortCutLong(finalData, finalDate, finalDateTo, maShort, maLong);
    } catch (error) {
      throw new CatchException(error);
    }
  }

  private calculateMaShortCutLong(data: any, date: any, dateTo: any, maShort: string, maLong: string) {
    const dataReverse = [...data].reverse();

    const price = dataReverse.map((item) => item.closePrice);
    const dateFormat = dataReverse.map((item) => ({ ...item, date: UtilCommonTemplate.toDateV2(item.date) }));
    const indexDateFrom = dateFormat.findIndex((item) => item.date == UtilCommonTemplate.toDateV2(date[0].date));
    const indexDateTo = dateFormat.findIndex((item) => item.date == UtilCommonTemplate.toDateV2(dateTo[0].date));
    
    // Calculate short and long MA
    const maShortResults = calTech.sma({ values: [...price].reverse(), period: parseInt(maShort) }).reverse();
    const maLongResults = calTech.sma({ values: [...price].reverse(), period: parseInt(maLong) }).reverse();

    // Combine data with MA values
    const dataWithMA = dateFormat.map((item, index) => ({
      ...item,
      maShort: maShortResults[index] || 0,
      maLong: maLongResults[index] || 0
    })).slice(indexDateTo +  1, indexDateFrom).reverse();
    
    let isBuy = false;
    let indexBuy = 0;
    let count = 0;
    let total = 1;
    let min = 0, max = 0;
    const detail = [];
    let lastSignal = 0; // 0 - Mua, 1 - Bán, 2 - Hold mua, 3 - Hold bán
    
    // Process each data point
    dataWithMA.forEach((item, index) => {
      const prevItem = dataWithMA[index - 1];
      if (!prevItem) return;

      // Check for buy signal (MA ngắn cắt lên MA dài)
      if (prevItem.maShort < prevItem.maLong && item.maShort > item.maLong && !isBuy) {
        isBuy = true;
        indexBuy = index;
        count += 1;
      }

      // Determine last signal
      if (index === dataWithMA.length - 1) {
        lastSignal = prevItem.maShort < prevItem.maLong && item.maShort > item.maLong ? 0 : prevItem.maShort > prevItem.maLong && item.maShort < item.maLong ? 1 : isBuy ? 2 : 3;
      }

      // Check for sell signal (MA ngắn cắt xuống MA dài)
      if ((prevItem.maShort > prevItem.maLong && item.maShort < item.maLong && isBuy) || (index === dataWithMA.length - 1 && isBuy)) {
        isBuy = false;
        const percent = ((item.closePrice - dataWithMA[indexBuy].closePrice) / dataWithMA[indexBuy].closePrice) * 100;

        total = total * (1 + percent / 100);
        min = Math.min(min, percent / 100);
        max = Math.max(max, percent / 100);

        detail.push({
          date_buy: dataWithMA[indexBuy].date,
          date_sell: item.date,
          price_buy: dataWithMA[indexBuy].closePrice,
          price_sell: item.closePrice,
          profit: percent,
        });
      }
    });

    const result = {
      name: `MA${maShort} cắt MA${maLong}`,
      total: total - 1,
      count: count,
      min,
      max,
      detail,
      closePrice: price[price.length - 1],
      signal: lastSignal,
      ma: maShortResults[maShortResults.length - 1],
      closePricePrev: price[price.length - 2],
    };

    return { max: result, data: [result] };
  }

  async allStock() {
    try {
      const data: any = await this.mssqlService.query(`select code from marketInfor.dbo.info where status = 'listed' and type = 'STOCK'`);
      return data.map((item) => item.code);
    } catch (e) {
      throw new CatchException(e);
    }
  }

  async findStockByIndustry(industry: string) {
    try {
      const data: any = await this.mssqlService.query(`select code from RATIO.dbo.phanNganhTcbs where nganh = N'${industry}'`);
      return data.map((item) => item.code);
    } catch (e) {
      throw new CatchException(e);
    }
  }

  async allIndustry() {
    try {
      const data: any = await this.mssqlService.query(`SELECT DISTINCT nganh FROM RATIO.dbo.phanNganhTcbs WHERE nganh IS NOT NULL ORDER BY nganh;`);
      return data.map((item) => item.nganh);
    } catch (e) {
      throw new CatchException(e);
    }
  }

  async createBetaWatchList(body: any) {
    const data: any = (await this.redis.get('beta-watch-list')) || [];
    if (data.find((item) => item.code == body.code))
      throw new ExceptionResponse(HttpStatus.BAD_REQUEST, 'Mã đã tồn tại');

    const newItem = {
      code: body.code,
      currPT: body?.currPT ? parseFloat(body?.currPT) : 0,
      nextPT: body?.nextPT ? parseFloat(body?.nextPT) : 0,
      ma: body?.ma ? parseInt(body?.ma) : 0,
    };
    let price;

    if (!body?.is_beta_page) {
      price = await this.tradingStrategiesMa(body.code, body.from, body.to);
    } else {
      price = await this.tradingStrategiesMa(
        [{ code: body.code, ma: body.ma }],
        moment().subtract(2, 'year').format('YYYY-MM-DD'),
        moment().format('YYYY-MM-DD'),
        1,
      );
    }

    await this.redis.set('beta-watch-list', [...data, newItem], { ttl: 0 });
    return price;
  }

  async updateBetaWatchList(body: any) {
    const data: any = await this.redis.get('beta-watch-list');
    if (!data)
      throw new ExceptionResponse(HttpStatus.BAD_REQUEST, 'Không có mã');

    const index = data.findIndex((item) => item.code == body.code);
    if (index == -1)
      throw new ExceptionResponse(HttpStatus.BAD_REQUEST, 'Mã không tồn tại');

    const newItem = {
      code: body.code,
      currPT: body?.currPT ? parseFloat(body?.currPT) : 0,
      nextPT: body?.nextPT ? parseFloat(body?.nextPT) : 0,
      ma: body?.ma ? parseInt(body?.ma) : 0,
    };

    data[index] = newItem;

    await this.redis.set('beta-watch-list', data, { ttl: 0 });

    if (body?.is_beta_page) {
      const price = await this.tradingStrategiesMa(
        [{ code: body.code, ma: body.ma }],
        moment().subtract(2, 'year').format('YYYY-MM-DD'),
        moment().format('YYYY-MM-DD'),
        1,
      );
      return price;
    }
  }

  async deleteBetaWatchList(code: string) {
    const data: any = await this.redis.get('beta-watch-list');
    const index = data.findIndex((item) => item.code == code);
    if (index == -1)
      throw new ExceptionResponse(HttpStatus.BAD_REQUEST, 'Mã không tồn tại');

    await this.redis.set(
      'beta-watch-list',
      data.filter((item) => item.code != code),
      { ttl: 0 },
    );
  }

  async tradingStrategiesMaAllStock(code: string[], from: string, to: string) {
    const data = await this.tradingStrategiesMa(
      code.map((item) => ({ code: item })),
      from,
      to,
    );
    return data;
  }

  async getBetaWatchList(from: string, to: string) {
    const data: any = await this.redis.get('beta-watch-list');
    if (from) {
      const result: any = await this.tradingStrategiesMaAllStock(
        data.map((item) => item.code),
        from,
        to,
      );
      return result.map((item, index) => ({
        ...item,
        currPT: data[index].currPT || 0,
        nextPT: data[index].nextPT || 0,
      }));
    }
    const result: any = await this.tradingStrategiesMa(
      data.map((item) => ({ code: item.code, ma: item.ma })),
      moment().subtract(2, 'year').format('YYYY-MM-DD'),
      moment().format('YYYY-MM-DD'),
      1,
    );
    return result.map((item, index) => ({
      ...item,
      currPT: data[index].currPT || 0,
      nextPT: data[index].nextPT || 0,
      name: `MA_${data[index].ma}`,
    }));
  }

  /**
   * BETA Smart
   */
  private isRealtime() {
    const now = moment();
    const hour = now.hour();
    const minute = now.minute();
    const isWeekday = !['Saturday', 'Sunday'].includes(now.format('dddd'));

    return (isWeekday && ((hour === 8 && minute >= 59) || (hour > 8 && hour < 15) || (hour === 15 && minute <= 30)));
  }

  static arrOrSingle(key: string, code: string | string[]) {
    return Array.isArray(code)
      ? `${key} IN (${code.map((item) => `'${item}'`).join(',')})`
      : `${key} = '${code}'`;
  }

  queryDataBasic(code: string | string[]) {
    const day_52_week = moment().subtract(52, 'week').format('YYYY-MM-DD');
    const codeCondition = InvestmentService.arrOrSingle('f.code', code);
    const codeConditionMinMax = InvestmentService.arrOrSingle('code', code);

    return `
      WITH min_max AS (
        SELECT code, min(closePrice) AS PRICE_LOWEST_CR_52W, max(closePrice) AS PRICE_HIGHEST_CR_52W 
        FROM marketTrade.dbo.tickerTradeVND 
        WHERE ${codeConditionMinMax} AND date >= '${day_52_week}'
        GROUP BY code
      ),
      LatestDate AS (
        SELECT code, MAX(date) AS maxDate
        FROM VISUALIZED_DATA.dbo.filterResource
        WHERE ${codeConditionMinMax}
        GROUP BY code
      )
      SELECT f.code, t.closePrice, f.volume AS totalVol, f.value AS totalVal, 
             t.perChange, f.perChange1M AS perChangeM, f.perChangeYTD AS perChangeYtD, f.perChange1Y AS perChangeY, 
             f.EPS, f.PE, f.BVPS, f.PB, l.PRICE_HIGHEST_CR_52W, l.PRICE_LOWEST_CR_52W
      FROM VISUALIZED_DATA.dbo.filterResource f
      OUTER APPLY (SELECT TOP 1 closePrice, perChange FROM marketTrade.dbo.tickerTradeVND WHERE code = f.code AND type = 'STOCK' ORDER BY date DESC) AS t
      LEFT JOIN min_max l ON l.code = f.code
      LEFT JOIN LatestDate ld ON ld.code = f.code
      WHERE ${codeCondition} AND f.date = ld.maxDate;
    `;
  }

  queryDataRoaRoe(code: string | string[]) {
    const codeCondition = InvestmentService.arrOrSingle('code', code);

    return `
      WITH filtered_roae AS (
          SELECT code, ROE AS roae, ROA AS roaa, yearQuarter, ROW_NUMBER() OVER (PARTITION BY code ORDER BY yearQuarter DESC) AS rn
          FROM RATIO.dbo.ratioInYearQuarter
          WHERE RIGHT(yearQuarter, 1) <> '0' and ${codeCondition}
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
  }

  private calculatePriceChange(priceTarget: number, closePrice: number) {
    const adjustedClosePrice = closePrice / 1000;
    return ((priceTarget - adjustedClosePrice) / adjustedClosePrice) * 100;
  }

  async getDataBetaSmartOutsideTrading() {
    try {
      const query_signal = `
        SELECT code, signal
        FROM PHANTICH.dbo.BuySellSignals bs
        WHERE ((signal = 0 AND priceIncCY >= 25) OR signal = 1) AND bs.date = (SELECT MAX(date) FROM PHANTICH.dbo.BuySellSignals WHERE code = bs.code)
      `;
      const data_signal = (await this.mssqlService.query(query_signal)) as any;

      const uniqueCodes: string[] = Array.from(new Set(data_signal.map((item) => item.code))) as string[];
      if (uniqueCodes.length === 0) return [];

      const [data_basic, data_roa_roe] = (await Promise.all([
        this.mssqlService.query<BetaSmartResponse[]>(this.queryDataBasic(uniqueCodes)),
        this.mssqlService.query(this.queryDataRoaRoe(uniqueCodes)),
      ])) as [BetaSmartResponse[], any];

      return BetaSmartResponse.mapToList(
        data_basic.map((item) => ({
          ...item,
          ...data_roa_roe.find((roa_roe) => roa_roe.code == item.code),
          ...data_signal.find((signal) => signal.code == item.code),
        })),
      );
    } catch (error) {
      console.error(error);
    }
  }

  async getDataBetaSmartTrading() {
    try {
      const data: any = await this.redis.get('beta-watch-list');
      const result: any = await this.tradingStrategiesMa(
        data.map((item) => ({ code: item.code, ma: item.ma })),
        moment().subtract(2, 'year').format('YYYY-MM-DD'),
        moment().format('YYYY-MM-DD'),
        1,
      );

      const filteredResults = result.filter((item, index) => {
          const isSignalOne = item.signal === 1;
          const isSignalZeroWithConditions =
            item.signal === 0 &&
            this.calculatePriceChange(data[index].currPT, item.closePrice) >= 25;

          return isSignalOne || isSignalZeroWithConditions;
        }).map((item) => ({ code: item.code, signal: item.signal }));

      const uniqueCodes: string[] = Array.from(new Set(filteredResults.map((item) => item.code))) as string[];
      if (uniqueCodes.length === 0) return [];

      const [data_basic, data_roa_roe] = (await Promise.all([
        this.mssqlService.query<BetaSmartResponse[]>(this.queryDataBasic(uniqueCodes)),
        this.mssqlService.query(this.queryDataRoaRoe(uniqueCodes)),
      ])) as [BetaSmartResponse[], any];

      return BetaSmartResponse.mapToList(
        data_basic.map((item) => ({
          ...item,
          ...data_roa_roe.find((roa_roe) => roa_roe.code == item.code),
          ...filteredResults.find((signal) => signal.code == item.code),
        })),
      );
    } catch (error) {
      console.error(error);
    }
  }

  async getBetaSmart() {
    return this.isRealtime() ? this.getDataBetaSmartTrading() : this.getDataBetaSmartOutsideTrading();
  }

  async getDataStockBasic(code: string) {
    try {
      const redisData = await this.redis.get(`${RedisKeys.dataStockBasic}:${code}`);
      if (redisData) return redisData;

      const [data_basic, data_roa_roe] = (await Promise.all([
        this.mssqlService.query<BetaSmartResponse[]>(this.queryDataBasic(code)),
        this.mssqlService.query(this.queryDataRoaRoe(code)),
      ])) as [BetaSmartResponse[], any];

      const mappedData = { ...data_basic[0], ...data_roa_roe[0] };
      const dataMapped = new BetaSmartResponse(mappedData);

      await this.redis.set(`${RedisKeys.dataStockBasic}:${code}`, dataMapped, { ttl: TimeToLive.Minute });
      return dataMapped;
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * MB chủ động
   */
  async tickerTransLog(code: string) {
    const redisData = await this.redis.get(`${RedisKeys.tickerTransLog}:${code}`);
    if (redisData) return redisData;

    try {
      const now = moment();
      const isWeekday = now.isoWeekday() < 6;
      
      const query = `
        SELECT closePrice
        FROM marketTrade.dbo.tickerTradeVND t
        INNER JOIN (
            SELECT MAX(date) AS max_previous_date
            FROM tradeIntraday.dbo.tickerTradeVNDIntraday
            WHERE date ${isWeekday ? `<` : `<=`} (SELECT MAX(date) FROM tradeIntraday.dbo.tickerTradeVNDIntraday)
        ) latest ON t.date = latest.max_previous_date
        WHERE t.code = '${code}';
      `;
      const data_2 = await this.mssqlService.query(query);

      let response, finalResponse;
      if(isWeekday) {
        response = await axios.get(`https://priceapi.bsc.com.vn/datafeed/alltranslogs/${code}`, {
          headers: {
            host: 'priceapi.bsc.com.vn',
            origin: 'https://trading.bsc.com.vn',
            referer: 'https://trading.bsc.com.vn/',
            'User-Agent': UtilsRandomUserAgent.getRandomUserAgent(),
            'x-devicetype': 'WEB',
            'x-lang': 'vi',
          }},
        );

        const dataCal = response.data.d.map((item) => {
          const value = item.formattedMatchPrice * item.formattedVol;
          const type = value < 100_000_000 ? 'small' : value < 1_000_000_000 ? 'medium' : 'large';
  
          const currentDate = new Date();
  
          const [hours, minutes, seconds] = item.formattedTime.split(':').map(Number);
  
          const time = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), hours, minutes, seconds)).toISOString(); // Chuyển thành định dạng ISO
  
          return {
            time,
            action: item.lastColor === 'S' ? 'B' : item.lastColor === 'B' ? 'S' : item.lastColor,
            type,
            volume: +item.formattedVol,
            value: value,
            matchPrice: item.formattedMatchPrice / 1_000,
            priceChangeReference: item.formattedChangeValue / 1_000,
            perChangeReference: (item.formattedChangeValue / 1000 / data_2[0].closePrice) * 100,
            highlight: value > 1_000_000_000,
          };
        });
  
        finalResponse = new TickerTransLogResponse({
          ticker: code,
          prevClosePrice: data_2[0].closePrice,
          data: DataBuySell.mapToList(dataCal),
        });

      } else {
        const sql_query = `
          select distinct code, date, time, action, matchPrice, priceChangeReference, volume
          from tradeIntraday.dbo.tickerTransVNDIntraday
          where code = '${code}' and date = (select MAX(date) from tradeIntraday.dbo.tickerTransVNDIntraday where code = '${code}') 
          order by time desc
        `
        response = await this.mssqlService.query(sql_query);
        
        const dataCal = response.map((item) => {
          const value = item.matchPrice * item.volume;
          const type = value < 100_000_000 ? "small" : value < 1_000_000_000 ? "medium" : "large";

            return {
              time: item.time,
              action: item.action,
              type,
              volume: +item.volume,
              value: value,
              matchPrice: item.matchPrice / 1_000,
              priceChangeReference: item.priceChangeReference / 1_000,
              perChangeReference: (item.priceChangeReference / 1000 / data_2[0].closePrice) * 100,
              highlight: value > 1_000_000_000,
            }
        })

        finalResponse = new TickerTransLogResponse({
          ticker: code,
          prevClosePrice: data_2[0].closePrice,
          data: DataBuySell.mapToList(dataCal),
        });
      }

      await this.redis.set(`${RedisKeys.tickerTransLog}:${code}`, finalResponse, { ttl: TimeToLive.HaftMinute });

      return finalResponse;
    } catch (err) {
      console.error(err);
    }
  }

  /**
   * Backtest Trading tool
   */
  async getBackTestTrading(from: string, to: string) {
    const data: any = await this.redis.get('beta-watch-list');

    const result: any = await this.backtest(data.map((item) => ({ code: item.code, ma: item.ma })), from, to);
    return result;
  }

  async backtest(stock: any[], from: string, to: string, realtimePrice?: number) {
    try {
      const listStock: any = !Array.isArray(stock) ? `= '${stock}'` : `in (${stock.map((item) => `'${item.code}'`).join(',')})`;
      const fromDate = moment(from).format('YYYY-MM-DD');
      const toDate = moment(to).format('YYYY-MM-DD');

      // Tạo cache key duy nhất cho bộ tham số đầu vào
      const cacheKey = `backtest:${listStock}:${fromDate}:${toDate}:${realtimePrice || ''}`;
      const cachedResult = await this.redis.get(cacheKey);
      if (cachedResult) return cachedResult;

      // Tối ưu query lấy lịch sử giá và tín hiệu trong một lần query
      const combinedQuery = `
        WITH HistoricalData AS (
          SELECT closePrice, date, code 
          FROM marketTrade.dbo.historyTicker
          WHERE code ${listStock} AND date BETWEEN '${fromDate}' AND '${toDate}'
        ),
        SignalData AS (
          SELECT b.code, b.date, b.signal
          FROM PHANTICH.dbo.BuySellSignals b
          WHERE b.code ${listStock} AND b.date BETWEEN '${fromDate}' AND '${toDate}' AND ((b.signal = 0 AND b.priceIncCY >= 25) OR b.signal = 1)
        ),
        LatestPrice AS (
          SELECT closePrice, date, code
          FROM (
            SELECT closePrice, date, code,
                   ROW_NUMBER() OVER (PARTITION BY code ORDER BY date DESC, time DESC) AS rn
            FROM tradeIntraday.dbo.tickerTradeVNDIntraday
            WHERE code ${listStock}
          ) t WHERE rn = 1
        )
        SELECT h.code, h.date, h.closePrice, s.signal, l.closePrice as lastPrice
        FROM HistoricalData h
        LEFT JOIN SignalData s ON h.code = s.code AND h.date = s.date
        LEFT JOIN LatestPrice l ON h.code = l.code
        ORDER BY h.code, h.date;
      `;

      const data = await this.mssqlService.query(combinedQuery) as any[];
      
      // Tối ưu xử lý dữ liệu bằng Map
      const stockMap = new Map();
      data?.forEach((row) => {
        if (!stockMap.has(row.code)) {
          stockMap.set(row.code, {
            prices: new Map(),
            signals: [],
            lastPrice: !realtimePrice ? row.lastPrice : realtimePrice
          });
        }
        const stockData = stockMap.get(row.code);
        stockData.prices.set(moment(row.date).format('YYYY-MM-DD'), row.closePrice);
        if (row.signal !== null) {
          stockData.signals.push({
            date: row.date,
            signal: row.signal
          });
        }
      });

      // Xử lý kết quả cho từng mã
      const results: any[] = [];
      for (const [code, data] of stockMap) {
        let prevSignalZero = null;
        const { prices, signals, lastPrice } = data;

        signals.sort((a: any, b: any) => moment(a.date).diff(moment(b.date)));
        
        for (const signal of signals) {
          const currentDate = moment(signal.date).format('YYYY-MM-DD');
          
          if (signal.signal === 0) {
            prevSignalZero = {
              date: currentDate,
              price: prices.get(currentDate)
            };
          } else if (signal.signal === 1 && prevSignalZero) {
            const priceZero = prevSignalZero.price;
            const priceOne = prices.get(currentDate);

            if (priceZero && priceOne) {
              results.push({
                code,
                startDate: prevSignalZero.date,
                endDate: currentDate,
                priceBuy: priceZero,
                priceSell: priceOne,
                priceStar: 0,
                priceChange: ((priceOne - priceZero) / priceZero) * 100,
                priceNow: lastPrice,
                status: 1
              });
            }
            prevSignalZero = null;
          }
        }

        // Xử lý trường hợp còn signal 0 mà chưa có signal 1
        if (prevSignalZero) {
          const priceOne = lastPrice;
          const priceZero = prevSignalZero.price;

          if (priceZero && priceOne) {
            results.push({
              code,
              startDate: prevSignalZero.date,
              endDate: toDate,
              priceBuy: priceZero,
              priceSell: 0,
              priceStar: priceOne,
              priceChange: ((priceOne - priceZero) / priceZero) * 100,
              priceNow: lastPrice,
              status: 0
            });
          }
        }
      }

      // Cache kết quả
      await this.redis.set(cacheKey, results, { ttl: 180 });
      return results;
    } catch (error) {
      console.error('Backtest error:', error);
      throw error;
    }
  }

  async getBetaWatchListBackup(date: string) {
    const data: any = await this.redis.get('beta-watch-list');
    const from = await this.mssqlService.query(`SELECT MAX(date) as date FROM marketTrade.dbo.historyTicker WHERE date < '${moment(date).format('YYYY-MM-DD')}'`);
    
    const result: any = await this.testBackup(
      data.map((item) => ({ code: item.code, ma: item.ma })),
      moment(from[0].date).format('YYYY-MM-DD'),
      moment(date).format('YYYY-MM-DD'),
      1,
    );
    return result.map((item, index) => ({
      ...item,
      currPT: data[index].currPT || 0,
      nextPT: data[index].nextPT || 0,
      name: `MA_${data[index].ma}`,
    }));
  }

  async testBackup(stock: string | any[], from: string, to: string, haveMa?: 0 | 1, realtimePrice?: number, role?: number) {
    const listStock: any = !Array.isArray(stock) ? `= '${stock}'` : `in (${stock.map((item) => `'${item.code}'`).join(',')})`;

    const [dataRedis, dateRedis, dateToRedis] = await Promise.all([
      this.redis.get(`price-back-up:${listStock}`),
      this.redis.get(`price-back-up:${from}`),
      this.redis.get(`price-back-up:${to}`),
    ]);
    
    let [data, lastPrice, date, dateTo] = await Promise.all([
      !dataRedis ? (this.mssqlService.query(`select closePrice, date, code from marketTrade.dbo.historyTicker where code ${listStock} order by date asc`) as any) : [],
      !realtimePrice ? this.mssqlService.query(`WITH LatestTrade AS (
                                                  SELECT closePrice, date, code, ROW_NUMBER() OVER (PARTITION BY code ORDER BY date DESC, time DESC) AS rn 
                                                  FROM tradeIntraday.dbo.tickerTradeVNDIntraday WHERE code ${listStock}
                                                )
                                                SELECT closePrice, date, code FROM LatestTrade WHERE rn = 1 ORDER BY code;`) : (1 as any),
      !dateRedis ? this.mssqlService.query(`select top 1 date from marketTrade.dbo.historyTicker where date >= '${moment(from).format('YYYY-MM-DD')}' order by date asc`) : [],
      !dateToRedis ? this.mssqlService.query(`select top 1 date from marketTrade.dbo.historyTicker where date <= '${moment(to).format('YYYY-MM-DD')}' order by date desc`) : [],
    ]);

    if (realtimePrice && !dataRedis && UtilCommonTemplate.hasValidData(data)) {
      await this.redis.set(`price-back-up:${listStock}`, data, { ttl: 180 });
    }
    if (!dateRedis && UtilCommonTemplate.hasValidData(date)) {
      await this.redis.set(`price-back-up:${from}`, date, { ttl: 180 });
    }
    if (!dateToRedis && UtilCommonTemplate.hasValidData(dateTo)) {
      await this.redis.set(`price-back-up:${to}`, dateTo, { ttl: 180 });
    }

    if (dataRedis) {
      data = dataRedis;
    }
    if (dateRedis) {
      date = dateRedis;
    }
    if (dateToRedis) {
      dateTo = dateToRedis;
    }

    if (Array.isArray(stock)) {
      const arr = [];

      stock.map((item: any) => {
        const price = data.filter((res) => res.code == item.code);
        price[price.length - 1]['closePrice'] = !realtimePrice ? lastPrice.find((price) => price.code == item.code).closePrice : realtimePrice;

        const result = !haveMa
          ? this.calculateMAIndexBackup([...data.filter((res) => res.code == item.code)], date, dateTo)
          : this.calculateMAIndexBackup([...data.filter((res) => res.code == item.code)], date, dateTo, item.ma);
        
          arr.push({
          code: item.code,
          name: result.max.name,
          total: result.max.total,
          closePrice: result.data[result.data.length - 1].closePrice,
          signal: result.max.signal,
          ma: result.max.ma,
          closePricePrev: result.data[result.data.length - 1].closePricePrev,
        });
      });

      return arr;
    }

    const result = this.calculateMAIndexBackup(data, date, dateTo, undefined, role);
    return result;
  }

  private calculateMAIndexBackup(data: any, date: any, dateTo: any, maNumber?: number, role?: number) {
    const price = data.map((item) => item.closePrice);
    const dateFormat = data.map((item) => ({ ...item, date: UtilCommonTemplate.toDateV2(item.date) }));
    const indexDateFrom = dateFormat.findIndex((item) => item.date == UtilCommonTemplate.toDateV2(date[0].date));
    const indexDateTo = dateFormat.findIndex((item) => item.date == UtilCommonTemplate.toDateV2(dateTo[0].date));

    const arr = [];
    let ma = !role ? [5, 10, 20, 50, 60, 100] : Array.from({ length: 96 }, (_, i) => i + 5);
    if (maNumber) {
      ma = [maNumber];
    }
    
    ma.forEach((value) => {
      const ma = calTech.sma({ values: price, period: value });
      const maReverse = [...ma].reverse();
      const newData = [...dateFormat].reverse().map((item, index) => ({ ...item, ma: maReverse[index] || 0 }));

      let isBuy = false;
      let indexBuy = 0;
      let count = 0;
      let total = 1;
      let min = 0, max = 0;
      const detail = [];
      let lastSignal = 0; // 0 - Mua, 1 - Bán, 2 - Hold mua, 3 - Hold bán

      const dataWithMa = [...newData].reverse().slice(indexDateFrom, indexDateTo + 1);
      
      dataWithMa.map((item, index) => {
        if (dataWithMa[index - 1]?.closePrice && item.closePrice > item.ma && dataWithMa[index - 1].closePrice <= dataWithMa[index - 1].ma && !isBuy) {
          isBuy = true;
          indexBuy = index;
          count += 1;
        }
        
        if (index == dataWithMa.length - 1) {
          lastSignal = 
            dataWithMa[index - 1]?.closePrice && item.closePrice > item.ma && dataWithMa[index - 1].closePrice < dataWithMa[index - 1].ma 
                ? 0 
                : dataWithMa[index - 1]?.closePrice && item.closePrice < item.ma && dataWithMa[index - 1].closePrice > dataWithMa[index - 1].ma 
                ? 1 
                : isBuy 
                ? 2 
                : 3;
        }
        
        if ((dataWithMa[index - 1]?.closePrice && item.closePrice < item.ma && dataWithMa[index - 1].closePrice > dataWithMa[index - 1].ma && isBuy) || (index == dataWithMa.length - 1 && isBuy)) {
          isBuy = false;
          const percent = ((item.closePrice - dataWithMa[indexBuy].closePrice) / dataWithMa[indexBuy].closePrice) * 100;

          total = total * (1 + percent / 100);
          min = Math.min(min, percent / 100);
          max = Math.max(max, percent / 100);

          detail.push({
            date_buy: dataWithMa[indexBuy].date,
            date_sell: item.date,
            price_buy: dataWithMa[indexBuy].closePrice,
            price_sell: item.closePrice,
            profit: percent,
          });
        }
      });
      
      
      arr.push({
        name: `MA_${value}`,
        total: total - 1,
        count: count,
        min,
        max,
        detail,
        closePrice: price[indexDateTo],
        signal: lastSignal,
        ma: dataWithMa[1].ma,
        closePricePrev: price[indexDateFrom],
      });
    });
    
    const max = arr.reduce((acc, curr) => !acc?.total ? arr[0] : curr.total > acc.total ? curr : acc, arr[0]);
    
    return { max: max, data: arr };
  }

  /**
   * Định giá cổ phiếu
   */
  async getStockValuation(q: StockValuationDto) {
    try {
      const { stock, average, perWelfareFund = 0.05, averageGrowthLNST: inputGrowthRate } = q;
      const startDate = moment().subtract(average, 'year').format('YYYY-MM-DD');
      const endDate = moment().format('YYYY-MM-DD');

      // Cache key for both EPS and BVPS
      const cacheKey = `eps-bpvs:${stock}`;
      let epsBvpsData = await this.redis.get(cacheKey) as any[];

      if (!epsBvpsData?.length) {
        const query = `
          WITH LatestDate AS (
            SELECT MAX(date) as maxDate 
            FROM VISUALIZED_DATA.dbo.filterResource
            WHERE code = '${stock}'
          )
          SELECT f.code, f.EPS, f.BVPS
          FROM VISUALIZED_DATA.dbo.filterResource f
          JOIN LatestDate d ON f.date = d.maxDate
          WHERE f.code = '${stock}'`;

        epsBvpsData = await this.mssqlService.query(query) as any[];
      
        if (epsBvpsData?.length) {
          await this.redis.set(cacheKey, epsBvpsData, { ttl: TimeToLive.OneDay });
        }
      }

      // Lấy thông tin ngành và dữ liệu tài chính trong một lần query
      const financialData = await this.mssqlService.query<Array<{code: string; year: number; value: string}>>(`
        SELECT TOP 6 code, year, value 
        FROM financialReport.dbo.financialReportV2 
        WHERE code = '${stock}' AND quarter = 0 AND id = CASE 
          WHEN EXISTS (SELECT 1 FROM marketInfor.dbo.info WHERE code = '${stock}' AND LV2 = N'Ngân hàng') THEN '15'
          WHEN EXISTS (SELECT 1 FROM marketInfor.dbo.info WHERE code = '${stock}' AND LV2 = N'Bảo hiểm') THEN '37'
          WHEN EXISTS (SELECT 1 FROM marketInfor.dbo.info WHERE code = '${stock}' AND LV2 = N'Dịch vụ tài chính') THEN '1101'
          ELSE '21'
        END AND type = 'KQKD'
        ORDER BY year DESC
      `);

      if (!financialData?.length) return;

      // Lấy dữ liệu vốn chủ sở hữu
      const ownersEquityData = await this.mssqlService.query<Array<{value: number}>>(`
        SELECT TOP 1 value 
        FROM financialReport.dbo.financialReportV2 
        WHERE code = '${stock}' AND quarter = 0 AND id = CASE 
          WHEN EXISTS (SELECT 1 FROM marketInfor.dbo.info WHERE code = '${stock}' AND LV2 = N'Ngân hàng') THEN '308'
          WHEN EXISTS (SELECT 1 FROM marketInfor.dbo.info WHERE code = '${stock}' AND LV2 = N'Bảo hiểm') THEN '40101'
          WHEN EXISTS (SELECT 1 FROM marketInfor.dbo.info WHERE code = '${stock}' AND LV2 = N'Dịch vụ tài chính') THEN '302'
          ELSE '30201'
        END AND type = 'CDKT'
        ORDER BY year DESC
      `);

      // Tính toán tăng trưởng lợi nhuận sau thuế
      const growthRates = financialData.reduce((acc, item, index) => {
        const currentValue = parseFloat(item.value);
        const previousValue = index < financialData.length - 1 ? parseFloat(financialData[index + 1].value) : 0;
        const growthRate = previousValue !== 0 ? ((currentValue - previousValue) / Math.abs(previousValue)) * 100 : 0;
        
        if (growthRate !== 0) {
          acc.push(growthRate);
        }
        return acc;
      }, [] as number[]);

      // Tính trung bình tăng trưởng hoặc sử dụng giá trị từ input
      const averageGrowthLNST = inputGrowthRate !== undefined ? +inputGrowthRate : 
        (growthRates.length > 0 ? growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length : 0);
      
      // Tính trích lập quỹ khen thưởng phúc lợi
      const currentProfit = parseFloat(financialData[0].value);
      const projectedProfit = currentProfit + (currentProfit * averageGrowthLNST / 100);
      const welfareFund = projectedProfit * perWelfareFund;

      // Get PE, PB data for stock and industry
      const [pePbData] = await this.mssqlService.query<Array<{ stockPE: number; stockPB: number; industryPE: number; industryPB: number; }>>(`
        WITH Industry AS (SELECT nganh FROM RATIO.dbo.phanNganhTcbs WHERE code = '${stock}' ORDER BY date DESC OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY),
        StockRatios AS (
          SELECT AVG(CASE WHEN PE >= 0 AND PE < 100 THEN PE ELSE NULL END) as avgPE, AVG(CASE WHEN PB >= 0 AND PB < 100 THEN PB ELSE NULL END) as avgPB
          FROM RATIO.dbo.ratioIndayTcbs s
          WHERE s.code = '${stock}' 
          AND s.date BETWEEN '${startDate}' AND '${endDate}'
        ),
        IndustryRatios AS (
          SELECT 
            AVG(CASE WHEN i.PE >= 0 AND i.PE < 100 THEN i.PE ELSE NULL END) as avgIndustryPE, 
            AVG(CASE WHEN i.PB >= 0 AND i.PB < 100 THEN i.PB ELSE NULL END) as avgIndustryPB
          FROM RATIO.dbo.ratioIndayTcbs s
          LEFT JOIN Industry ind ON 1=1
          LEFT JOIN RATIO.dbo.ratioIndayTcbs i ON i.code = ind.nganh AND i.date = s.date AND i.type = 'industry'
          WHERE s.code = '${stock}' 
          AND s.date BETWEEN '${startDate}' AND '${endDate}'
        )
        SELECT s.avgPE as stockPE, s.avgPB as stockPB, i.avgIndustryPE as industryPE, i.avgIndustryPB as industryPB
        FROM StockRatios s
        CROSS JOIN IndustryRatios i
      `);

      // Get latest shareout data
      const [shareout] = await this.mssqlService.query<Array<{ shareout:number }>>(`
        SELECT TOP 1 shareout FROM RATIO.dbo.ratioInday WHERE code = '${stock}' ORDER BY date DESC
      `);

      // Calculate forward EPS and BVPS
      const epsFw = shareout?.shareout ? (projectedProfit - welfareFund) / shareout.shareout : 0;
      const bvpsFw = shareout?.shareout ? (ownersEquityData[0]?.value + (projectedProfit - welfareFund)) / shareout.shareout : 0;

      // Calculate reasonable prices
      const eps = epsBvpsData[0]?.EPS || 0;
      const bvps = epsBvpsData[0]?.BVPS || 0;
      const stockPE = pePbData?.stockPE || 0;
      const stockPB = pePbData?.stockPB || 0;
      const industryPE = pePbData?.industryPE || 0;
      const industryPB = pePbData?.industryPB || 0;

      const [closePrice] = await this.mssqlService.query<Array<{ closePrice: number }>>(`
        SELECT TOP 1 closePrice FROM marketTrade.dbo.tickerTradeVND WHERE code = '${stock}' ORDER BY date DESC
      `);

      return {
        closePrice: closePrice?.closePrice,
        averageGrowthLNST,
        reasonablePriceStock: [
          stockPE,
          stockPB,
          eps,
          bvps,
          eps * stockPE,
          bvps * stockPB
        ],
        reasonablePriceIndus: [
          industryPE,
          industryPB,
          eps,
          bvps,
          eps * industryPE,
          bvps * industryPB
        ],
        estimatedPriceStock: [
          stockPE,
          stockPB,
          epsFw,
          bvpsFw,
          epsFw * stockPE,
          bvpsFw * stockPB
        ],
        estimatedPriceIndus: [
          industryPE,
          industryPB,
          epsFw,
          bvpsFw,
          epsFw * industryPE,
          bvpsFw * industryPB
        ]
      };
    } catch (error) {
      throw new CatchException(error);
    }
  }

  async stockValuationRecommendations(stock: string) {
    try {
      const startDate = moment().subtract(3, 'month').format('YYYY-MM-DD');
      const endDate = moment().format('YYYY-MM-DD');

      // Optimize SQL query with index hints and better join strategy
      const data = await this.mssqlService.query(`
        WITH LatestPrice AS (SELECT TOP 1 closePrice FROM marketTrade.dbo.tickerTradeVND WHERE code = '${stock}' ORDER BY date DESC)
        SELECT sr.company, sr.targetPrice, (CAST(sr.targetPrice - lp.closePrice AS FLOAT) / lp.closePrice) * 100 AS percentChange
        FROM PHANTICH.dbo.StockReco sr
        CROSS JOIN LatestPrice lp
        WHERE sr.code = '${stock}' AND sr.reportDate BETWEEN '${startDate}' AND '${endDate}'
        ORDER BY sr.targetPrice DESC;
      `);
      
      return data;
    } catch (error) {
      throw new CatchException(error);
    }
  }
}
