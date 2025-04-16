import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Cache } from 'cache-manager';
import * as moment from 'moment';
import * as calTech from 'technicalindicators';
import * as _ from 'lodash';
import { DataSource } from 'typeorm';
import { DB_SERVER } from '../constants';
import { TimeToLive } from '../enums/common.enum';
import { RedisKeys } from '../enums/redis-keys.enum';
import { CatchException } from '../exceptions/common.exception';
import { InterestRateResponse } from '../macro/responses/interest-rate.response';
import { MinioOptionService } from '../minio/minio.service';
import { MssqlService } from '../mssql/mssql.service';
import {
  isDecrease,
  isEqual,
  isHigh,
  isIncrease,
  isLow,
} from '../stock/processes/industry-data-child';
import { IndustryResponse } from '../stock/responses/Industry.response';
import { InvestorTransactionRatioResponse } from '../stock/responses/InvestorTransactionRatio.response';
import { StockService } from '../stock/stock.service';
import { UtilCommonTemplate } from '../utils/utils.common';
import { INews } from './dto/save-news.dto';
import { ISaveStockRecommendWeek } from './dto/saveStockRecommendWeek.dto';
import { SetFlexiblePageDto } from './dto/setFlexiblePage.dto';
import { SetInfoReportTechnicalDto } from './dto/setInfoReportTechnical.dto';
import {
  AfternoonReport1,
  IStockContribute,
} from './response/afternoonReport1.response';
import { BuyingAndSellingStatisticsResponse } from './response/buyingAndSellingStatistics.response';
import { EventResponse } from './response/event.response';
import { ExchangeRateResponse } from './response/exchangeRate.response';
import { ExchangeRateUSDEURResponse } from './response/exchangeRateUSDEUR.response';
import { GetStockRecommendWeekResponse } from './response/getStockRecommendWeek.response';
import { ReportIndexResponse } from './response/index.response';
import { LiquidityMarketResponse } from './response/liquidityMarket.response';
import { MerchandiseResponse } from './response/merchandise.response';
import { MorningResponse } from './response/morning.response';
import { ITop, MorningHoseResponse } from './response/morningHose.response';
import { NewsEnterpriseResponse } from './response/newsEnterprise.response';
import { NewsInternationalResponse } from './response/newsInternational.response';
import {
  AfterNoonReport2Response,
  StockMarketResponse,
} from './response/stockMarket.response';
import { TopScoreResponse } from './response/topScore.response';
import { TransactionValueFluctuationsResponse } from './response/transactionValueFluctuations.response';
import { BuySellActiveResponse } from './response/buySellActive.response';
@Injectable()
export class ReportService {
  constructor(
    private readonly mssqlService: MssqlService,
    @Inject(CACHE_MANAGER)
    private readonly redis: Cache,
    private readonly minio: MinioOptionService,
    private readonly stockService: StockService,
    @InjectDataSource(DB_SERVER) private readonly dbServer: DataSource,
  ) {}
  async getIndex() {
    const redisData = await this.redis.get(RedisKeys.reportIndex);
    if (redisData) return redisData;

    const now = moment().format('YYYY-MM-DD');
    const week = moment().subtract(7, 'day').format('YYYY-MM-DD');

    const date = moment(
      (
        await this.mssqlService.query(
          `select top 1 date from marketTrade.dbo.indexTradeVND where date <= '${moment()
            .subtract(1, 'day')
            .format('YYYY-MM-DD')}'`,
        )
      )[0].date,
    ).format('YYYY-MM-DD');
    const month = moment(
      (
        await this.mssqlService.query(
          `select top 1 date from marketTrade.dbo.indexTradeVND where date <= '${moment()
            .subtract(1, 'month')
            .format('YYYY-MM-DD')}'`,
        )
      )[0].date,
    ).format('YYYY-MM-DD');
    const year = moment(
      (
        await this.mssqlService.query(
          `select top 1 date from marketTrade.dbo.indexTradeVND where date >= '${moment()
            .month(0)
            .date(1)
            .format('YYYY-MM-DD')}' order by date asc`,
        )
      )[0].date,
    ).format('YYYY-MM-DD');

    const query = `
      WITH temp
      AS (SELECT
        code,
        closePrice,
        date
      FROM marketTrade.dbo.indexTradeVND
      WHERE code IN ('VNINDEX', 'HNX', 'UPCOM', 'VN30', 'HNX30')
      AND date IN ('${now}', '${date}', '${week}', '${month}', '${year}')),
      pivotted
      AS (SELECT
        code,
        [${now}] AS now,
        [${date}] AS date,
        [${week}] AS week,
        [${month}] AS month,
        [${year}] AS year
      FROM (SELECT
        *
      FROM temp) AS source PIVOT (SUM(closePrice) FOR date IN ([${now}], [${date}], [${week}], [${month}], [${year}])) AS chuyen),
      gtnn
      AS (SELECT
        code,
        buyVal AS buy,
        sellVal AS sell,
        netVal AS net
      FROM marketTrade.dbo.[foreign]
      WHERE code IN ('VNINDEX', 'HNX', 'UPCOM', 'VN30', 'HNX30')
      AND date = '${now}')
      SELECT
        pivotted.code,
        ((now - date) / date) * 100 AS d_value,
        ((now - week) / week) * 100 AS w_value,
        ((now - month) / month) * 100 AS m_value,
        ((now - year) / year) * 100 AS y_value,
        buy,
        sell,
        net
      FROM pivotted
      LEFT JOIN gtnn
        ON gtnn.code = pivotted.code
    `;
    const data = await this.mssqlService.query<ReportIndexResponse[]>(query);
    const dataMapped = ReportIndexResponse.mapToList(data);
    await this.redis.set(RedisKeys.reportIndex, dataMapped, {
      ttl: TimeToLive.HaftMinute,
    });
    return dataMapped;
  }

  async uploadFile(file: any[]) {
    for (const item of file) {
      await this.minio.put(
        `resources`,
        `stock/${item.originalname}`,
        item.buffer,
        {
          'Content-Type': item.mimetype,
          'X-Amz-Meta-Testing': 1234,
        },
      );
    }
    return 'success';
  }

  async uploadFileReport(file: any[]) {
    const now = moment().format('DD-MM-YYYY');

    for (const item of file) {
      await this.minio.put(
        `report`,
        `${now}/${UtilCommonTemplate.removeVietnameseString(
          item.originalname,
        )}`,
        item.buffer,
        {
          'Content-Type': item.mimetype,
          'X-Amz-Meta-Testing': 1234,
        },
      );
    }
    return;
  }

  async newsInternational(quantity: number, type: number) {
    try {
      let data = [];
      if (!type) {
        data = await this.mssqlService.query<NewsInternationalResponse[]>(`
        select distinct top ${
          quantity || 7
        } Title as title, Href as href, Date, SubTitle as sub_title from macroEconomic.dbo.TinTucQuocTe order by Date desc
        `);
      } else {
        data =
          (await this.redis.get(RedisKeys.weekNewsInternationalNotFilter)) ||
          [];
      }

      const dataMapped = NewsInternationalResponse.mapToList(data);
      return dataMapped;
    } catch (e) {
      throw new CatchException(e);
    }
  }

  async newsDomestic(quantity: number, type: number) {
    try {
      let data = [];
      if (!type) {
        data = await this.mssqlService.query<NewsInternationalResponse[]>(`
        select distinct top ${
          quantity || 6
        } Title as title, Href as href, Date, SubTitle as sub_title from macroEconomic.dbo.TinTucViMo order by Date desc
        `);
      } else {
        data =
          (await this.redis.get(RedisKeys.weekNewsDomesticNotFilter)) || [];
      }
      const dataMapped = NewsInternationalResponse.mapToList(data);
      return dataMapped;
    } catch (e) {
      throw new CatchException(e);
    }
  }

  async newsEnterprise(quantity: number) {
    try {
      const data = await this.mssqlService.query<NewsEnterpriseResponse[]>(`
      select distinct top ${
        quantity || 9
      } TickerTitle as ticker, Title as title, Href as href, Date from macroEconomic.dbo.TinTuc where TickerTitle != '' order by Date desc
      `);
      const dataMapped = NewsEnterpriseResponse.mapToList(data);
      return dataMapped;
    } catch (e) {
      throw new CatchException(e);
    }
  }

  async event() {
    try {
      const data = await this.mssqlService.query<EventResponse[]>(`
      select distinct top 15 ticker, i.floor, NoiDungSuKien as title, NgayGDKHQ as date, NgayDKCC, NgayThucHien from PHANTICH.dbo.LichSukien l 
      inner join marketInfor.dbo.info i on i.code = l.ticker
       order by NgayGDKHQ desc`);
      const dataMapped = EventResponse.mapToList(data);
      return dataMapped;
    } catch (e) {
      throw new CatchException(e);
    }
  }

  // Helper functions
  private async getLatestAndPreviousDate(tableName: string, schema = 'WEBSITE_SERVER.dbo') {
    // Get latest date
    const latestDateQuery = `select top 1 date from ${schema}.${tableName} order by date desc`;
    const latestDateResult = (await this.mssqlService.query(latestDateQuery)) as any[];
    if (!latestDateResult?.length) {
      throw new Error('No data found for latest date');
    }

    const now = moment(latestDateResult[0].date).format('YYYY-MM-DD');
    
    // Get previous date
    const prevDateQuery = `
      with date_ranges as (
        select max(case when date <= '${moment(now).subtract(1, 'day').format('YYYY-MM-DD')}' then date else null end) as prev
        from ${schema}.${tableName}
      )
      select prev from date_ranges;
    `;
    const prevDateResult = (await this.mssqlService.query(prevDateQuery)) as any[];
    if (!prevDateResult?.length) {
      throw new Error('No data found for previous date');
    }

    const prev = moment(prevDateResult[0].prev).format('YYYY-MM-DD');
    return { now, prev };
  }

  private buildCommonPriceComparisonCTE(now: string, prev: string, topStocksCTE: string) {
    return `
      WITH ${topStocksCTE},
      StockData AS (
        SELECT t.code, t.closePrice, t.date, t.totalVal, t.totalVol
        FROM marketTrade.dbo.tickerTradeVND t
        WHERE t.date IN ('${now}', '${prev}') 
        AND t.code IN (SELECT code FROM Top5Stock)
      ),
      PriceComparison AS (
        SELECT s.code,
          MAX(CASE WHEN s.date = '${now}' THEN s.closePrice END) AS price_today,
          MAX(CASE WHEN s.date = '${prev}' THEN s.closePrice END) AS price_yesterday,
          MAX(CASE WHEN s.date = '${now}' THEN s.totalVal END) AS totalVal,
          MAX(CASE WHEN s.date = '${now}' THEN s.totalVol END) AS totalVol
        FROM StockData s
        GROUP BY s.code
      )
    `;
  }

  async topContributingStocks() {
    try {
      const { now, prev } = await this.getLatestAndPreviousDate('CPAH');

      const buildTopStocksQuery = (orderDirection: 'DESC' | 'ASC') => {
        const topStocksCTE = `
          Top5Stock AS (
            SELECT TOP 5 c.symbol AS code, c.point
            FROM WEBSITE_SERVER.dbo.CPAH c
            WHERE c.date = '${now}' 
            AND c.floor = 'HSX'
            ORDER BY c.point ${orderDirection}
          )
        `;

        return `
          ${this.buildCommonPriceComparisonCTE(now, prev, topStocksCTE)}
          SELECT 
            p.code, 
            p.price_today * 1000  AS price, 
            (p.price_today - p.price_yesterday) / NULLIF(p.price_yesterday, 0) * 100 AS day, 
            t.point, 
            p.totalVal / 1000000000 AS value, 
            p.totalVol AS volume
          FROM PriceComparison p
          JOIN Top5Stock t ON p.code = t.code
          WHERE p.price_today IS NOT NULL AND p.price_yesterday IS NOT NULL
          ORDER BY t.point ${orderDirection};
        `;
      };
      
      const [stock_advance, stock_decline] = await Promise.all([
        this.mssqlService.query(buildTopStocksQuery('DESC')),
        this.mssqlService.query(buildTopStocksQuery('ASC'))
      ]);
      
      return { stock_advance, stock_decline };
    } catch (error) {
      throw new CatchException(error);
    }
  }

  async topNetBuySell(tableType: number, floor: string) {
    try {
      const { now, prev } = await this.getLatestAndPreviousDate(tableType == 0 ? '[foreign]' : '[proprietary]', 'marketTrade.dbo');

      const buildTopStocksQuery = (orderDirection: 'DESC' | 'ASC', compareType: '>' | '<') => {
        const tableName = tableType == 0 ? '[foreign]' : '[proprietary]';
        const topStocksCTE = `
          Top5Stock AS (
            SELECT TOP 5 code, netVal, date
            FROM marketTrade.dbo.${tableName}
            WHERE type = 'STOCK' AND date = '${now}' AND floor = '${floor}' AND netVal ${compareType} 0
            ORDER BY netVal ${orderDirection}
          )
        `;

        return `
          ${this.buildCommonPriceComparisonCTE(now, prev, topStocksCTE)}
          SELECT 
            p.code, 
            p.price_today * 1000 AS price, 
            (p.price_today - p.price_yesterday) / NULLIF(p.price_yesterday, 0) * 100 AS day, 
            t.netVal / 1000000000 as point, 
            p.totalVal / 1000000000 AS value, 
            p.totalVol AS volume,
            t.date
          FROM PriceComparison p
          JOIN Top5Stock t ON p.code = t.code
          WHERE p.price_today IS NOT NULL AND p.price_yesterday IS NOT NULL
          ORDER BY t.netVal ${orderDirection};
        `;
      };

      const [buy, sell] = await Promise.all([
        this.mssqlService.query(buildTopStocksQuery('DESC', '>')),
        this.mssqlService.query(buildTopStocksQuery('ASC', '<'))
      ]);
      
      return { buy, sell };
    } catch (error) {
      throw new CatchException(error);
    }
  }

  async topSuddenVol() {
    try {
      const { now, prev } = await this.getLatestAndPreviousDate('tickerTradeVND', 'marketTrade.dbo');

      const buildTopStocksQuery = (compareType: '>' | '<') => {
        const topStocksCTE = `
          Top5Stock AS (
            SELECT code, closePrice, totalVol
            FROM marketTrade.dbo.tickerTradeVND
            WHERE floor = 'HOSE' AND type = 'STOCK' AND date = '${now}' AND totalVol > 200000 AND perChange ${compareType} 0
          ),
          ranked_trades AS (
            SELECT code, totalVol, date, ROW_NUMBER() OVER (PARTITION BY code ORDER BY date DESC) AS rn 
            FROM marketTrade.dbo.tickerTradeVND 
            WHERE type = 'STOCK' and code IN (SELECT code FROM Top5Stock)
          ),
          average_volumes AS (
            SELECT code, AVG(CASE WHEN rn <= 20 THEN totalVol END) AS avg_totalVol_20d FROM ranked_trades GROUP BY code
          )
        `;

        return `
          ${this.buildCommonPriceComparisonCTE(now, prev, topStocksCTE)}
          SELECT TOP 5
            p.code, 
            p.price_today * 1000  AS price, 
            (p.price_today - p.price_yesterday) / NULLIF(p.price_yesterday, 0) * 100 AS day, 
            p.totalVol / avger.avg_totalVol_20d as point, 
            p.totalVal / 1000000000 AS value, 
            p.totalVol AS volume
          FROM PriceComparison p
          JOIN Top5Stock t ON p.code = t.code
          JOIN average_volumes avger ON p.code = avger.code
          WHERE p.price_today IS NOT NULL AND p.price_yesterday IS NOT NULL
          ORDER BY p.totalVol / avger.avg_totalVol_20d DESC;
        `;
      };
      
      const [desc, asc] = await Promise.all([
        this.mssqlService.query(buildTopStocksQuery('>')),
        this.mssqlService.query(buildTopStocksQuery('<'))
      ]);

      return { desc, asc };
    } catch (error) {
      throw new CatchException(error);
    }
  }

  async topBuySellActive(floor: string) {
    try {
      const { now, prev } = await this.getLatestAndPreviousDate('tickerTransVNDIntraday', 'tradeIntraday.dbo');

      const query = `
        WITH FloorStocks AS (
          SELECT code 
          FROM marketInfor.dbo.info 
          WHERE floor = '${floor}' AND status = 'listed' AND type = 'STOCK'
        ),
        StockData AS (
          SELECT t.code,
              MAX(CASE WHEN t.date = '${now}' THEN t.closePrice END) AS price_today,
              MAX(CASE WHEN t.date = '${prev}' THEN t.closePrice END) AS price_yesterday,
              MAX(CASE WHEN t.date = '${now}' THEN t.totalVal END) AS totalVal,
              MAX(CASE WHEN t.date = '${now}' THEN t.totalVol END) AS totalVol
          FROM marketTrade.dbo.tickerTradeVND t
          INNER JOIN FloorStocks fs ON t.code = fs.code
          WHERE t.date IN ('${now}', '${prev}')
          GROUP BY t.code
          HAVING MAX(CASE WHEN t.date = '${now}' THEN t.totalVol END) > 200000  -- Lọc totalVol trước
        ),
        MBChuDong AS (
          SELECT 
              tti.code, 
              SUM(CASE WHEN tti.action = 'B' THEN tti.volume ELSE 0 END) AS Mua, 
              SUM(CASE WHEN tti.action = 'S' THEN tti.volume ELSE 0 END) AS Ban,
              CASE 
                  WHEN SUM(CASE WHEN tti.action = 'S' THEN tti.volume ELSE 0 END) > 0 
                  THEN SUM(CASE WHEN tti.action = 'B' THEN tti.volume ELSE 0 END) / SUM(CASE WHEN tti.action = 'S' THEN tti.volume ELSE 0 END) 
                  ELSE NULL 
              END AS MB,
              CASE 
                  WHEN SUM(CASE WHEN tti.action = 'B' THEN tti.volume ELSE 0 END) > 0 
                  THEN SUM(CASE WHEN tti.action = 'S' THEN tti.volume ELSE 0 END) / SUM(CASE WHEN tti.action = 'B' THEN tti.volume ELSE 0 END) 
                  ELSE NULL 
              END AS BM
          FROM tradeIntraday.dbo.tickerTransVNDIntraday tti
          INNER JOIN StockData sd ON tti.code = sd.code  -- Chỉ lấy những mã đã lọc
          WHERE tti.date = (SELECT MAX(date) FROM tradeIntraday.dbo.tickerTransVNDIntraday)
          GROUP BY tti.code, tti.date
        ),
        TopStocks AS (
          SELECT code, MB as point, 'MB' as type
          FROM (SELECT TOP 5 code, MB FROM MBChuDong WHERE MB IS NOT NULL ORDER BY MB DESC) AS topMB
          UNION ALL
          SELECT code, BM as point, 'BM' as type
          FROM (SELECT TOP 5 code, BM FROM MBChuDong WHERE BM IS NOT NULL ORDER BY BM DESC) AS topBM
        )
        SELECT ts.code, ts.point, ts.type,
            COALESCE(sd.price_today * 1000, 0) AS price,
            COALESCE((sd.price_today - sd.price_yesterday) / NULLIF(sd.price_yesterday, 0) * 100, 0) AS day,
            COALESCE(sd.totalVal / 1000000000, 0) AS value,
            COALESCE(sd.totalVol, 0) AS volume
        FROM TopStocks ts
        LEFT JOIN StockData sd ON ts.code = sd.code
        ORDER BY ts.type, ts.point DESC;
      `;
      
      const data = await this.mssqlService.query<BuySellActiveResponse[]>(query);

      return data.reduce<{ MB: BuySellActiveResponse[]; BM: BuySellActiveResponse[] }>(
        (acc, item) => {
          acc[item.type].push({
            code: item.code,
            point: item.point,
            price: item.price,
            day: item.day,
            value: item.value,
            volume: item.volume,
            type: item.type
          });
          return acc;
        },
        { MB: [], BM: [] }
      );
    } catch (error) {
      throw new CatchException(error);
    }
  }

  async exchangeRate() {
    try {
      const now = moment((await this.mssqlService.query(`select top 1 date from macroEconomic.dbo.exchangeRateVCB order by date desc`))[0].date).format('YYYY-MM-DD');
      const date = await this.mssqlService.query(`
        with date_ranges as (
          select max(case when date <= '${moment(now).subtract(1, 'day').format('YYYY-MM-DD')}' then date else null end) as prev,
                  max(case when date <= '${moment(now).subtract(1, 'week').format('YYYY-MM-DD')}' then date else null end) as week,
                  max(case when date <= '${moment(now).subtract(1, 'month').format('YYYY-MM-DD')}' then date else null end) as month,
                  max(case when date <= '${moment(now).startOf('year').format('YYYY-MM-DD')}' then date else null end) as ytd,
                  max(case when date <= '${moment(now).subtract(1, 'year').format('YYYY-MM-DD')}' then date else null end) as yoy
          from macroEconomic.dbo.exchangeRateVCB
        )
        select prev, week, month, ytd, yoy
        from date_ranges;
      `);
      const prev = moment(date[0].prev).format('YYYY-MM-DD');
      const month = moment(date[0].month).format('YYYY-MM-DD');
      const week = moment(date[0].week).format('YYYY-MM-DD');
      const ytd = moment(date[0].ytd).format('YYYY-MM-DD');
      const yoy = moment(date[0].yoy).format('YYYY-MM-DD');

      const same_day = UtilCommonTemplate.checkSameDate([now, prev, month, ytd, week, yoy]);
      const pivot = same_day.map((item) => `[${item}]`).join(',');

      const code = `'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'SGD', 'CAD', 'HKD'`;
      const sort = UtilCommonTemplate.generateSortCase(code, 'code');

      const query = `
        WITH temp AS (
          SELECT date, code, bySell, ${sort}
          FROM macroEconomic.dbo.exchangeRateVCB
          WHERE code IN (${code})
          AND date IN ('${now}', '${prev}', '${week}', '${ytd}', '${month}', '${yoy}')
        )
        SELECT code, 
              [${now}] AS price, 
              ([${now}] - [${prev}]) / [${prev}] * 100 AS day, 
              ([${now}] - [${week}]) / [${week}] * 100 AS week, 
              ([${now}] - [${month}]) / [${month}] * 100 AS month, 
              ([${now}] - [${ytd}]) / [${ytd}] * 100 AS ytd,
              ([${now}] - [${yoy}]) / [${yoy}] * 100 AS yoy
        FROM temp AS source PIVOT (SUM(bySell) FOR date IN (${pivot})) AS chuyen
      `;
      
      const data = await this.mssqlService.query<ExchangeRateResponse[]>(query);
      const dataMapped = ExchangeRateResponse.mapToList(data);
      return dataMapped;
    } catch (e) {
      throw new CatchException(e);
    }
  }

  async merchandise() {
    try {
      const name = `N'Dầu Brent', N'Dầu Thô', N'Vàng', N'Cao su', N'Đường', N'Khí Gas', N'Thép', N'Xăng'`;
      const sort = UtilCommonTemplate.generateSortCase(name, 't2.name');

      const query = `
        with temp as (select name, price,
                date,
                unit,
                DATEADD(MONTH, -1, date) as month,
                DATEADD(WEEK, -1, date) as week,
                DATEADD(YEAR, -1, date) as year,
                DATEFROMPARTS(YEAR(date) - 1, 12, 31) AS ytd
        from macroEconomic.dbo.HangHoa
        where name in (${name}) and id is not null
        ),
        temp_2 as (SELECT
            name,
          price,
          unit,
          date,
          lead(price) over (partition by name order by date desc) as day,
          lead(date) over (partition by name order by date desc) as day_d,
          (select top 1 price from macroEconomic.dbo.HangHoa where date = (select max(date) from macroEconomic.dbo.HangHoa where date <= week and name = temp.name) and name = temp.name) as week,
          (select max(date) from macroEconomic.dbo.HangHoa where date <= week and name = temp.name) as week_d,
          (select top 1 price from macroEconomic.dbo.HangHoa where date = (select max(date) from macroEconomic.dbo.HangHoa where date <= month and name = temp.name) and name = temp.name) as month,
          (select max(date) from macroEconomic.dbo.HangHoa where date <= month and name = temp.name) as month_d,
          (select top 1 price from macroEconomic.dbo.HangHoa where date = (select max(date) from macroEconomic.dbo.HangHoa where date <= year and name = temp.name) and name = temp.name) as year,
          (select max(date) from macroEconomic.dbo.HangHoa where date <= year and name = temp.name) as year_d,
          (select top 1 price from macroEconomic.dbo.HangHoa where date = (select max(date) from macroEconomic.dbo.HangHoa where date <= ytd and name = temp.name) and name = temp.name) as ytd,
          (select max(date) from macroEconomic.dbo.HangHoa where date <= ytd and name = temp.name) as year_to_date_d
        FROM
          temp),
        temp_3 as (
          SELECT
          MAX(date) AS date,
          name
        FROM macroEconomic.dbo.HangHoa
        WHERE unit != ''
        GROUP BY name
        )
        select
            t2.name + ' (' + t2.unit + ')' AS name,
            t2.date,
            price,
                (price - day) / day * 100 as day,
                (price - week) / week * 100 as week,
                (price - month) / month * 100 as month,
                (price - year) / year * 100 as year,
                (price - ytd) / ytd * 100 as ytd,
                ${sort}
                from temp_2 t2
                inner join temp_3 t3 on t3.name = t2.name and t3.date = t2.date
        order by row_num
      `;

      const data = await this.mssqlService.query<MerchandiseResponse[]>(query);
      const dataMapped = MerchandiseResponse.mapToList(data);
      return dataMapped;
    } catch (e) {
      throw new CatchException(e);
    }
  }

  async interestRate() {
    try {
      const code = `N'Qua đêm', N'1 tuần', N'2 tuần', N'1 tháng', N'3 tháng'`;
      const sort = UtilCommonTemplate.generateSortCase(code, 'code');

      const now = moment((await this.mssqlService.query(`select top 1 date from macroEconomic.dbo.EconomicVN_byTriVo order by date desc`))[0].date).format('YYYY-MM-DD');
      
      const date = await this.mssqlService.query(`
        with date_ranges as (
          select max(case when date <= '${moment(now).subtract(1, 'day').format('YYYY-MM-DD')}' then date else null end) as prev,
                  max(case when date <= '${moment(now).subtract(1, 'week').format('YYYY-MM-DD')}' then date else null end) as week,
                  max(case when date <= '${moment(now).subtract(1, 'month').format('YYYY-MM-DD')}' then date else null end) as month,
                  max(case when date <= '${moment(now).startOf('year').format('YYYY-MM-DD')}' then date else null end) as ytd,
                  max(case when date <= '${moment(now).subtract(1, 'year').format('YYYY-MM-DD')}' then date else null end) as yoy
          from macroEconomic.dbo.EconomicVN_byTriVo
        )
        select prev, week, month, ytd, yoy
        from date_ranges;
      `);
      const prev = moment(date[0].prev).format('YYYY-MM-DD');
      const month = moment(date[0].month).format('YYYY-MM-DD');
      const week = moment(date[0].week).format('YYYY-MM-DD');
      const ytd = moment(date[0].ytd).format('YYYY-MM-DD');
      const yoy = moment(date[0].yoy).format('YYYY-MM-DD');

      const same_day = UtilCommonTemplate.checkSameDate([now, prev, month, ytd, week, yoy]);
      const pivot = same_day.map((item) => `[${item}]`).join(',');

      const query = `
        WITH temp AS (
          SELECT date, code, value, ${sort}
          FROM macroEconomic.dbo.EconomicVN_byTriVo
          WHERE date IN ('${now}', '${prev}', '${week}', '${month}', '${ytd}', '${yoy}') AND code IN (N'Qua đêm', N'1 tuần', N'2 tuần', N'1 tháng', N'3 tháng')
        )
        SELECT code, 
               [${now}] AS price, 
               ([${now}] - [${prev}]) / [${prev}] * 100 AS day, 
               ([${now}] - [${week}]) / [${week}] * 100 AS week, 
               ([${now}] - [${month}]) / [${month}] * 100 AS month, 
               ([${now}] - [${ytd}]) / [${ytd}] * 100 AS ytd,
               ([${now}] - [${yoy}]) / [${yoy}] * 100 AS yoy
        FROM temp PIVOT (SUM(value) FOR date IN (${pivot})) AS chuyen
      `;

      const data = await this.mssqlService.query<ExchangeRateResponse[]>(query);
      const dataMapped = ExchangeRateResponse.mapToList(data);
      return dataMapped;
    } catch (e) {
      throw new CatchException(e);
    }
  }

  async stockMarket(type: number) {
    //0 - sáng, 1 - tuần
    try {
      let index = '';
      switch (+type) {
        case 0: //sáng
          index = `
          'VNINDEX', 'VN30', 'HNX', 'UPCOM', 'Dow Jones', 'Nikkei 225', 'Shanghai', 'FTSE 100'
          `;
          break;
        case 1: //tuần
          index = `
        'VNINDEX', 'Dow Jones', 'Nikkei 225', 'Shanghai', 'FTSE 100', 'DAX', 'STI', 'KLCI', 'IDX', 'SET', 'PSEI', 'Dollar Index', 'Dollar Index', 'U.S.10Y'      
        `;
          break;
        case 2: //tuần trang 3
          index = `'VNINDEX', 'VN30', 'VNMID'`;
          break;
        default:
          break;
      }

      const sort = UtilCommonTemplate.generateSortCase(index, 't2.code');
      const query = `
      with temp as (select name as code, closePrice,
        date,
        DATEADD(MONTH, -1, date) as month,
        DATEADD(WEEK, -1, date) as week,
        DATEADD(YEAR, -1, date) as year,
        DATEFROMPARTS(YEAR(date) - 1, 12, 31) AS ytd,
        1 as id
      from macroEconomic.dbo.WorldIndices
      union all
      select code, closePrice,
              date,
              DATEADD(MONTH, -1, date) as month,
              DATEADD(WEEK, -1, date) as week,
              DATEADD(YEAR, -1, date) as year,
              DATEFROMPARTS(YEAR(date) - 1, 12, 31) AS ytd,
              0 as id
      from marketTrade.dbo.indexTradeVND
      ),
      temp_2 as (SELECT
          code,
        closePrice,
        date,
        lead(closePrice) over (partition by code order by date desc) as day,
        lead(date) over (partition by code order by date desc) as day_d,
        case when id = 1 then (select top 1 closePrice from macroEconomic.dbo.WorldIndices where date = (select max(date) from macroEconomic.dbo.WorldIndices where date <= week and name = temp.code) and name = temp.code)
            when id = 0 then
            (select top 1 closePrice from marketTrade.dbo.indexTradeVND where date = (select max(date) from marketTrade.dbo.indexTradeVND where date <= week and code = temp.code) and code = temp.code)
            end as week,
        case when id = 1 then (select max(date) from macroEconomic.dbo.WorldIndices where date <= week and name = temp.code)
            when id = 0 then (select max(date) from marketTrade.dbo.indexTradeVND where date <= week and code = temp.code)
            end as week_d,
        case when id = 1 then (select top 1 closePrice from macroEconomic.dbo.WorldIndices where date = (select max(date) from macroEconomic.dbo.WorldIndices where date <= month and name = temp.code) and name = temp.code)
            when id = 0 then
            (select top 1 closePrice from marketTrade.dbo.indexTradeVND where date = (select max(date) from marketTrade.dbo.indexTradeVND where date <= month and code = temp.code) and code = temp.code)
            end as month,
        case when id = 1 then (select max(date) from macroEconomic.dbo.WorldIndices where date <= month and name = temp.code)
            when id = 0 then (select max(date) from marketTrade.dbo.indexTradeVND where date <= month and code = temp.code)
            end as month_d,
        case when id = 1 then (select top 1 closePrice from macroEconomic.dbo.WorldIndices where date = (select max(date) from macroEconomic.dbo.WorldIndices where date <= year and name = temp.code) and name = temp.code)
            when id = 0 then
            (select top 1 closePrice from marketTrade.dbo.indexTradeVND where date = (select max(date) from marketTrade.dbo.indexTradeVND where date <= year and code = temp.code) and code = temp.code)
            end as year,
        case when id = 1 then (select max(date) from macroEconomic.dbo.WorldIndices where date <= year and name = temp.code)
            when id = 0 then (select max(date) from marketTrade.dbo.indexTradeVND where date <= year and code = temp.code)
            end as year_d,
        case when id = 1 then (select top 1 closePrice from macroEconomic.dbo.WorldIndices where date = (select max(date) from macroEconomic.dbo.WorldIndices where date <= ytd and name = temp.code) and name = temp.code)
            when id = 0 then
            (select top 1 closePrice from marketTrade.dbo.indexTradeVND where date = (select max(date) from marketTrade.dbo.indexTradeVND where date <= ytd and code = temp.code) and code = temp.code)
            end as ytd,
        case when id = 1 then (select max(date) from macroEconomic.dbo.WorldIndices where date <= ytd and name = temp.code)
            when id = 0 then (select max(date) from marketTrade.dbo.indexTradeVND where date <= ytd and code = temp.code)
            end as year_to_date_d
      FROM
        temp),
        temp_3 as (
          select max(date) as date, code from temp_2 group by code
      )
      select
          t2.code,
          t2.date,
          closePrice as price,
              (closePrice - day) / day * 100 as day,
              (closePrice - week) / week * 100 as week,
              (closePrice - month) / month * 100 as month,
              (closePrice - year) / year * 100 as year,
              (closePrice - ytd) / ytd * 100 as ytd,
              ${sort}
              from temp_2 t2
              inner join temp_3 t3 on t3.code = t2.code and t3.date = t2.date
              where t2.code in (${index})
              order by row_num asc
      `;

      const data = await this.mssqlService.query<StockMarketResponse[]>(query);
      const dataMapped = StockMarketResponse.mapToList(data);
      return dataMapped;
    } catch (e) {
      throw new CatchException(e);
    }
  }

  async morning() {
    try {
      const index = `'VNINDEX', 'HNX', 'UPCOM', 'VN30'`;
      const sort = UtilCommonTemplate.generateSortCase(index, 'code');

      const query = `
      SELECT
        code,
        timeInday AS time,
        closePrice as price,
        change,
        perChange,
        ${sort}
      FROM tradeIntraday.dbo.indexTradeVNDIntraday
      WHERE code IN (${index})
      AND date = (SELECT TOP 1
        date
      FROM tradeIntraday.dbo.indexTradeVNDIntraday
      ORDER BY date DESC)
      AND timeInday >= '09:15:00'
      AND timeInday <= '11:33:00'
      ORDER BY row_num ASC, timeInday DESC
      `;
      const query_2 = `
      WITH temp
      AS (SELECT
        LEAD(closePrice) OVER (PARTITION BY code ORDER BY date DESC) AS prevClosePrice,
        code,
        date
      FROM marketTrade.dbo.indexTradeVND
      WHERE code IN ('VNINDEX', 'HNX', 'UPCOM', 'VN30'))
      SELECT
        *
      FROM temp
      WHERE date = (SELECT
        MAX(date)
      FROM temp)
      `;

      const [data, data_2] = await Promise.all([
        this.mssqlService.query<any[]>(query),
        this.mssqlService.query<any[]>(query_2),
      ]);

      const reduceData = data.reduce((result, cur) => {
        const index = result.findIndex((item) => item.code == cur.code);
        if (index == -1) {
          result.push({
            code: cur.code,
            change: cur.change,
            perChange: cur.perChange,
            prevClosePrice: data_2.find((item) => item.code == cur.code)
              .prevClosePrice,
            chart: [
              {
                time: UtilCommonTemplate.changeDateUTC(cur.time),
                value: cur.price,
              },
            ],
          });
        } else {
          result[index].chart.unshift({
            time: UtilCommonTemplate.changeDateUTC(cur.time),
            value: cur.price,
          });
        }
        return result;
      }, []);
      const dataMapped = MorningResponse.mapToList(reduceData);
      return dataMapped;
    } catch (e) {
      throw new CatchException(e);
    }
  }

  async morningHose() {
    try {
      //Độ rộng vs khối ngoại
      const promise_1 = this.mssqlService.query(`
      WITH breath
      AS (SELECT TOP 1
        noChange,
        decline,
        advance,
        'HOSE' AS code
      FROM WEBSITE_SERVER.dbo.MarketBreadth
      ORDER BY time DESC),
      net
      AS (SELECT TOP 1
        netVal,
        'HOSE' AS code
      FROM marketTrade.dbo.[foreign]
      WHERE code = 'VNINDEX'
      ORDER BY date DESC)
      SELECT
        *
      FROM breath b
      INNER JOIN net n
        ON n.code = b.code
      `);

      //Top mua ròng
      const promise_2 = this.mssqlService.query<ITop[]>(`
      SELECT TOP 4
        code, netVal
      FROM marketTrade.dbo.[foreign]
      WHERE type IN ('STOCK', 'ETF')
      AND date = (SELECT
        MAX(date)
      FROM marketTrade.dbo.[foreign])
      AND floor = 'HOSE'
      AND netVal > 0
      ORDER BY netVal DESC
      `);

      //Top bán ròng
      const promise_3 = this.mssqlService.query<ITop[]>(`
      SELECT TOP 4
        code, netVal
      FROM marketTrade.dbo.[foreign]
      WHERE type IN ('STOCK', 'ETF')
      AND date = (SELECT
        MAX(date)
      FROM marketTrade.dbo.[foreign])
      AND floor = 'HOSE'
      AND netVal < 0
      ORDER BY netVal ASC
      `);

      const [data_1, data_2, data_3] = await Promise.all([
        promise_1,
        promise_2,
        promise_3,
      ]);

      const dataMapped = new MorningHoseResponse({
        noChange: data_1[0]?.noChange,
        decline: data_1[0]?.decline,
        advance: data_1[0]?.advance,
        netVal: data_1[0]?.netVal,
        sell: data_3,
        buy: data_2,
      });
      return dataMapped;
    } catch (e) {
      throw new CatchException(e);
    }
  }

  async topScore() {
    try {
      //Top tăng
      const promise_1 = this.mssqlService.query(`
      SELECT TOP 4
        c.symbol AS code,
        c.point
      FROM WEBSITE_SERVER.dbo.CPAH c
      WHERE c.date = (SELECT
        MAX(date)
      FROM WEBSITE_SERVER.dbo.CPAH)
      AND c.floor = 'HSX'
      ORDER BY c.point DESC
      `);
      //Top giảm
      const promise_2 = this.mssqlService.query(`
      SELECT TOP 4
        c.symbol AS code,
        c.point
      FROM WEBSITE_SERVER.dbo.CPAH c
      WHERE c.date = (SELECT
        MAX(date)
      FROM WEBSITE_SERVER.dbo.CPAH)
      AND c.floor = 'HSX'
      ORDER BY c.point ASC
      `);
      const promise_3 = this.mssqlService.query(`
      WITH temp_1
      AS (SELECT TOP 1
        noChange,
        decline,
        advance,
        'VNINDEX' AS code
      FROM WEBSITE_SERVER.dbo.MarketBreadth
      ORDER BY time DESC),
      temp
      AS (SELECT
        code,
        date,
        change,
        perChange,
        totalVal
      FROM marketTrade.dbo.indexTradeVND
      WHERE code = 'VNINDEX')
      SELECT
        *
      FROM temp t
      LEFT JOIN temp_1 t1
        ON t1.code = t.code
      WHERE date = (SELECT
        MAX(date)
      FROM temp)
      `);
      const promise_4 = this.mssqlService.query(`
      WITH date
      AS (SELECT DISTINCT TOP 2
        date
      FROM tradeIntraday.dbo.indexTradeVNDIntraday
      WHERE code = 'VNINDEX'
      ORDER BY date DESC),
      prev
      AS (SELECT TOP 1
        totalVal,
        code
      FROM tradeIntraday.dbo.indexTradeVNDIntraday
      WHERE code = 'VNINDEX'
      AND date = (SELECT TOP 1
        date
      FROM date
      ORDER BY date ASC)
      AND timeInday <= '11:33:00'
      ORDER BY timeInday DESC),
      now
      AS (SELECT TOP 1
        totalVal,
        code
      FROM tradeIntraday.dbo.indexTradeVNDIntraday
      WHERE code = 'VNINDEX'
      AND date = (SELECT TOP 1
        date
      FROM date
      ORDER BY date DESC)
      AND timeInday <= '11:33:00'
      ORDER BY timeInday DESC)
      SELECT
        (n.totalVal - p.totalVal) / p.totalVal * 100 AS perChangeVal
      FROM prev p
      INNER JOIN now n
        ON p.code = n.code
      `);
      const [data_1, data_2, data_3, data_4] = await Promise.all([
        promise_1,
        promise_2,
        promise_3,
        promise_4,
      ]);
      return new TopScoreResponse({
        stock_advance: data_1,
        stock_decline: data_2,
        ...data_3[0],
        ...data_4[0],
      });
    } catch (e) {
      throw new CatchException(e);
    }
  }

  async identifyMarket() {
    try {
      const promise_1 = this.mssqlService.query(`
      select Text1 as text_1, Text2 as text_2 from [PHANTICH].[dbo].[morningReport]
      `);

      const promise_2 = this.mssqlService.query(`
      select code, giaKhuyenNghi as gia_khuyen_nghi, giaMucTieu as gia_muc_tieu, giaNgungLo as Gia_ngung_lo, laiSuatSinhLoiKyVong as lai_suat, thoiGianNamGiu as thoi_gian from PHANTICH.dbo.morningReportStock
      `);

      const promise_3 = this.mssqlService.query(`
      select * from PHANTICH.dbo.morningReportStockSell
      `);

      const [data_1, data_2, data_3] = (await Promise.all([
        promise_1,
        promise_2,
        promise_3,
      ])) as any;

      return {
        text: [data_1[0].text_1, data_1[0].text_2],
        stock: data_2,
        stock_sell: data_3,
      };
    } catch (e) {
      throw new CatchException(e);
    }
  }

  async identifyMarketRedis() {
    try {
      const [data_1, data_2, data_3] = await Promise.all([
        this.redis.get(RedisKeys.saveIdentifyMarket),
        this.redis.get(RedisKeys.saveStockRecommend),
        this.redis.get(RedisKeys.saveStockSellRecommend),
      ]);
      return { text: data_1, stock_buy: data_2, stock_sell: data_3 };
    } catch (e) {
      throw new CatchException(e);
    }
  }

  async saveNews(id: number, value: INews[]) {
    try {
      let name_redis = '';
      switch (+id) {
        case 0:
          name_redis = RedisKeys.morningNewsInternational;
          break;
        case 1:
          name_redis = RedisKeys.morningNewsDomestic;
          break;
        case 2:
          name_redis = RedisKeys.morningNewsEnterprise;
          break;
        case 3:
          name_redis = RedisKeys.weekNewsInternational;
          break;
        case 4:
          name_redis = RedisKeys.weekNewsDomestic;
          break;
        case 5:
          name_redis = RedisKeys.afternoonNewsInternational;
          break;
        case 6:
          name_redis = RedisKeys.afternoonNewsDomestic;
          break;
        case 7:
          name_redis = RedisKeys.afternoonNewsEnterprise;
          break;
        default:
          break;
      }
      if (id == 0) {
        const data_week: any[] =
          (await this.redis.get(RedisKeys.weekNewsInternationalNotFilter)) ||
          [];
        await this.redis.set(
          RedisKeys.weekNewsInternationalNotFilter,
          this.removeDuplicateObjects([...data_week, ...value]),
          { ttl: TimeToLive.OneDay },
        );
      }
      if (id == 1) {
        const data_week: any[] =
          (await this.redis.get(RedisKeys.weekNewsDomesticNotFilter)) || [];
        await this.redis.set(
          RedisKeys.weekNewsDomesticNotFilter,
          this.removeDuplicateObjects([...data_week, ...value]),
          { ttl: TimeToLive.OneDay },
        );
      }
      await this.redis.set(name_redis, value, { ttl: TimeToLive.OneYear });
    } catch (e) {
      throw new CatchException(e);
    }
  }

  removeDuplicateObjects(arr: any[]) {
    const uniqueObjects = [];
    const uniqueObjectStrings = [];

    for (const obj of arr) {
      const objString = JSON.stringify(obj);

      if (!uniqueObjectStrings.includes(objString)) {
        uniqueObjectStrings.push(objString);
        uniqueObjects.push(obj);
      }
    }

    return uniqueObjects;
  }

  async getNews(id: number) {
    try {
      let name_redis = '';
      switch (+id) {
        case 0:
          name_redis = RedisKeys.morningNewsInternational;
          break;
        case 1:
          name_redis = RedisKeys.morningNewsDomestic;
          break;
        case 2:
          name_redis = RedisKeys.morningNewsEnterprise;
          break;
        case 3:
          name_redis = RedisKeys.weekNewsInternational;
          break;
        case 4:
          name_redis = RedisKeys.weekNewsDomestic;
          break;
        case 5:
          name_redis = RedisKeys.afternoonNewsInternational;
          break;
        case 6:
          name_redis = RedisKeys.afternoonNewsDomestic;
          break;
        case 7:
          name_redis = RedisKeys.afternoonNewsEnterprise;
          break;
        default:
          break;
      }
      const data = (await this.redis.get(name_redis)) || [];
      return data;
    } catch (error) {
      throw new CatchException(error);
    }
  }

  async saveIdentifyMarket(text: string[]) {
    try {
      await this.redis.set(RedisKeys.saveIdentifyMarket, text, {
        ttl: TimeToLive.OneYear,
      });
    } catch (e) {
      throw new CatchException(e);
    }
  }

  async saveStockRecommend(stock: any[], stock_sell: any[]) {
    try {
      await this.redis.set(RedisKeys.saveStockRecommend, stock, {
        ttl: TimeToLive.OneYear,
      });
      await this.redis.set(RedisKeys.saveStockSellRecommend, stock_sell, {
        ttl: TimeToLive.OneYear,
      });
    } catch (e) {
      throw new CatchException(e);
    }
  }

  async saveStockRecommendWeek(b: ISaveStockRecommendWeek[]) {
    try {
      await this.redis.set(RedisKeys.saveStockRecommendWeek, b, {
        ttl: TimeToLive.OneYear,
      });
    } catch (e) {
      throw new CatchException(e);
    }
  }

  async saveMarketMovements(text: string[]) {
    try {
      await this.redis.set(RedisKeys.saveMarketMovements, text, {
        ttl: TimeToLive.OneYear,
      });
    } catch (e) {
      throw new CatchException(e);
    }
  }

  async saveMarketComment(text: string[], img: any) {
    try {
      const now = moment().format('YYYYMMDDHHmmss');
      await this.minio.put(`resources`, `report/${now}.jpg`, img.buffer, {
        'Content-Type': img.mimetype,
        'X-Amz-Meta-Testing': 1234,
      });
      await this.redis.set(
        RedisKeys.saveMarketComment,
        { img: `/resources/report/${now}.jpg`, text },
        { ttl: TimeToLive.OneYear },
      );
    } catch (e) {
      throw new CatchException(e);
    }
  }

  async saveMarketWeekComment(text: string[]) {
    try {
      await this.redis.set(RedisKeys.saveMarketWeekComment, text, {
        ttl: TimeToLive.OneYear,
      });
    } catch (e) {
      throw new CatchException(e);
    }
  }

  async saveMarketWeekPage2(text: string[], img: any) {
    try {
      const now = moment().format('YYYYMMDDHHmmss');
      await this.minio.put(`resources`, `report/${now}.jpg`, img.buffer, {
        'Content-Type': img.mimetype,
        'X-Amz-Meta-Testing': 1234,
      });
      await this.redis.set(
        RedisKeys.saveMarketWeekPage2,
        { text, img: `/resources/report/${now}.jpg` },
        { ttl: TimeToLive.OneYear },
      );
    } catch (error) {}
  }

  async afternoonReport1() {
    try {
      //chart vnindex
      const promise_1 = this.mssqlService.query(`
      select closePrice as value, CONCAT(date, ' ', timeInday) as time from tradeIntraday.dbo.indexTradeVNDIntraday where code = 'VNINDEX' and date = (select max(date) from tradeIntraday.dbo.indexTradeVNDIntraday) order by time asc
      `);

      //thong tin vnindex
      const promise_2 = this.mssqlService.query(`
      with temp as (
        select i.date, f.netVal, closePrice, lead(closePrice) over (partition by i.code order by i.date desc) as prevClosePrice, change, perChange, 
               totalVal, 
               (totalVal - lead(totalVal) over (partition by i.code order by i.date desc)) / lead(totalVal) over (partition by i.code order by i.date desc) * 100 as perTotalVal, 
               advances, declines, noChange, ceilingStocks, floorStocks, highPrice, lowPrice,
               omVal,
               (omVal - lead(omVal) over (partition by i.code order by i.date desc)) / lead(omVal) over (partition by i.code order by i.date desc) * 100 as perOmVal, 
               ptVal
               from marketTrade.dbo.indexTradeVND i
        inner join marketTrade.dbo.[foreign] f on f.code = i.code and f.date = i.date
         where i.code = 'VNINDEX')
              select top 1 * from temp
      `);

      //thong tin hnx
      const promise_3 = this.mssqlService.query(`
      select closePrice, change, perChange from marketTrade.dbo.indexTradeVND where code = 'HNX' and date = (select max(date) from marketTrade.dbo.indexTradeVND)
      `);

      //Top dong gop nganh
      const promise_4 = this.mssqlService.query(`
      select sum(point) as value, i.LV2 as code from WEBSITE_SERVER.dbo.CPAH c
      inner join marketInfor.dbo.info i on i.code = c.symbol
              where c.floor = 'HSX' and date = (select max(date) from WEBSITE_SERVER.dbo.CPAH)
      group by i.LV2
      order by value desc
      `);

      //Co phieu dong gop
      const promise_5 = this.mssqlService.query(`
      with giam as (select top 5 point as value, symbol as code
        from WEBSITE_SERVER.dbo.CPAH
        where date = (select max(date) from WEBSITE_SERVER.dbo.CPAH) and floor = 'HSX'
        order by point asc),
        tang as (
            select top 5 point as value, symbol as code
        from WEBSITE_SERVER.dbo.CPAH
        where date = (select max(date) from WEBSITE_SERVER.dbo.CPAH) and floor = 'HSX'
        order by point desc
        )
        select * from tang
        union all
        select * from giam
      `);

      //Top giao dich rong khoi ngoai
      const promise_6 = this.mssqlService.query(`
      with giam as (SELECT TOP 5
              code, netVal as value
            FROM marketTrade.dbo.[foreign]
            WHERE type IN ('STOCK', 'ETF')
            AND date = (SELECT
              MAX(date)
            FROM marketTrade.dbo.[foreign])
            AND floor = 'HOSE'
            AND netVal < 0
            ORDER BY netVal ASC),
          tang as (
              SELECT TOP 5
              code, netVal as value
            FROM marketTrade.dbo.[foreign]
            WHERE type IN ('STOCK', 'ETF')
            AND date = (SELECT
              MAX(date)
            FROM marketTrade.dbo.[foreign])
            AND floor = 'HOSE'
            AND netVal > 0
            ORDER BY netVal DESC
          )
      select * from tang union all select * from giam
      `);

      //Top gia tri giao dich
      const promise_7 = this.mssqlService.query(`
      select top 10 code, totalVal as value from marketTrade.dbo.tickerTradeVND where floor = 'HOSE' and date = (select max(date) from marketTrade.dbo.tickerTradeVND) order by totalVal desc
      `);

      const promise_8 = this.redis.get(RedisKeys.saveMarketMovements);

      const [data_1, data_2, data_3, data_4, data_5, data_6, data_7, data_8] =
        (await Promise.all([
          promise_1,
          promise_2,
          promise_3,
          promise_4,
          promise_5,
          promise_6,
          promise_7,
          promise_8,
        ])) as any;

      return new AfternoonReport1({
        text: data_8 || [],
        closePrice: data_2[0].closePrice,
        prevClosePrice: data_2[0].prevClosePrice,
        change: data_2[0].change,
        perChange: data_2[0].perChange,
        totalVal: data_2[0].totalVal,
        perChangeTotalVal: data_2[0].perTotalVal,
        netVal: data_2[0].netVal,
        advances: data_2[0].advances,
        declines: data_2[0].declines,
        noChange: data_2[0].noChange,
        ceilingStocks: data_2[0].ceilingStocks,
        floorStocks: data_2[0].floorStocks,
        highPrice: data_2[0].highPrice,
        lowPrice: data_2[0].lowPrice,
        hnxClosePrice: data_3[0].closePrice,
        hnxChange: data_3[0].change,
        hnxPerChange: data_3[0].perChange,
        industryAdvance: {
          code: data_4[0].code,
          value: data_4[0].value,
        },
        industryDecline: {
          code: data_4[data_4.length - 1].code,
          value: data_4[data_4.length - 1].value,
        },
        stockAdvance: data_5.slice(0, 5),
        stockDecline: data_5.slice(5, 10),
        topBuy: data_6.slice(0, 3),
        topSell: data_6.slice(5, 8),
        chart: data_1.map((item) => ({
          time: Date.UTC(
            new Date().getFullYear(),
            new Date().getMonth(),
            new Date().getDate(),
            new Date(item?.time)?.getHours(),
            new Date(item?.time)?.getMinutes(),
          ).valueOf(),
          value: item.value,
        })),
        chartTopMarket: [
          ...data_5.slice(0, 5),
          ...data_5.slice(5, 10).reverse(),
        ],
        chartTopForeign: [
          ...data_6.slice(0, 5),
          ...data_6.slice(5, 10).reverse(),
        ],
        chartTopTotalVal: data_7,
        omVal: data_2[0].omVal,
        perOmVal: data_2[0].perOmVal,
        ptVal: data_2[0].ptVal,
      });
    } catch (e) {
      throw new CatchException(e);
    }
  }

  async afternoonReport2() {
    try {
      const index = `'VNINDEX', 'HNX', 'UPCOM', 'VN30', 'HNX30'`;
      const sort_1 = `case ${index
        .split(',')
        .map(
          (item, index) =>
            `when t.code = ${item.replace(/\n/g, '').trim()} then ${index}`,
        )
        .join(' ')} end as row_num`;
      const query = `
      with temp as (select code, closePrice,
              date,
              totalVal,
              DATEADD(MONTH, -1, date) as month, 
              DATEADD(WEEK, -1, date) as week, 
              DATEADD(YEAR, -1, date) as year,
              DATEFROMPARTS(YEAR(date) - 1, 12, 31) AS ytd
      from marketTrade.dbo.indexTradeVND),
      temp_2 as (SELECT
          code,
        closePrice,
        date,
        totalVal,
        lead(closePrice) over (partition by code order by date desc) as day,
        lead(date) over (partition by code order by date desc) as day_d,
        (select top 1 closePrice from marketTrade.dbo.indexTradeVND where date = (select max(date) from marketTrade.dbo.indexTradeVND where date <= week) and code = temp.code) as week,
        (select max(date) from marketTrade.dbo.indexTradeVND where date <= week) as week_d,
        (select top 1 closePrice from marketTrade.dbo.indexTradeVND where date = (select max(date) from marketTrade.dbo.indexTradeVND where date <= month) and code = temp.code) as month,
        (select max(date) from marketTrade.dbo.indexTradeVND where date <= month) as month_d,
        (select top 1 closePrice from marketTrade.dbo.indexTradeVND where date = (select max(date) from marketTrade.dbo.indexTradeVND where date <= year) and code = temp.code) as year,
        (select max(date) from marketTrade.dbo.indexTradeVND where date <= year) as year_d,
        (select top 1 closePrice from marketTrade.dbo.indexTradeVND where date = (select max(date) from marketTrade.dbo.indexTradeVND where date <= ytd) and code = temp.code) as ytd,
        (select max(date) from marketTrade.dbo.indexTradeVND where date <= ytd) as year_to_date_d
      FROM
        temp)
      select
          code,
          date,
          totalVal,
          closePrice as price,
              (closePrice - day) / day * 100 as day,
              (closePrice - week) / week * 100 as week,
              (closePrice - month) / month * 100 as month,
              (closePrice - year) / year * 100 as year,
              (closePrice - ytd) / ytd * 100 as ytd,
              ${sort_1}
              from temp_2 t
              where date = (select max(date) from temp_2)
              and code IN (${index})
              order by row_num asc
      `;
      const data = await this.mssqlService.query(query);
      const dataRedis: any = await this.redis.get(RedisKeys.saveMarketComment);
      return new AfterNoonReport2Response({
        table: data,
        text: dataRedis?.text || [],
        image: dataRedis?.img || '',
      });
    } catch (e) {
      throw new CatchException(e);
    }
  }

  async uploadImageReport(file: any[], type: number) {
    const now = moment().format('YYYYMMDDHHmmss');
    await this.redis.set(
      type ? 'image-report-week' : 'image-report',
      `resources/report/${now}.jpg`,
      { ttl: TimeToLive.OneDay },
    );
    for (const item of file) {
      await this.minio.put(`resources`, `report/${now}.jpg`, item.buffer, {
        'Content-Type': item.mimetype,
        'X-Amz-Meta-Testing': 1234,
      });
    }
    return;
  }

  async transactionValueFluctuations(type: number) {
    try {
      const industry = `N'Ngân hàng', N'Dịch vụ tài chính', N'Bất động sản', N'Tài nguyên', N'Xây dựng & Vật liệu', N'Thực phẩm & Đồ uống', N'Hóa chất', N'Dịch vụ bán lẻ'`;
      const sort = UtilCommonTemplate.generateSortCase(industry, 'n.code');
      const { now, prev, prev_4 } = this.get2WeekNow();
      
      const query =
        type == 0
          ? `
      with temp as (select code,
              date,
              totalVal,
              lead(totalVal) over (partition by code order by date desc) as prevTotalVal,
              AVG(totalVal) OVER (partition by code order by date ROWS BETWEEN 19 preceding AND current row) AS avgTotalVal,
              ${sort}
      from marketTrade.dbo.inDusTrade n
      where floor = 'HOSE'
      and code in (${industry}))
      select * from temp where date = (select max(date) from temp) order by row_num asc
      `
          : `
      with now as (select sum(totalVal) as now, code
                  from marketTrade.dbo.inDusTrade
                  where date between '${now.from}' and '${now.to}'
                    and floor = 'HOSE'
                  group by code),
      prev as (
      select sum(totalVal) as prev, code
                  from marketTrade.dbo.inDusTrade
                  where date between '${prev.from}' and '${prev.to}'
                    and floor = 'HOSE'
                  group by code
          ),
          prev_4 as (
              select sum(totalVal) / 4 as prev_4, code
              from marketTrade.dbo.inDusTrade
                  where date between '${prev_4.from}' and '${prev_4.to}'
                    and floor = 'HOSE'
                  group by code
          )
      select n.code, n.now as totalVal, p.prev as prevTotalVal, p4.prev_4 as avgTotalVal, ${sort} from now n
      inner join prev p on n.code = p.code
      inner join prev_4 p4 on n.code = p4.code
      where n.code in (${industry})
      order by row_num      
      `;
      
      const data = await this.mssqlService.query<
        TransactionValueFluctuationsResponse[]
      >(query);
      const dataMapped = TransactionValueFluctuationsResponse.mapToList(data);
      return dataMapped;
    } catch (e) {
      throw new CatchException(e);
    }
  }

  async liquidityMarket() {
    try {
      const query = `
      select top 60 omVal as value, date from marketTrade.dbo.indexTradeVND where code = 'VNINDEX' order by date desc
      `;
      const data = await this.mssqlService.query<LiquidityMarketResponse[]>(
        query,
      );
      const dataMapped = LiquidityMarketResponse.mapToList(data);
      return dataMapped;
    } catch (e) {
      throw new CatchException(e);
    }
  }

  async cashFlowRatio() {
    try {
      const query = `
      with date as (
        select distinct top 60 date from [marketTrade].[dbo].[proprietary] order by date desc
    ),
    market AS (
            SELECT
                [date],
                round(SUM(totalVal), 0) AS marketTotalVal
            FROM [marketTrade].[dbo].[tickerTradeVND]
            WHERE [date] >= (select top 1 date from date order by date asc) and [date] <= (select top 1 date from date order by date desc)
                AND [type] IN ('STOCK', 'ETF')
                AND [floor] = 'HOSE'
            GROUP BY [date]
        ),
        data AS (
            SELECT
                p.[date],
                SUM(p.netVal) AS netVal,
                SUM(p.buyVal) AS buyVal,
                SUM(p.sellVal) AS sellVal,
                SUM(p.buyVal) + SUM(p.sellVal) AS totalVal,
                MAX(m.marketTotalVal) AS marketTotalVal,
                (SUM(p.buyVal) + SUM(p.sellVal)) / MAX(m.marketTotalVal) * 100 AS [percent],
                1 AS type
            FROM [marketTrade].[dbo].[proprietary] AS p
            INNER JOIN market AS m ON p.[date] = m.[date]
            WHERE p.[date] >= (select top 1 date from date order by date asc) and p.[date] <= (select top 1 date from date order by date desc)
                AND p.type IN ('STOCK', 'ETF')
                AND p.[floor] = 'HOSE'
            GROUP BY p.[date]
            UNION ALL
            SELECT
                f.[date],
                SUM(f.netVal) AS netVal,
                SUM(f.buyVal) AS buyVal,
                SUM(f.sellVal) AS sellVal,
                SUM(f.buyVal) + SUM(f.sellVal) AS totalVal,
                MAX(m.marketTotalVal) AS marketTotalVal,
                (SUM(f.buyVal) + SUM(f.sellVal)) / MAX(m.marketTotalVal) * 100 AS [percent],
                0 AS type
            FROM [marketTrade].[dbo].[foreign] AS f
            INNER JOIN market AS m ON f.[date] = m.[date]
            WHERE f.[date] >= (select top 1 date from date order by date asc) and f.[date] <= (select top 1 date from date order by date desc)
                AND f.type IN ('STOCK', 'ETF')
                AND f.[floor] = 'HOSE'
            GROUP BY f.[date]
        )
        SELECT
            [date], netVal, buyVal, sellVal,
            totalVal, marketTotalVal, [percent],
            1 AS type
        FROM data
        WHERE type = 1
        UNION ALL
        SELECT
            [date], netVal, buyVal, sellVal,
            totalVal, marketTotalVal, [percent],
            0 AS type
        FROM data
        WHERE type = 0
        UNION ALL
        SELECT
          [date],
          -(-SUM(CASE WHEN type = 0 THEN netVal ELSE 0 END) + SUM(CASE WHEN type = 1 THEN netVal ELSE 0 END)) AS netVal,
          marketTotalVal - (SUM(CASE WHEN type = 0 THEN buyVal ELSE 0 END) + SUM(CASE WHEN type = 1 THEN buyVal ELSE 0 END)) AS buyVal,
          marketTotalVal - (SUM(CASE WHEN type = 0 THEN sellVal ELSE 0 END) + SUM(CASE WHEN type = 1 THEN sellVal ELSE 0 END)) AS sellVal,
          (marketTotalVal * 2) - (SUM(CASE WHEN type = 0 THEN totalVal ELSE 0 END) + SUM(CASE WHEN type = 1 THEN totalVal ELSE 0 END)) AS totalVal,
          marketTotalVal,
          100 - SUM(CASE WHEN type = 0 THEN [percent] ELSE 0 END) - SUM(CASE WHEN type = 1 THEN [percent] ELSE 0 END) AS [percent],
          2 AS type
        FROM data
        GROUP BY marketTotalVal, [date]
        ORDER BY [date]
      `;
      const data = await this.mssqlService.query<InvestorTransactionRatioResponse[]>(query);
      const dataMapped = new InvestorTransactionRatioResponse().mapToList(data);
      return dataMapped;
    } catch (e) {
      throw new CatchException(e);
    }
  }

  async topNetBuyingAndSelling(type: number) {
    try {
      const query = `
      select netVal as value, code, date from marketTrade.dbo.${
        type == 0 ? 'inDusForeign' : 'inDusProprietary'
      } where floor = 'HOSE' and date = (select max(date) from marketTrade.dbo.${
        type == 0 ? 'inDusForeign' : 'inDusProprietary'
      }) order by netVal desc
      `;

      const data: any[] = await this.mssqlService.query(query);
      const dataMapped = IStockContribute.mapToList([
        ...data.slice(0, 3),
        ...data.slice(-3),
      ]);
      return dataMapped;
    } catch (e) {
      throw new CatchException(e);
    }
  }

  async cashFlow(type: number) {
    try {
      const query = `
      with temp as (select top 20 date, netVal as value from marketTrade.dbo.[${
        type == 0 ? 'foreign' : 'proprietary'
      }] where code = 'VNINDEX' order by date desc)
      select * from temp order by date asc
      `;
      const data = await this.mssqlService.query<LiquidityMarketResponse[]>(
        query,
      );
      const dataMapped = LiquidityMarketResponse.mapToList(data);
      return dataMapped;
    } catch (e) {
      throw new CatchException(e);
    }
  }

  async industry(type: number) {
    try {
      const { latestDate, previousDate, weekDate, monthDate, firstDateYear } =
        await this.getDateSessionV2(
          '[RATIO].[dbo].[ratioInday]',
          'date',
          // this.dbServer
        );

      const marketCapQuery = `
          SELECT
          i.date AS date_time,
          sum(i.closePrice * i.shareout)  AS total_market_cap,
          f.LV2 as industry
          FROM RATIO.dbo.ratioInday i
          inner join marketInfor.dbo.info f on f.code = i.code
          WHERE i.date IN ('${UtilCommonTemplate.toDate(latestDate)}', 
          '${UtilCommonTemplate.toDate(previousDate)}', 
          '${UtilCommonTemplate.toDate(weekDate)}', 
          '${UtilCommonTemplate.toDate(monthDate)}', 
          '${UtilCommonTemplate.toDate(firstDateYear)}')
          AND f.floor = 'HOSE'  
          AND f.LV2 IN (N'Ngân hàng', N'Dịch vụ tài chính', N'Bất động sản', N'Tài nguyên', N'Xây dựng & Vật liệu', N'Thực phẩm & Đồ uống', N'Hóa chất', N'Dịch vụ bán lẻ', N'Công nghệ', N'Dầu khí')
          GROUP BY f.LV2, i.date
          ORDER BY i.date DESC
          `;

      const marketCapQuery2 = `
          with temp as (select distinct i.closePrice, i.shareout, i.code, f.LV2 ,date FROM RATIO.dbo.ratioInday i inner join marketInfor.dbo.info f on f.code = i.code
            where date in ('${UtilCommonTemplate.toDate(latestDate)}', 
            '${UtilCommonTemplate.toDate(previousDate)}', 
            '${UtilCommonTemplate.toDate(weekDate)}', 
            '${UtilCommonTemplate.toDate(monthDate)}', 
            '${UtilCommonTemplate.toDate(firstDateYear)}')
            AND f.floor = 'HOSE' AND f.code <> 'BSR'
                      AND f.LV2 IN (N'Ngân hàng', N'Dịch vụ tài chính', N'Bất động sản', N'Tài nguyên', N'Xây dựng & Vật liệu', N'Thực phẩm & Đồ uống', N'Hóa chất', N'Dịch vụ bán lẻ', N'Công nghệ', N'Dầu khí'))
            select sum(closePrice * shareout) as total_market_cap, LV2 as industry, date as date_time from temp group by LV2, date ORDER BY date DESC
          `;
      const marketCap = await this.dbServer.query(marketCapQuery2);

      const groupByIndustry = marketCap.reduce((result, item) => {
        (result[item.industry] || (result[item.industry] = [])).push(item);
        return result;
      }, {});

      //Calculate change percent per day, week, month
      const industryChanges = Object.entries(groupByIndustry).map(
        ([industry, values]: any) => {
          return {
            industry,
            day_change_percent: !values[1]?.total_market_cap
              ? 0
              : ((values[0].total_market_cap - values[1].total_market_cap) /
                  values[1].total_market_cap) *
                100,
            week_change_percent: !values[2]?.total_market_cap
              ? 0
              : ((values[0].total_market_cap - values[2].total_market_cap) /
                  values[2].total_market_cap) *
                100,
            month_change_percent: !values[3]?.total_market_cap
              ? 0
              : ((values[0].total_market_cap - values[3].total_market_cap) /
                  values[3].total_market_cap) *
                100,
            ytd: !values[4]?.total_market_cap
              ? 0
              : ((values[0].total_market_cap - values[4]?.total_market_cap) /
                  values[4].total_market_cap) *
                100,
          };
        },
      );

      const query = (date): string => `
            SELECT
              i.LV2 AS industry,
              t.code AS ticker,
              t.closePrice AS close_price,
              t.highPrice AS high,
              t.floorPrice,
              t.ceilingPrice,
              t.lowPrice AS low,
              t.date AS date_time
            FROM marketTrade.dbo.tickerTradeVND t
            INNER JOIN marketInfor.dbo.info i
              ON t.code = i.code
            WHERE t.date = '${UtilCommonTemplate.toDate(date)}'
            AND i.floor = 'HOSE'
            AND i.LV2 IN (N'Ngân hàng', N'Dịch vụ tài chính', N'Bất động sản', N'Tài nguyên', N'Xây dựng & Vật liệu', N'Thực phẩm & Đồ uống', N'Hóa chất', N'Dịch vụ bán lẻ', N'Công nghệ', N'Dầu khí')
            `;
      const dataToday = await this.dbServer.query(query(latestDate));
      const dataYesterday = await this.dbServer.query(
        query(type ? weekDate : previousDate),
      );
      
      const result = dataToday.map((item) => {
        const yesterdayItem = dataYesterday.find(
          (i) => i.ticker === item.ticker,
        );
        if (!yesterdayItem) return;
        return {
          industry: item.industry,
          equal: isEqual(yesterdayItem, item),
          increase: isIncrease(yesterdayItem, item),
          decrease: isDecrease(yesterdayItem, item),
          high: isHigh(yesterdayItem, item, type),
          low: isLow(yesterdayItem, item, type),
        };
      });

      const final = result.reduce((stats, record) => {
        const existingStats = stats.find(
          (s) => s?.industry === record?.industry,
        );
        const industryChange = industryChanges.find(
          (i) => i?.industry == record?.industry,
        );
        if (!industryChange) return stats;

        if (existingStats) {
          existingStats.equal += record.equal;
          existingStats.increase += record.increase;
          existingStats.decrease += record.decrease;
          existingStats.high += record.high;
          existingStats.low += record.low;
        } else {
          stats.push({
            industry: record.industry,
            equal: record.equal,
            increase: record.increase,
            decrease: record.decrease,
            high: record.high,
            low: record.low,
            ...industryChange,
          });
        }
        return stats;
      }, []);

      const mappedData: IndustryResponse[] = [
        ...new IndustryResponse().mapToList(final),
      ].sort((a, b) => (a.industry > b.industry ? 1 : -1));

      return mappedData;
    } catch (e) {
      throw new CatchException(e);
    }
  }

  get2WeekNow() {
    let friday_1 = moment().format('YYYY-MM-DD');

    if (moment(friday_1).day() !== 5) {
      friday_1 = moment(friday_1)
        .clone()
        .day(5)
        .subtract(1, 'weeks')
        .startOf('day')
        .format('YYYY-MM-DD');
    }

    const friday_2 = moment(friday_1).subtract(1, 'week').format('YYYY-MM-DD');
    const monday_1 = moment(friday_1).subtract(4, 'day').format('YYYY-MM-DD');
    const monday_2 = moment(friday_2).subtract(4, 'day').format('YYYY-MM-DD');

    const monday_3 = moment(monday_1).subtract(3, 'week').format('YYYY-MM-DD');

    return {
      now: {
        from: monday_1,
        to: friday_1,
      },
      prev: {
        from: monday_2,
        to: friday_2,
      },
      prev_4: {
        from: monday_3,
        to: friday_1,
      },
    };
  }

  async weekReport1() {
    try {
      const { now, prev } = this.get2WeekNow();
      const date = await this.mssqlService.query(`with date_ranges as (
        select
            max(case when date <= '${moment(now.to).format(
              'YYYY-MM-DD',
            )}' then date else null end) as now,
            max(case when date <= '${moment(now.to)
              .subtract(1, 'week')
              .format('YYYY-MM-DD')}' then date else null end) as week
        from marketTrade.dbo.tickerTradeVND
    )
    select now, week
    from date_ranges;`);

      //thong tin vnindex
      const promise_1 = this.mssqlService.query(`
      with temp as (SELECT
        code,
        i.date,
        closePrice,
        closePrice - lead(closePrice) over (partition by code order by date desc) as change,
        (closePrice - lead(closePrice) over (partition by code order by date desc)) / lead(closePrice) over (partition by code order by date desc) * 100 as perChange
      FROM marketTrade.dbo.indexTradeVND i
      WHERE i.code IN ('VNINDEX', 'HNX')
      AND date in ('${UtilCommonTemplate.toDate(
        date[0].week,
      )}', '${UtilCommonTemplate.toDate(date[0].now)}')
      )
      select * from temp where date = (select max(date) from temp)
      `);

      //top nganh noi bat
      const promise_2 = this.mssqlService.query(`
      SELECT
        SUM(point) AS value,
        i.LV2 as code
      FROM WEBSITE_SERVER.dbo.CPAH c
      INNER JOIN marketInfor.dbo.info i
        ON i.code = c.symbol
      WHERE date BETWEEN '${now.from}' AND '${now.to}'
      AND c.floor = 'HSX'
      GROUP BY i.LV2
      ORDER BY value DESC
      `);

      //top co phieu dong gop
      const promise_3 = this.mssqlService.query(`
      WITH temp
      AS (SELECT
        SUM(c.point) AS point,
        symbol AS code,
        '${now.to}' AS date
      FROM WEBSITE_SERVER.dbo.CPAH c
      WHERE date BETWEEN '${now.from}' AND '${now.to}'
      AND c.floor = 'HSX'
      GROUP BY symbol),
      price
      AS (SELECT
        (closePrice - LEAD(closePrice) OVER (PARTITION BY code ORDER BY date DESC)) / LEAD(closePrice) OVER (PARTITION BY code ORDER BY date DESC) * 100 AS perChange,
        code,
        date
      FROM marketTrade.dbo.tickerTradeVND
      WHERE date IN ('${moment(date[0].week).format('YYYY-MM-DD')}', '${moment(
        date[0].now,
      ).format('YYYY-MM-DD')}')
      AND floor = 'HOSE')
      SELECT
        t.point,
        t.code,
        v.perChange
      FROM temp t
      INNER JOIN price v
        ON t.code = v.code
        AND t.date = v.date
      ORDER BY t.point DESC
      `);

      //tong gtgd
      const promise_4 = this.mssqlService.query(`
      WITH temp_1
      AS (SELECT
        SUM(omVal) AS omVal,
        SUM(ptVal) AS ptVal,
        'VNINDEX' AS code,
        '${now.to}' AS date
      FROM marketTrade.dbo.indexTradeVND
      WHERE code = 'VNINDEX'
      AND date BETWEEN '${now.from}' AND '${now.to}'),
      temp_2
      AS (SELECT
        SUM(omVal) AS prevOmVal,
        'VNINDEX' AS code
      FROM marketTrade.dbo.indexTradeVND
      WHERE code = 'VNINDEX'
      AND date BETWEEN '${prev.from}' AND '${prev.to}')
      SELECT
        t1.omVal,
        (t1.omVal - t2.prevOmVal) / t2.prevOmVal * 100 AS perOmVal,
        t1.ptVal,
        advances,
        noChange,
        declines
      FROM temp_1 t1
      INNER JOIN temp_2 t2
        ON t1.code = t2.code
      INNER JOIN marketTrade.dbo.indexTradeVND i
        ON i.date = t1.date
        AND i.code = t1.code
      `);

      //giao dich rong khoi ngoai
      const promise_5 = this.mssqlService.query(`
      SELECT
        SUM(netVal) AS netVal
      FROM marketTrade.dbo.[foreign]
      WHERE code = 'VNINDEX'
      AND date BETWEEN '${now.from}' AND '${now.to}'
      `);

      //top mua ban rong
      const promise_6 = this.mssqlService.query(`
      WITH temp
      AS (SELECT
        SUM(netVal) AS netVal,
        code,
        '${now.to}' AS date
      FROM marketTrade.dbo.[foreign]
      WHERE type = 'STOCK'
      AND date BETWEEN '${now.from}' AND '${now.to}'
      AND floor = 'HOSE'
      GROUP BY code),
      price
      AS (SELECT
        (closePrice - LEAD(closePrice) OVER (PARTITION BY code ORDER BY date DESC)) / LEAD(closePrice) OVER (PARTITION BY code ORDER BY date DESC) * 100 AS perChange,
        code,
        date
      FROM marketTrade.dbo.tickerTradeVND
      WHERE date IN ('${moment(date[0].week).format('YYYY-MM-DD')}', '${moment(
        date[0].now,
      ).format('YYYY-MM-DD')}')
      AND floor = 'HOSE')
      SELECT
        netVal as point,
        t.code,
        v.perChange
      FROM temp t
      INNER JOIN price v
        ON v.date = t.date
        AND v.code = t.code
        order by netVal desc  
        `);

      //text dien bien thi truong
      const promise_7 = this.redis.get(RedisKeys.saveMarketWeekComment);

      //Top gia tri giao dich hose qua 1 tuần
      const promise_8 = this.mssqlService.query(`
      WITH temp
      AS (SELECT TOP 10
        SUM(totalVal) AS totalVal,
        code,
        '${now.to}' AS date
      FROM marketTrade.dbo.tickerTradeVND
      WHERE floor = 'HOSE'
      AND date BETWEEN '${now.from}' AND '${now.to}'
      GROUP BY code
      ORDER BY totalVal DESC),
      price
      AS (SELECT
        (closePrice - LEAD(closePrice) OVER (PARTITION BY code ORDER BY date DESC)) / LEAD(closePrice) OVER (PARTITION BY code ORDER BY date DESC) * 100 AS perChange,
        code,
        date
      FROM marketTrade.dbo.tickerTradeVND
      WHERE date IN ('${moment(date[0].week).format('YYYY-MM-DD')}', '${moment(
        date[0].now,
      ).format('YYYY-MM-DD')}')
      AND floor = 'HOSE')
      SELECT
        t.code,
        t.totalVal,
        v.perChange
      FROM temp t
      INNER JOIN price v
        ON t.code = v.code
        AND t.date = v.date
        order by t.totalVal desc
       `);

      //Top
      const promise_9 = this.mssqlService.query(`
      select netVal, date from marketTrade.dbo.[foreign] where date between '${now.from}' and '${now.to}' and code = 'VNINDEX' order by date asc
      `);

      const [
        data_1,
        data_2,
        data_3,
        data_4,
        data_5,
        data_6,
        data_7,
        data_8,
        data_9,
      ] = (await Promise.all([
        promise_1,
        promise_2,
        promise_3,
        promise_4,
        promise_5,
        promise_6,
        promise_7,
        promise_8,
        promise_9,
      ])) as any;

      const vnindex = data_1.find((item) => item.code == 'VNINDEX');
      const hnx = data_1.find((item) => item.code == 'HNX');

      return {
        text: data_7 || '',
        closePrice: vnindex.closePrice,
        change: vnindex.change,
        perChange: vnindex.perChange,
        hnxClosePrice: hnx.closePrice,
        hnxChange: hnx.change,
        hnxPerChange: hnx.perChange,
        omVal: data_4[0]?.omVal || 0,
        perOmVal: data_4[0]?.perOmVal || 0,
        ptVal: data_4[0]?.ptVal || 0,
        advances: data_4[0]?.advances || 0,
        declines: data_4[0]?.declines || 0,
        noChange: data_4[0]?.noChange || 0,
        netVal: data_5[0].netVal,
        industryAdvance:
          data_2.length != 0
            ? {
                code: data_2[0]?.value <= 0 ? '' : data_2[0].code,
                value: data_2[0]?.value <= 0 ? 0 : data_2[0].value,
              }
            : {
                code: '',
                value: 0,
              },
        industryDecline:
          data_2.length != 0
            ? {
                code:
                  data_2[data_2.length - 1]?.value >= 0
                    ? ''
                    : data_2[data_2.length - 1].code,
                value:
                  data_2[data_2.length - 1].value >= 0
                    ? 0
                    : data_2[data_2.length - 1].value,
              }
            : {
                code: '',
                value: 0,
              },
        stockAdvance: data_3.length != 0 ? data_3.slice(0, 5) : [],
        stockDecline: data_3.length != 0 ? data_3.slice(-5).reverse() : [],
        topBuy: data_6.slice(0, 3),
        topSell: data_6.slice(-3).reverse(),
        chartTopMarket: [...data_3.slice(0, 5), ...data_3.slice(-5)],
        chartTopForeign: [...data_6.slice(0, 5), ...data_6.slice(-5)],
        chartTopTotalVal: data_8.map((item, index) => ({
          ...item,
          color:
            index == data_8.length - 1
              ? `rgba(1, 85, 183, 0.15)`
              : `rgba(1, 85, 183, ${(1 - 0.1 * index).toFixed(1)})`,
        })),
        chartTopForeignTotalVal: data_9.reduce(
          (acc, cur) => [
            ...acc,
            {
              ...cur,
              value: (acc[acc.length - 1]?.value || 0) + cur.netVal,
              date: UtilCommonTemplate.toDate(cur.date),
            },
          ],
          [],
        ),
      };
    } catch (e) {
      throw new CatchException(e);
    }
  }

  async weekReport2() {
    try {
      const data_redis: { text: string[]; img: string } = await this.redis.get(
        RedisKeys.saveMarketWeekPage2,
      );
      return {
        table: (await this.afternoonReport2()).table,
        image: data_redis.img || '',
        text: data_redis.text || [],
      };
    } catch (e) {
      throw new CatchException(e);
    }
  }

  async profitablePerformanceIndex() {
    try {
      const arr = ['U.S.10Y', 'Dollar Index'];
      const data = await this.stockMarket(1);
      return data
        .filter((item) => !arr.includes(item.name))
        .map((item) => ({ name: item.name, value: item.week }))
        .sort((a, b) => b.value - a.value);
    } catch (e) {
      throw new CatchException(e);
    }
  }

  async profitablePerformanceIndustry() {
    try {
      const promise_1 = this.industry(1);
      const promise_2 = this.stockMarket(2);

      const [data_1, data_2] = await Promise.all([promise_1, promise_2]);
      return [
        ...data_1.map((item) => ({
          name: item.industry,
          value: item.week_change_percent,
        })),
        ...data_2.map((item) => ({ name: item.name, value: item.week })),
      ].sort((a, b) => b.value - a.value);
    } catch (e) {
      throw new CatchException(e);
    }
  }

  async exchangeRateUSDEUR() {
    try {
      const now = moment(
        (
          await this.mssqlService.query(
            `select top 1 date from macroEconomic.dbo.exchangeRateVCB order by date desc`,
          )
        )[0].date,
      ).format('YYYY-MM-DD');
      const query = `
      select code as name, date, bySell as value from macroEconomic.dbo.exchangeRateVCB where code in ('USD', 'EUR')
      and date between '${moment(now)
        .subtract(1, 'year')
        .format('YYYY-MM-DD')}' and '${now}' order by date, code
      `;
      const data = await this.mssqlService.query<ExchangeRateUSDEURResponse[]>(
        query,
      );
      return ExchangeRateUSDEURResponse.mapToList(data);
    } catch (e) {
      throw new CatchException(e);
    }
  }

  async averageInterbankInterestRate() {
    try {
      const now = moment(
        (
          await this.mssqlService.query(
            `select top 1 date from macroEconomic.dbo.EconomicVN_byTriVo order by date desc`,
          )
        )[0].date,
      ).format('YYYY-MM-DD');
      const query = `
      select code as name, date, value from macroEconomic.dbo.EconomicVN_byTriVo where code in (N'Qua đêm', N'1 tuần', N'2 tuần', N'1 tháng')
      and date between '${moment(now)
        .subtract(1, 'year')
        .format('YYYY-MM-DD')}' and '${now}' order by date, code
      `;
      const data = await this.mssqlService.query<ExchangeRateUSDEURResponse[]>(
        query,
      );
      return ExchangeRateUSDEURResponse.mapToList(data);
    } catch (e) {
      throw new CatchException(e);
    }
  }

  async commodityPriceFluctuations() {
    try {
      let name = '';
      // let table = 'macroEconomic.dbo.HangHoa'
      // switch (type) {
      //   case 0: //brent và khí gas
      //     name = `N'Dầu Brent', N'Khí Gas'`
      //     break;
      //   case 1: //Đồng và vàng
      //     name = `N'Đồng', N'Vàng'`
      //     break
      //   case 2: //HRC và thép
      //     name = `N'Thép HRC', N'Thép'`
      //     break
      //   case 3: //cotton và đường
      //     name = `N'Bông', N'Đường'`
      //     break
      //   case 4: //cao su và ure
      //     name = `N'Cao su', N'Ure'`
      //     break
      //   case 5: //dxy và us10y
      //     name = `N'Dollar Index', N'U.S.10Y'`
      //     table = 'macroEconomic.dbo.WorldIndices'
      //     break
      //   default:
      //     break;
      // }
      // const query = `
      // WITH temp
      // AS (SELECT
      //   date,
      //   ${type == 5 ? 'name' : `name + ' (' + unit + ')' AS name`},
      //   ${type == 5 ? 'closePrice as value' : 'price as value'}
      // FROM ${table}
      // WHERE name IN (${name})
      // AND date BETWEEN '${moment().subtract(1, 'year').format('YYYY-MM-DD')}' AND '${moment().format('YYYY-MM-DD')}')
      // SELECT
      //   *
      // FROM temp
      // WHERE date IN (SELECT
      //   date
      // FROM temp
      // GROUP BY date
      // HAVING COUNT(date) = 2)
      // ORDER BY date, name
      // `

      const query = `
      WITH temp
      AS (SELECT
        date,
        name + ' (' + unit + ')' AS name,
        price as value
      FROM macroEconomic.dbo.HangHoa
      WHERE name IN (N'Dầu Brent', N'Khí Gas')
      AND date BETWEEN '${moment()
        .subtract(1, 'year')
        .format('YYYY-MM-DD')}' AND '${moment().format('YYYY-MM-DD')}')
      SELECT
        *
      FROM temp
      WHERE date IN (SELECT
        date
      FROM temp
      GROUP BY date
      HAVING COUNT(date) = 2)
      ORDER BY date, name
      `;

      const query_1 = `
      WITH temp
      AS (SELECT
        date,
        name + ' (' + unit + ')' AS name,
        price as value
      FROM macroEconomic.dbo.HangHoa
      WHERE name IN (N'Đồng', N'Vàng')
      AND date BETWEEN '${moment()
        .subtract(1, 'year')
        .format('YYYY-MM-DD')}' AND '${moment().format('YYYY-MM-DD')}')
      SELECT
        *
      FROM temp
      WHERE date IN (SELECT
        date
      FROM temp
      GROUP BY date
      HAVING COUNT(date) = 2)
      ORDER BY date, name
      `;

      const query_3 = `
      WITH temp
      AS (SELECT
        date,
        name + ' (' + unit + ')' AS name,
        price as value
      FROM macroEconomic.dbo.HangHoa
      WHERE name IN (N'Thép HRC', N'Thép')
      AND date BETWEEN '${moment()
        .subtract(1, 'year')
        .format('YYYY-MM-DD')}' AND '${moment().format('YYYY-MM-DD')}')
      SELECT
        *
      FROM temp
      WHERE date IN (SELECT
        date
      FROM temp
      GROUP BY date
      HAVING COUNT(date) = 2)
      ORDER BY date, name
      `;

      const query_4 = `
      WITH temp
      AS (SELECT
        date,
        name + ' (' + unit + ')' AS name,
        price as value
      FROM macroEconomic.dbo.HangHoa
      WHERE name IN (N'Bông', N'Đường')
      AND date BETWEEN '${moment()
        .subtract(1, 'year')
        .format('YYYY-MM-DD')}' AND '${moment().format('YYYY-MM-DD')}')
      SELECT
        *
      FROM temp
      WHERE date IN (SELECT
        date
      FROM temp
      GROUP BY date
      HAVING COUNT(date) = 2)
      ORDER BY date, name
      `;

      const query_5 = `
      WITH temp
      AS (SELECT
        date,
        name + ' (' + unit + ')' AS name,
        price as value
      FROM macroEconomic.dbo.HangHoa
      WHERE name IN (N'Cao su', N'Ure')
      AND date BETWEEN '${moment()
        .subtract(1, 'year')
        .format('YYYY-MM-DD')}' AND '${moment().format('YYYY-MM-DD')}')
      SELECT
        *
      FROM temp
      WHERE date IN (SELECT
        date
      FROM temp
      GROUP BY date
      HAVING COUNT(date) = 2)
      ORDER BY date, name
      `;

      const query_2 = `
      WITH temp
      AS (SELECT
        date,
        name,
        closePrice as value
      FROM macroEconomic.dbo.WorldIndices
      WHERE name IN (N'Dollar Index', N'U.S.10Y')
      AND date BETWEEN '${moment()
        .subtract(1, 'year')
        .format('YYYY-MM-DD')}' AND '${moment().format('YYYY-MM-DD')}')
      SELECT
        *
      FROM temp
      WHERE date IN (SELECT
        date
      FROM temp
      GROUP BY date
      HAVING COUNT(date) = 2)
      ORDER BY date, name
      `;
      const [data, data_2, data_1, data_3, data_4, data_5] = await Promise.all([
        this.mssqlService.query<ExchangeRateUSDEURResponse[]>(query),
        this.mssqlService.query<ExchangeRateUSDEURResponse[]>(query_2),
        this.mssqlService.query<ExchangeRateUSDEURResponse[]>(query_1),
        this.mssqlService.query<ExchangeRateUSDEURResponse[]>(query_3),
        this.mssqlService.query<ExchangeRateUSDEURResponse[]>(query_4),
        this.mssqlService.query<ExchangeRateUSDEURResponse[]>(query_5),
      ]);
      // return {
      //   data_0: data.filter(item => item.name.includes('Dầu Brent') || item.name.includes('Khí Gas'))
      // }

      return ExchangeRateUSDEURResponse.mapToListV2([
        ...data,
        ...data_2,
        ...data_1,
        ...data_3,
        ...data_4,
        ...data_5,
      ]);
    } catch (e) {
      throw new CatchException(e);
    }
  }

  async getStockRecommendWeek() {
    try {
      // const data: ISaveStockRecommendWeek[] = await this.redis.get(RedisKeys.saveStockRecommendWeek)
      // if (!data) return []

      // const price: { price: number, code: string }[] = await this.mssqlService.query(`select closePrice as price, code from marketTrade.dbo.tickerTradeVND where code in (${data.map(item => `'${item.code}'`).join(', ')}) and date = (select max(date) from marketTrade.dbo.tickerTradeVND)`)

      // return data.map(item => {
      //   const gia_thi_truong = (price.find(price => price.code == item.code)).price || 0
      //   return {
      //     ...item,
      //     gia_thi_truong,
      //     ty_suat_sinh_loi_ky_vong: (item.gia_muc_tieu / item.gia_khuyen_nghi - 1) * 100,
      //     ty_suat_loi_nhuan: item.is_buy == 1 ? (gia_thi_truong * 1000 / item.gia_khuyen_nghi - 1) * 100 : 0,
      //     ty_suat_sinh_loi_lo: item.gia_ban != 0 ? (item.gia_ban / item.gia_khuyen_nghi - 1) * 100 : 0
      //   }
      // })

      const query = `select code, date,
      GiaKhuyenNghi as gia_khuyen_nghi,
      GiaMucTieu as gia_muc_tieu,
      GiaDungLo as gia_dung_lo,
      TySuatSinhLoiKyVong as ty_suat_sinh_loi_ky_vong,
      ThoiGianNamGiuDukien as thoi_gian_nam_giu_du_kien,
      GhiChu as ghi_chu,
      GiaThiTruong as gia_thi_truong,
      TySuatloinhuan as ty_suat_loi_nhuan,
      GiaBan as gia_ban,
      TySuatSinhLoiLo as ty_suat_sinh_loi_lo,
      ThoiGianNamGiu as thoi_gian_nam_giu,
      GhiChu2 as ghi_chu_2
      from PHANTICH.dbo.KhuyenNghiTuan
      order by date asc
      `;
      const data = await this.mssqlService.query<
        GetStockRecommendWeekResponse[]
      >(query);

      const dataMapped = GetStockRecommendWeekResponse.mapToList(data);
      return dataMapped;
    } catch (e) {
      throw new CatchException(e);
    }
  }

  async setFlexiblePage(b: SetFlexiblePageDto) {
    try {
      const now = moment().format('YYYYMMDDHHmmss');
      let i = 1;
      for (const item of b.image) {
        await this.minio.put(
          `resources`,
          `report/week/flexible_page/${b.page}/${now}_${i}.jpg`,
          item.buffer,
          {
            'Content-Type': item.mimetype,
            'X-Amz-Meta-Testing': 1234,
          },
        );
        i++;
      }
      await this.redis.set(
        `${RedisKeys.flexiblePage}:${b.page}`,
        {
          image: b.image.map(
            (item, index) =>
              `resources/week/flexible_page/${b.page}/${now}_${index + 1}`,
          ),
          text: b.text,
        },
        { ttl: TimeToLive.OneDay },
      );
    } catch (e) {
      throw new CatchException(e);
    }
  }

  async getFlexiblePage() {
    try {
      const keys = await this.redis.store.keys(`${RedisKeys.flexiblePage}:*`);
      const data = await this.redis.store.mget(keys.join(','));
      return data;
    } catch (e) {
      throw new CatchException(e);
    }
  }

  async stockInfo(code: string) {
    const day_52_week = moment().subtract(52, 'week').format('YYYY-MM-DD');
    try {
      const query = `
        WITH max_date AS (
          SELECT MAX(date) AS date, ratioCode
          FROM [RATIO].[dbo].[ratio]
          WHERE code = '${code}'
          GROUP BY ratioCode
        ),
        min_max AS (
          SELECT code, MIN(closePrice * 1000) AS PRICE_LOWEST_CR_52W, MAX(closePrice * 1000) AS PRICE_HIGHEST_CR_52W
          FROM marketTrade.dbo.tickerTradeVND
          WHERE code = '${code}' AND date >= '${day_52_week}'
          GROUP BY code
        ),
        nuoc_ngoai AS (
          SELECT [TyleNDTNNdangnamgiu] * 100 AS [foreign], maCK AS code FROM [PHANTICH].[dbo].[soHuuNN] WHERE maCK = '${code}'
        ),
        pi AS (
          SELECT * FROM (SELECT [code], r.[ratioCode], [value]
          FROM [RATIO].[dbo].[ratio] r
          INNER JOIN max_date m ON m.ratioCode = r.ratioCode  AND m.date = r.date
          WHERE (r.ratioCode IN ('NMVALUE_AVG_CR_20D', 'NMVOLUME_AVG_CR_20D', 'STATE_OWNERSHIP')) AND code = '${code}') AS source PIVOT (SUM(value) FOR ratioCode IN ([NMVALUE_AVG_CR_20D], [NMVOLUME_AVG_CR_20D], [STATE_OWNERSHIP])) AS chuyen
        ),
        closePrice as (
          select top 1 closePrice, code from marketTrade.dbo.tickerTradeVND where code = '${code}' ORDER BY date DESC
        )
        SELECT c.code, g.closePrice, marketCap, shareout, [PRICE_HIGHEST_CR_52W] AS high, [PRICE_LOWEST_CR_52W] AS low, 
              [NMVOLUME_AVG_CR_20D] AS kl, [NMVALUE_AVG_CR_20D] AS gia_tri, EPS, PE, BVPS, PB, 
              [STATE_OWNERSHIP] AS nha_nuoc, [foreign] AS nuoc_ngoai, LV2, LV4, companyName
        FROM RATIO.dbo.ratioInday c
        INNER JOIN marketInfor.dbo.info i ON i.code = c.code
        INNER JOIN pi p ON i.code = c.code
        INNER JOIN min_max highlow ON highlow.code = c.code
        LEFT JOIN nuoc_ngoai n ON n.code = c.code
        INNER JOIN closePrice g ON g.code = c.code  
        WHERE c.code = '${code}' AND c.date = (SELECT MAX(date) FROM RATIO.dbo.ratioInday WHERE code = '${code}')
      `;
      const [data, data_redis] = await Promise.all([
        this.mssqlService.query(query) as any,
        this.redis.get(`${RedisKeys.reportTechnical}:${code}`) as any,
      ]);

      return {
        ...data[0],
        nuoc_ngoai: data[0]?.nuoc_ngoai || 0,
        text: data_redis?.text || [],
        table: data_redis?.table || [],
        img: data_redis?.img || '',
        is_sell: data_redis?.is_sell || '',
        gia_muc_tieu: data_redis?.gia_muc_tieu || 0,
        thoi_gian_nam_giu: data_redis?.thoi_gian_nam_giu || '',
        gia_khuyen_nghi: data_redis?.gia_khuyen_nghi || 0,
        loi_nhuan_ky_vong: data_redis?.loi_nhuan_ky_vong || 0,
        gia_ban_dung_lo: data_redis?.gia_ban_dung_lo || 0,
        analyst_name: data_redis?.analyst_name || '',
      };
    } catch (e) {
      throw new CatchException(e);
    }
  }

  async priceFluctuationCorrelation(code: string) {
    try {
      const date = await this.mssqlService.query(`
        with date_ranges as (
          select max(case when date <= '${moment().format('YYYY-MM-DD')}' then date else null end) as now, 
                 max(case when date <= '${moment().subtract(1, 'year').format('YYYY-MM-DD')}' then date else null end) as year
          from marketTrade.dbo.historyTicker
          where code = '${code}'
        )
        select now, year from date_ranges;
      `);

      const now = moment(date[0].now).format('YYYY-MM-DD');
      const year = moment(date[0].year).format('YYYY-MM-DD');

      const query_2 = `
        with base as (
          select TOP 1 WITH TIES closePrice, code from marketTrade.dbo.historyTicker where date = '${year}' and code = '${code}' ORDER BY date ASC
          union
          select closePrice, code from marketTrade.dbo.indexTradeVND where date = '${year}' and code = 'VNINDEX'
          union
          select sum(t.closePrice) as closePrice, (select LV2 from marketInfor.dbo.info where code = '${code}') as code
          from marketTrade.dbo.tickerTradeVND t
          inner join marketInfor.dbo.info i on i.code = t.code
          where date = '${year}' and i.LV2 = (select LV2 from marketInfor.dbo.info where code = '${code}')
        ),
        temp as (
          select (closePrice - (select closePrice from base where code = '${code}')) / (select closePrice from base where code = '${code}') * 100 as value, date, code 
          from marketTrade.dbo.historyTicker 
          where code = '${code}' and date between '${year}' and '${now}'
          union all
          select (closePrice - (select closePrice from base where code = 'VNINDEX')) / (select closePrice from base where code = 'VNINDEX') * 100 as value, date, code 
          from marketTrade.dbo.indexTradeVND 
          where code = 'VNINDEX' and date between '${year}' and '${now}'
        )
        select * from temp where date not in (select date from temp group by date having count(date) < 2) order by date asc, code desc;
      `;

      // union all
      // select (closePrice - (select closePrice from base where code = (select LV2 from marketInfor.dbo.info where code = '${code}'))) / (select closePrice from base where code = (select LV2 from marketInfor.dbo.info where code = '${code}')) * 100 as value, date, code from marketTrade.dbo.inDusTrade where code = (select LV2 from marketInfor.dbo.info where code = '${code}') and floor = 'ALL' and date between '${year}' and '${now}'
      const data = await this.mssqlService.query<InterestRateResponse[]>(query_2);

      return data.map((item) => ({
        ...item,
        date: UtilCommonTemplate.toDate(item.date) || '',
      }));
    } catch (e) {
      throw new CatchException(e);
    }
  }

  async priceChange(code: string) {
    try {
      const { latestDate, monthDate, month3Date, firstDateYear } =
        await this.getDateSessionV2(
          'marketTrade.dbo.tickerTradeVND',
          'date',
          `where type = 'STOCK'`,
        );

      const month = moment(monthDate).format('YYYY-MM-DD');
      const month_3 = moment(month3Date).format('YYYY-MM-DD');
      const ytd = moment(firstDateYear).format('YYYY-MM-DD');

      const same_day = UtilCommonTemplate.checkSameDate([
        latestDate,
        month,
        month_3,
        ytd,
      ]);
      const pivot = same_day.map((item) => `[${item}]`).join(',');

      const query = `
      WITH temp
      AS (SELECT
        closePrice,
        code,
        date
      FROM marketTrade.dbo.tickerTradeVND
      WHERE code = '${code}'
      AND date IN ('${latestDate}', '${month}', '${month_3}', '${ytd}')
      UNION ALL
      SELECT
        closePrice,
        code,
        date
      FROM marketTrade.dbo.indexTradeVND
      WHERE code = 'VNINDEX'
      AND date IN ('${latestDate}', '${month}', '${month_3}', '${ytd}')
      
      )
      SELECT
        ([${latestDate}] - [${month}]) / [${month}] * 100 AS month,
        ([${latestDate}] - [${month_3}]) / [${month_3}] * 100 AS month_3,
        ([${latestDate}] - [${ytd}]) / [${ytd}] * 100 AS ytd,
        code
      FROM (SELECT
        *
      FROM temp) AS source PIVOT (SUM(closePrice) FOR date IN (${pivot})) AS chuyen
      `;
      // UNION ALL
      // SELECT
      //   closePrice,
      //   code,
      //   date
      // FROM marketTrade.dbo.inDusTrade
      // WHERE code = (SELECT
      //   LV2
      // FROM marketInfor.dbo.info
      // WHERE code = '${code}')
      // AND floor = 'ALL'
      // AND date IN ('${latestDate}', '${month}', '${month_3}', '${ytd}')

      const data = await this.mssqlService.query(query);
      return data;
    } catch (e) {
      throw new CatchException(e);
    }
  }

  async buyingAndSellingStatistics(code: string) {
    try {
      // const query = `
      // SELECT
      //   totalBuyOrder as buy,
      //   totalSellOrder as sell,
      //   date
      // FROM marketTrade.dbo.orderTicker
      // WHERE code = '${code}'
      // AND date BETWEEN DATEADD(MONTH, -3, (SELECT
      //   MAX(date)
      // FROM marketTrade.dbo.orderTicker
      // WHERE code = '${code}')
      // ) AND (SELECT
      //   MAX(date)
      // FROM marketTrade.dbo.orderTicker
      // WHERE code = '${code}')
      // ORDER BY date
      // `

      const query = `
        WITH LatestDate AS (
            SELECT MAX(date) AS max_date
            FROM tradeIntraday.dbo.tickerTransVNDIntraday
        ),
        DateRange AS (
            SELECT DISTINCT date
            FROM marketTrade.dbo.tickerTradeVND
            WHERE date BETWEEN DATEADD(MONTH, -1, (SELECT max_date FROM LatestDate)) AND (SELECT max_date FROM LatestDate)
        ),
        AggregatedData AS (
            SELECT t.date, 
                   SUM(CASE WHEN action = 'B' THEN volume ELSE 0 END) AS buy, 
                   SUM(CASE WHEN action = 'S' THEN volume ELSE 0 END) AS sell, 
                   SUM(CASE WHEN action = 'B' THEN volume ELSE 0 END) * 1.0 / NULLIF(SUM(CASE WHEN action = 'S' THEN volume ELSE 0 END), 0) AS buy_sell
            FROM tradeIntraday.dbo.tickerTransVNDIntraday t 
            WHERE code = '${code}' GROUP BY t.date
        )
        SELECT dr.date, COALESCE(ad.buy, 0) AS buy, 
                        COALESCE(ad.sell, 0) AS sell, 
                        COALESCE(ad.buy_sell, 0) AS buy_sell
        FROM DateRange dr LEFT JOIN AggregatedData ad ON dr.date = ad.date ORDER BY dr.date ASC;
      `;

      const data = await this.mssqlService.query<BuyingAndSellingStatisticsResponse[]>(query);
      return BuyingAndSellingStatisticsResponse.mapToList(data);
    } catch (e) {
      throw new CatchException(e);
    }
  }

  async technicalIndex(code: string) {
    try {
      const { yearDate } = await this.getDateSessionV2('marketTrade.dbo.historyTicker', 'date')

      const data: { closePrice: number, date: string, highPrice: number, lowPrice: number, volume: number, netVal: number, openPrice: number }[] = await this.mssqlService.query(`
        select closePrice, highPrice, lowPrice, openPrice, volume, f.netVal, h.date
        from marketTrade.dbo.historyTicker h
        inner join marketTrade.dbo.[foreign] f on h.code = f.code and h.date = f.date
        where h.code = '${code}'
        order by h.date
      `)

      const day = data.map(item => item.date).filter(item => new Date(item) >= new Date(yearDate)).reverse()

      const price = data.map(item => item.closePrice / 1000)
      const lastPrice = price[price.length - 1]
      const highPrice = data.map(item => item.highPrice / 1000)
      const lowPrice = data.map(item => item.lowPrice / 1000)
      const openPrice = data.map(item => item.openPrice / 1000)
      const volume = data.map(item => item.volume)

      const volume_reverse = [...volume].reverse()
      const price_reverse = [...price].reverse()
      const high_reverse = [...highPrice].reverse()
      const low_reverse = [...lowPrice].reverse()
      const open_reverse = [...openPrice].reverse()
      const net_reverse = data.map(item => item.netVal).reverse()

      const rsi = calTech.rsi({ values: price, period: 14 }).reverse()
      const cci = calTech.cci({ close: price, low: lowPrice, high: highPrice, period: 14 }).reverse()
      const williams = calTech.williamsr({ close: price, low: lowPrice, high: highPrice, period: 14 }).reverse()
      const adx = calTech.adx({ close: price, low: lowPrice, high: highPrice, period: 14 }).reverse()
      const stochastic = calTech.stochastic({ close: price, low: lowPrice, high: highPrice, period: 14, signalPeriod: 3 }).reverse()
      const stochasticRsi = calTech.stochasticrsi({ values: price, kPeriod: 3, dPeriod: 3, rsiPeriod: 14, stochasticPeriod: 14 }).reverse()
      const macd = calTech.macd({ values: price, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, SimpleMAOscillator: false, SimpleMASignal: false }).reverse()
      const sar = calTech.psar({ high: highPrice, low: lowPrice, max: 0.2, step: 0.02 })
      const sar_reverse = [...sar].reverse()

      const ma10 = calTech.sma({ period: 10, values: price }).reverse()
      const ma20 = calTech.sma({ period: 20, values: price }).reverse()
      const ma50 = calTech.sma({ period: 50, values: price }).reverse()
      const ma100 = calTech.sma({ period: 100, values: price }).reverse()
      const ma200 = calTech.sma({ period: 200, values: price }).reverse()

      const volume_ma20 = calTech.sma({ period: 20, values: volume }).reverse()

      const arr = [5, 10, 20, 50, 100, 200]

      const table = arr.map(item => {
        const ma = calTech.sma({ period: item, values: price })
        const ema = calTech.ema({ period: item, values: price })

        return {
          name: `MA${item}`,
          single: this.ratingTechnicalIndex('ma', { value: ma[ma.length - 1], price: lastPrice }),
          hat: this.ratingTechnicalIndex('ma', { value: ema[ema.length - 1], price: lastPrice })
        }
      })

      table.push({
        name: `SAR`,
        single: this.ratingTechnicalIndex('sar', { value: sar[sar.length - 1], price: lastPrice }),
        hat: ''
      })

      const rsi_date = []
      const cci_date = []
      const williams_date = []
      const adx_date = []
      const stochastic_date = []
      const stochasticRsi_date = []
      const macd_date = []
      const macd_histogram_date = []
      const volume_ma20_date = []

      day.map((item, index) => {
        const date = UtilCommonTemplate.toDate(item)
        rsi_date.push({ value: rsi[index] || 0, date })
        cci_date.push({ value: cci[index] || 0, date })
        williams_date.push({ value: williams[index] || 0, date })
        adx_date.push({ ...(adx[index] ? adx[index] : {adx: 0, pdi: 0, mdi: 0}) , date })
        stochastic_date.push({ ...(stochastic[index] ? {k: stochastic[index]?.k || 0, d: stochastic[index]?.d || 0} : {k: 0, d: 0}), date })
        stochasticRsi_date.push({ k: stochasticRsi[index]?.k || 0, d: stochasticRsi[index]?.d || 0, date })
        macd_date.push({ k: macd[index]?.MACD || 0, d: macd[index]?.signal || 0, date })
        macd_histogram_date.push({ value: macd[index]?.histogram || 0, date })
        volume_ma20_date.push({
          closePrice: price_reverse[index] || 0,
          highPrice: high_reverse[index] || 0,
          lowPrice: low_reverse[index] || 0,
          openPrice: open_reverse[index] || 0,
          volume: volume_reverse[index] || 0,
          volume_ma20: volume_ma20[index] || 0,
          ma10: ma10[index] || 0,
          ma20: ma20[index] || 0,
          ma50: ma50[index] || 0,
          ma100: ma100[index] || 0,
          ma200: ma200[index] || 0,
          sar: sar_reverse[index] || 0,
          net: net_reverse[index] || 0,
          date: UtilCommonTemplate.changeDateUTC(item, 1),
        });
      });

      const chart = {
        rsi: {
          value: rsi[0],
          rate: this.ratingTechnicalIndex('rsi', { value: rsi[0] }),
          chart: rsi_date.reverse(),
        },
        stochastic: {
          value: stochastic[0],
          rate: this.ratingTechnicalIndex('stochastic', { k: stochastic[0].k, d: stochastic[0].d }),
          chart: stochastic_date.reverse()
        },
        cci: {
          value: cci[0],
          rate: this.ratingTechnicalIndex('cci', { value: cci[0] }),
          chart: cci_date.reverse()
        },
        stochasticRsi: {
          value: {
            k: stochasticRsi[0].k,
            d: stochasticRsi[0].d
          },
          rate: this.ratingTechnicalIndex('stochasticRsi', { value: stochasticRsi[0].k }),
          chart: stochasticRsi_date.reverse()
        },
        williams: {
          value: williams[0],
          rate: this.ratingTechnicalIndex('williams', { value: williams[0] }),
          chart: williams_date.reverse()
        },
        macd: {
          value: {
            macd: macd[0].MACD,
            signal: macd[0].signal
          },
          rate: this.ratingTechnicalIndex('macd', { macd: macd[0].MACD, signal: macd[0].signal }),
          chart: macd_date.reverse()
        },
        adx: {
          value: adx[0],
          rate: this.ratingTechnicalIndex('adx', { adx: adx[0].adx, pdi: adx[0].pdi, mdi: adx[0].mdi }),
          chart: adx_date.reverse()
        },
        macdHistogram: {
          value: macd[0].histogram,
          rate: this.ratingTechnicalIndex('macdHistogram', { histogramT: macd[0].histogram, histogramT1: macd[1].histogram }),
          chart: macd_histogram_date.reverse()
        }
      }

      return {
        ...chart,
        table,
        technicalSignal: this.countRate([chart.rsi.rate, chart.stochastic.rate, chart.cci.rate, chart.stochasticRsi.rate, chart.williams.rate, chart.macd.rate, chart.adx.rate, chart.macdHistogram.rate]),
        trendSignal: this.countRate(table.map(item => [item.single, item.hat]).flat()),
        generalSignal: this.countRate([chart.rsi.rate, chart.stochastic.rate, chart.cci.rate, chart.stochasticRsi.rate, chart.williams.rate, chart.macd.rate, chart.adx.rate, chart.macdHistogram.rate, ...table.map(item => [item.single, item.hat]).flat()]),
        chart: volume_ma20_date.reverse()
      }
    } catch (e) {
      throw new CatchException(e);
    }
  }

  ratingTechnicalIndex(name: 'ma' | 'rsi' | 'stochastic' | 'stochasticRsi' | 'macd' | 'macdHistogram' | 'adx' | 'williams' | 'cci' | 'sar',
    o: { value?: number, d?: number, k?: number, macd?: number, signal?: number, histogramT?: number, histogramT1?: number, pdi?: number, mdi?: number, adx?: number, price?: number }) {
    //0 - Tích cực, 1 - Tiêu cực, 2 - Trung lập
    let rate = 0;
    switch (name) {
      case 'rsi':
        if (o.value < 30) {
          rate = 0;
        } else if (o.value > 70) {
          rate = 1;
        } else {
          rate = 2;
        }
        break;
      case 'stochastic':
        if (o.k > o.d && o.k < 20) {
          rate = 0;
        } else if (o.k < o.d && o.k > 80) {
          rate = 1;
        } else {
          rate = 2;
        }
        break;
      case 'stochasticRsi':
        if (o.value < 20) {
          rate = 0;
        } else if (o.value > 80) {
          rate = 1;
        } else {
          rate = 2;
        }
        break;
      case 'macd':
        if (o.macd > o.signal) {
          rate = 0;
        } else if (o.macd < o.signal) {
          rate = 1;
        } else {
          rate = 2;
        }
        break;
      case 'macdHistogram':
        if (o.histogramT > o.histogramT1) {
          rate = 0;
        } else if (o.histogramT < o.histogramT1) {
          rate = 1;
        } else {
          rate = 2;
        }
        break;
      case 'adx':
        if (o.pdi > o.mdi) {
          rate = 0;
        } else if (o.pdi < o.mdi) {
          rate = 1;
        } else {
          rate = 2;
        }
        break;
      case 'williams':
        if (o.value < -80) {
          rate = 0;
        } else if (o.value > -20) {
          rate = 1;
        } else {
          rate = 2;
        }
        break;
      case 'cci':
        if (o.value < -100) {
          rate = 0;
        } else if (o.value > 100) {
          rate = 1;
        } else {
          rate = 2;
        }
        break;
      case 'ma':
        if (o.value > o.price) {
          rate = 1;
        } else if (o.value < o.price) {
          rate = 0;
        } else {
          rate = 2;
        }
        break;
      case 'sar':
        if (o.value < o.price) {
          rate = 0;
        } else if (o.value > o.price) {
          rate = 1;
        } else {
          rate = 2;
        }
        break;
      default:
        break;
    }
    switch (rate) {
      case 0:
        return 'Tích cực';
        break;
      case 1:
        return 'Tiêu cực';
        break;
      case 2:
        return 'Trung lập';
        break;
      default:
        break;
    }
  }

  countRate(str: string[]) {
    let positive = 0;
    let negative = 0;
    let neutral = 0;

    str.forEach((item) => {
      switch (item) {
        case 'Tích cực':
          positive = positive + 1;
          break;
        case 'Tiêu cực':
          negative = negative + 1;
          break;
        case 'Trung lập':
          neutral = neutral + 1;
          break;
        default:
          break;
      }
    });

    return {
      positive,
      negative,
      neutral,
    };
  }

  async getDateSessionV2(table: string, column: string, condition?: string) {
    try {
      const now = moment(
        (
          await this.mssqlService.query(
            `select max(${column}) as date from ${table}`,
          )
        )[0].date,
      ).format('YYYY-MM-DD');

      const date = await this.mssqlService.query(
        `with date_ranges as (
          select
              max(case when ${column} <= '${moment(now)
          .subtract(1, 'day')
          .format('YYYY-MM-DD')}' then ${column} else null end) as prev,
              max(case when ${column} <= '${moment(now)
          .subtract(1, 'week')
          .format('YYYY-MM-DD')}' then ${column} else null end) as week,
              max(case when ${column} <= '${moment(now)
          .subtract(1, 'month')
          .format('YYYY-MM-DD')}' then ${column} else null end) as month,
              max(case when ${column} <= '${moment(now)
          .subtract(3, 'month')
          .format('YYYY-MM-DD')}' then ${column} else null end) as month_3,
              max(case when ${column} <= '${moment(now)
          .subtract(1, 'year')
          .format('YYYY-MM-DD')}' then ${column} else null end) as year,
              max(case when ${column} <= '${moment(now)
          .startOf('year')
          .format('YYYY-MM-DD')}' then ${column} else null end) as ytd
          from ${table}
          ${condition ? condition : ''}
      )
      select prev, week, month, month_3, year, ytd
      from date_ranges;`,
      );

      return {
        latestDate: now,
        previousDate: date[0].prev,
        weekDate: date[0].week,
        monthDate: date[0].month,
        month3Date: date[0].month_3,
        yearDate: date[0].year,
        firstDateYear: date[0].ytd,
      };
    } catch (e) {
      throw new CatchException(e);
    }
  }

  async setInfoReportTechnical(value: SetInfoReportTechnicalDto) {
    try {
      await this.minio.put(
        `resources`,
        `report/technical/${value.img.originalName}`,
        value.img.buffer,
        {
          'Content-Type': value.img.mimetype,
          'X-Amz-Meta-Testing': 1234,
        },
      );
      await this.redis.set(
        `${RedisKeys.reportTechnical}:${value.code.toUpperCase()}`,
        {
          ...value,
          img: `/resources/report/technical/${value.img.originalName}`,
        },
        { ttl: TimeToLive.OneWeek },
      );
    } catch (e) {
      throw new CatchException(e);
    }
  }
}
