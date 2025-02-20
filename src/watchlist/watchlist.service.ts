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
    return [`
      WITH min_max AS (
        SELECT code, MIN(closePrice) AS PRICE_LOWEST_CR_52W, MAX(closePrice) AS PRICE_HIGHEST_CR_52W
        FROM marketTrade.dbo.tickerTradeVND
        WHERE code IN (${codes.map((item) => `'${item}'`).join(',')}) AND date >= '${day_52_week}'
        GROUP BY code
      ),
      LatestQuarter AS (
        SELECT code, MAX(yearQuarter) AS maxYearQuarter
        FROM financialReport.dbo.calBCTC
        WHERE code IN (${codes.map((item) => `'${item}'`).join(',')}) AND yearQuarter IS NOT NULL
        GROUP BY code
      ),
      LatestDate AS (
        SELECT fr.code, fr.date AS maxDate
        FROM VISUALIZED_DATA.dbo.filterResource fr
        INNER JOIN (
          SELECT code, MAX(date) AS maxDate
          FROM VISUALIZED_DATA.dbo.filterResource
          WHERE code IN (${codes.map((item) => `'${item}'`).join(',')})
          GROUP BY code
        ) ld ON fr.code = ld.code AND fr.date = ld.maxDate
      ),
      MBChuDong AS (
        SELECT tti.code, 
              SUM(CASE WHEN tti.action = 'B' THEN tti.volume ELSE 0 END) AS Mua, 
              SUM(CASE WHEN tti.action = 'S' THEN tti.volume ELSE 0 END) AS Ban,
              CASE WHEN SUM(CASE WHEN tti.action = 'S' THEN tti.volume ELSE 0 END) > 0 
                THEN SUM(CASE WHEN tti.action = 'B' THEN tti.volume ELSE 0 END) / SUM(CASE WHEN tti.action = 'S' THEN tti.volume ELSE 0 END) 
                ELSE NULL 
              END AS MB
        FROM tradeIntraday.dbo.tickerTransVNDIntraday tti
        INNER JOIN (
          SELECT code, MAX(date) AS maxDate
          FROM tradeIntraday.dbo.tickerTransVNDIntraday
          WHERE code IN (${codes.map((item) => `'${item}'`).join(',')})
          GROUP BY code
        ) maxDate ON tti.code = maxDate.code AND tti.date = maxDate.maxDate
        GROUP BY tti.code
      )
      SELECT f.code, f.floor, f.LV2, f.value AS totalVal, f.volume AS totalVol,       
             f.BVPS, f.EPS, f.beta, f.perChange5D AS perChangeW, f.perChange1M AS perChangeM, 
             f.marketCap, f.PB, f.PE, f.perChange1Y AS perChangeY, f.perChangeYTD AS perChangeYtD, 
             f.TinHieuChiBaoKyThuat AS tech, f.TinHieuDuongXuHuong AS trend, f.TinHieuTongHop AS overview,
             t.closePrice, t.perChange, r.netVal AS buyVal, r.netVol AS buyVol, 
             m.MB, m.Mua, m.Ban, 
             c.grossProfitMargin AS grossProfitMarginQuarter, 
             c.netProfitMargin AS netProfitMarginQuarter, 
             y.grossProfitMargin AS grossProfitMarginYear, 
             y.netProfitMargin AS netProfitMarginYear, 
             l.PRICE_HIGHEST_CR_52W, l.PRICE_LOWEST_CR_52W
      FROM VISUALIZED_DATA.dbo.filterResource f
      INNER JOIN LatestDate ld ON f.code = ld.code AND f.date = ld.maxDate
      LEFT JOIN marketTrade.dbo.tickerTradeVND t ON f.code = t.code AND t.type = 'STOCK' AND t.date = (SELECT MAX(date) FROM marketTrade.dbo.tickerTradeVND WHERE code = f.code)
      LEFT JOIN marketTrade.dbo.[foreign] r ON f.code = r.code AND r.type = 'STOCK' AND r.date = (SELECT MAX(date) FROM marketTrade.dbo.[foreign] WHERE code = f.code)
      LEFT JOIN MBChuDong m ON f.code = m.code
      LEFT JOIN LatestQuarter lq ON lq.code = f.code
      LEFT JOIN financialReport.dbo.calBCTC c ON c.code = f.code AND c.yearQuarter = lq.maxYearQuarter
      LEFT JOIN financialReport.dbo.calBCTC y ON y.code = f.code AND y.yearQuarter = (SELECT MAX(yearQuarter) FROM financialReport.dbo.calBCTC WHERE code = f.code AND RIGHT(yearQuarter, 1) = 0)
      LEFT JOIN min_max l ON l.code = f.code;
    `, `
      SELECT TickerTitle AS code, Title AS title, Date AS date, Img AS img, Href AS href 
      FROM macroEconomic.dbo.TinTuc 
      WHERE TickerTitle IN (${codes.map((item) => `'${item}'`).join(',')}) 
      ORDER BY Date DESC
    `, `
      WITH filtered_roae AS (
        SELECT code, ROE AS roae, ROA AS roaa, yearQuarter, ROW_NUMBER() OVER (PARTITION BY code ORDER BY yearQuarter DESC) AS rn
        FROM RATIO.dbo.ratioInYearQuarter
        WHERE RIGHT(yearQuarter, 1) <> '0' AND code in (${codes.map((item) => `'${item}'`).join(',')})
      )
      SELECT code, SUM(roaa) AS ROA, SUM(roae) AS ROE
      FROM filtered_roae
      WHERE rn <= 4
      GROUP BY code;
    `];
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

      const [data, data_news, data_4] = await Promise.all([
        this.watchListRepo.query(query[0]),
        this.watchListRepo.query(query[1]),
        this.watchListRepo.query(query[2]),
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
          ...data_4.find((roa) => roa.code == item.code),
        })),
      );
    } catch (e) {
      throw new CatchException(e);
    }
  }

  async watchListDataStock(code: string) {
    try {
      let isInTime = this.isInTime();

      const query = this.queryDataWatchList([code]);

      const [data, data_news, data_4] = await Promise.all([
        this.watchListRepo.query(query[0]),
        this.watchListRepo.query(query[1]),
        this.watchListRepo.query(query[2]),
      ]);

      const mappedData = {
        ...data[0],
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
        news: data_news.map((new_item) => ({
          title: new_item.title,
          href: new_item.href,
          img: new_item.img,
          date: UtilCommonTemplate.toDate(new_item.date),
        })),
        ...data_4[0],
      };

      return new WatchListDataResponse(mappedData);
    } catch (e) {
      throw new CatchException(e);
    }
  }
}
