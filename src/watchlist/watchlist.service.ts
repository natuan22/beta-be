import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as moment from 'moment';
import { Repository } from 'typeorm';
import { DB_SERVER } from '../constants';
import {
  CatchException,
  ExceptionResponse,
} from '../exceptions/common.exception';
import { ReportService } from '../report/report.service';
import { UtilCommonTemplate } from '../utils/utils.common';
import { CreateWatchlistDto } from './dto/create-watchlist.dto';
import { UpdateWatchlistDto } from './dto/update-watchlist.dto';
import { WatchListEntity } from './entities/watchlist.entity';
import { GetAllWatchListResponse } from './responses/getAll.response';
import { WatchListDataResponse } from './responses/watchListData.response';

@Injectable()
export class WatchlistService {
  constructor(
    @InjectRepository(WatchListEntity, DB_SERVER)
    private readonly watchListRepo: Repository<WatchListEntity>,
    private readonly reportService: ReportService,
  ) {}

  async create(body: CreateWatchlistDto, user_id: number) {
    try {
      const new_watch_list = this.watchListRepo.create({
        name: body.name,
        code: JSON.stringify([]),
        user: {
          user_id,
        },
      });

      await this.watchListRepo.save(new_watch_list);

      return {
        id: new_watch_list.id,
        name: new_watch_list.name,
      };
    } catch (e) {
      throw new CatchException(e);
    }
  }

  async update(body: UpdateWatchlistDto, user_id: number) {
    try {
      const watch_list = await this.watchListRepo.findOne({
        where: { id: body.id, user: { user_id } },
      });
      if (!watch_list)
        throw new ExceptionResponse(
          HttpStatus.BAD_REQUEST,
          'Watchlist invalid',
        );

      await this.watchListRepo.update(
        { id: body.id },
        { name: body.name, code: JSON.stringify(body.code) },
      );
    } catch (e) {
      throw new CatchException(e);
    }
  }

  async delete(id: number, user_id: number) {
    try {
      const watch_list = await this.watchListRepo.findOne({
        where: { id, user: { user_id } },
      });
      if (!watch_list)
        throw new ExceptionResponse(
          HttpStatus.BAD_REQUEST,
          'watch list invalid',
        );

      await this.watchListRepo.delete({ id });
    } catch (e) {
      throw new CatchException(e);
    }
  }

  async getAll(user_id: number) {
    try {
      const watch_list = await this.watchListRepo.find({
        where: { user: { user_id } },
      });
      return GetAllWatchListResponse.mapToList(watch_list);
    } catch (e) {
      throw new CatchException(e);
    }
  }

  queryDataWatchList(codes: string[]) {
    const day_52_week = moment().subtract(52, 'week').format('YYYY-MM-DD');
    return `
    with min_max as (
      select code, min(closePrice) as PRICE_LOWEST_CR_52W, max(closePrice) as PRICE_HIGHEST_CR_52W from marketTrade.dbo.tickerTradeVND where code in (${codes
        .map((item) => `'${item}'`)
        .join(',')}) and date >= '${day_52_week}' group by code
    )
    select f.code, t.closePrice, t.perChange, f.floor, f.LV2, f.value as totalVal, f.volume as totalVol, f.beta, f.perChange5D as perChangeW, f.perChange1M as perChangeM,  f.perChange1Y as perChangeY, f.perChangeYTD as perChangeYtD,
    r.netVal as buyVal, r.netVol as buyVol,
    m.MB, m.Mua, m.Ban,
    f.PE, f.EPS, f.PB, f.BVPS, f.marketCap,
    f.TinHieuChiBaoKyThuat as tech, f.TinHieuDuongXuHuong as trend, f.TinHieuTongHop as overview,
    c.grossProfitMargin as grossProfitMarginQuarter, c.netProfitMargin as netProfitMarginQuarter, y.grossProfitMargin as grossProfitMarginYear, y.netProfitMargin as netProfitMarginYear,
    l.PRICE_HIGHEST_CR_52W, l.PRICE_LOWEST_CR_52W
     from VISUALIZED_DATA.dbo.filterResource f
     inner join PHANTICH.dbo.MBChuDong m on m.MCK = f.code and m.Ngay = (select max(Ngay) from PHANTICH.dbo.MBChuDong)
     left join financialReport.dbo.calBCTC c on c.code = f.code and c.yearQuarter = (select max(yearQuarter) from financialReport.dbo.calBCTC)
     left join financialReport.dbo.calBCTC y on y.code = f.code and y.yearQuarter = (select max(yearQuarter) from financialReport.dbo.calBCTC where right(yearQuarter, 1) = 0)
     left join financialReport.dbo.calBCTCNH n on n.code = f.code and n.yearQuarter = (select max(yearQuarter) from financialReport.dbo.calBCTCNH)
     left join min_max l on l.code = f.code
     inner join marketTrade.dbo.tickerTradeVND t on t.code = f.code and t.date = (select max(date) from marketTrade.dbo.tickerTradeVND where type = 'STOCK')
     inner join marketTrade.dbo.[foreign] r on r.code = f.code and r.date = (select max(date) from marketTrade.dbo.[foreign] where type = 'STOCK')
     where f.code in (${codes.map((item) => `'${item}'`).join(',')})
      and f.date = (select max(date) from VISUALIZED_DATA.dbo.filterResource) 
    `;
  }
  private isInTime() {
    const hour = moment().hour();
    const minute = moment().minute();
    const today = moment().format('dddd');

    if (hour == 8 && minute >= 30 && today != 'Saturday' && today != 'Sunday')
      return true;
    return false;
  }

  async watchListData(id: number, user_id: number) {
    try {
      const watch_list = await this.watchListRepo.findOne({
        where: { id, user: { user_id } },
      });
      if (!watch_list)
        throw new ExceptionResponse(
          HttpStatus.BAD_REQUEST,
          'watch list not found',
        );

      const codes: string[] = JSON.parse(watch_list.code);
      if (codes.length === 0) return [];

      let isInTime = this.isInTime();

      const query = this.queryDataWatchList(codes);

      const news_query = `select TickerTitle as code, Title as title, Date as date, Img as img, Href as href from macroEconomic.dbo.TinTuc where TickerTitle in (${codes
        .map((item) => `'${item}'`)
        .join(',')}) order by Date desc`;

      //roe, roa
      const query_4 = `
          with roae as (
            select code, ROE as roae, ROA as roaa, yearQuarter
            from RATIO.dbo.ratioInYearQuarter
            where right(yearQuarter, 1) <> 0 and code in (${codes.map((item) => `'${item}'`).join(',')})
          ),
          sum_roaa as (
            select roaa + lead(roaa) over (partition by code order by yearQuarter desc)
                        + lead(roaa, 2) over (partition by code order by yearQuarter desc)
                        + lead(roaa, 3) over (partition by code order by yearQuarter desc) as roaa,
                  roae + lead(roae) over (partition by code order by yearQuarter desc)
                        + lead(roae, 2) over (partition by code order by yearQuarter desc)
                        + lead(roae, 3) over (partition by code order by yearQuarter desc) as roae, 
                  code, yearQuarter
            from roae
          ),
          roaa AS (select code, roaa as ROA, roae as ROE from sum_roaa where yearQuarter = (select max(yearQuarter) from sum_roaa))
          select * from roaa
      `;

      const [data, data_news, data_4] = await Promise.all([
        this.watchListRepo.query(query),
        this.watchListRepo.query(news_query),
        this.watchListRepo.query(query_4)
      ]);
      
      return WatchListDataResponse.mapToList(
        data.map((item) => ({
          ...item,
          ...(isInTime && {
            perChange: 0,
            perChangeW: 0,
            perChangeM: 0,
            perChangeY: 0,
            perChangeYtD: 0,
            totalVol: 0,
            totalVal: 0,
            buyVol: 0,
            buyVal: 0,
          }),
          news: data_news
            .filter((news) => news.code == item.code)
            .map((new_item) => ({
              title: new_item.title,
              href: new_item.href,
              img: new_item.img,
              date: UtilCommonTemplate.toDate(new_item.date),
            })),
          ...data_4.find(roa => roa.code == item.code)
        })),
      );
    } catch (e) {
      throw new CatchException(e);
    }
  }

  async watchListDataStock(code: string) {
    try {
      const query = this.queryDataWatchList([code]);
      const data = await this.watchListRepo.query(query);
      return new WatchListDataResponse(data[0]);
    } catch (e) {
      throw new CatchException(e);
    }
  }
}
