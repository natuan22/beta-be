import { CACHE_MANAGER, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Cache } from 'cache-manager';
import { ChildProcess, fork } from 'child_process';
import * as moment from 'moment';
import { DataSource } from 'typeorm';
import { DB_SERVER } from '../constants';
import { TimeToLive, TransactionTimeTypeEnum } from '../enums/common.enum';
import { MarketMapEnum, SelectorTypeEnum } from '../enums/exchange.enum';
import { RedisKeys } from '../enums/redis-keys.enum';
import {
  CatchException,
  ExceptionResponse,
} from '../exceptions/common.exception';
import { LineChartInterface } from '../kafka/interfaces/line-chart.interface';
import { MssqlService } from '../mssql/mssql.service';
import { UtilCommonTemplate } from '../utils/utils.common';
import { GetExchangeQuery } from './dto/getExchangeQuery.dto';
import { GetLiquidityQueryDto } from './dto/getLiquidityQuery.dto';
import { GetMarketMapQueryDto } from './dto/getMarketMapQuery.dto';
import { MarketLiquidityQueryDto } from './dto/marketLiquidityQuery.dto';
import { MerchandisePriceQueryDto } from './dto/merchandisePriceQuery.dto';
import { NetForeignQueryDto } from './dto/netForeignQuery.dto';
import {
  ExchangeValueInterface,
  TickerByExchangeInterface,
} from './interfaces/exchange-value.interface';
import { IndustryFullInterface } from './interfaces/industry-full.interface';
import { InternationalIndexInterface } from './interfaces/international-index.interface';
import { MarketVolatilityRawInterface } from './interfaces/market-volatility.interface';
import { MerchandisePriceInterface } from './interfaces/merchandise-price.interface';
import { NetForeignInterface } from './interfaces/net-foreign.interface';
import { SessionDatesInterface } from './interfaces/session-dates.interface';
import { StockEventsInterface } from './interfaces/stock-events.interface';
import { TopNetForeignByExInterface } from './interfaces/top-net-foreign-by-ex.interface';
import { TopNetForeignInterface } from './interfaces/top-net-foreign.interface';
import { TopRocInterface } from './interfaces/top-roc-interface';
import { DomesticIndexResponse } from './responses/DomesticIndex.response';
import { IndustryResponse } from './responses/Industry.response';
import { InternationalIndexResponse } from './responses/InternationalIndex.response';
import { InternationalSubResponse } from './responses/InternationalSub.response';
import { LiquidContributeResponse } from './responses/LiquidityContribute.response';
import { MarketMapResponse } from './responses/market-map.response';
import { MarketEvaluationResponse } from './responses/MarketEvaluation.response';
import { MarketLiquidityResponse } from './responses/MarketLiquidity.response';
import { MarketVolatilityResponse } from './responses/MarketVolatiliy.response';
import { MerchandisePriceResponse } from './responses/MerchandisePrice.response';
import { NetForeignResponse } from './responses/NetForeign.response';
import { NetTransactionValueResponse } from './responses/NetTransactionValue.response';
import { StockEventsResponse } from './responses/StockEvents.response';
import { StockNewsResponse } from './responses/StockNews.response';
import { TopNetForeignResponse } from './responses/TopNetForeign.response';
import { TopNetForeignByExResponse } from './responses/TopNetForeignByEx.response';
import { TopRocResponse } from './responses/TopRoc.response';
import { UpDownTickerResponse } from './responses/UpDownTicker.response';

@Injectable()
export class StockService {
  constructor(
    @Inject(CACHE_MANAGER)
    private readonly redis: Cache,
    // @InjectDataSource() private readonly db: DataSource,
    @InjectDataSource(DB_SERVER) private readonly dbServer: DataSource,
    private readonly mssqlService: MssqlService,
  ) {}

  public async getExchangesVolume(
    startDate: Date | string,
    endDate: Date | string = startDate,
  ): Promise<any> {
    try {
      let exchange: any = await this.redis.get(
        `${RedisKeys.ExchangeVolume}:${startDate}:${endDate}`,
      );
      if (exchange) return exchange;

      const { latestDate }: SessionDatesInterface = await this.getSessionDate(
        '[marketTrade].[dbo].[tickerTradeVND]',
        'date',
        this.dbServer,
      );
      //Calculate exchange volume

      if (!exchange) {
        exchange = (
          await this.dbServer.query(
            `
                    SELECT c.floor AS exchange, SUM(t.totalVal) as value
                    FROM [marketTrade].[dbo].[tickerTradeVND] t
                    JOIN [marketInfor].[dbo].[info] c ON c.code = t.code
                    WHERE [date] >= @0 and [date] <= @1
                    AND c.type in ('STOCK', 'ETF')
                    GROUP BY c.floor
                `,
            [startDate || latestDate, endDate || latestDate],
          )
        ).reduce((prev, curr) => {
          return { ...prev, [curr.exchange]: curr.value };
        }, {});
        await this.redis.set(
          `${RedisKeys.ExchangeVolume}:${startDate}:${endDate}`,
          {
            ...exchange,
            ALL: exchange?.['HOSE'] + exchange?.['HNX'] + exchange?.['UPCOM'],
          },
        );
        return {
          ...exchange,
          ALL: exchange?.['HOSE'] + exchange?.['HNX'] + exchange?.['UPCOM'],
        };
      }
    } catch (e) {
      throw new CatchException(e);
    }
  }

  public async getTickerPrice() {
    try {
      const { latestDate }: SessionDatesInterface = await this.getSessionDate(
        '[marketTrade].[dbo].[tickerTradeVND]',
        'date',
        this.dbServer,
      );
      //Calculate exchange volume
      let tickerPrice: any = await this.redis.get(RedisKeys.TickerPrice);
      if (tickerPrice) return tickerPrice;

      if (!tickerPrice) {
        tickerPrice = (
          await this.dbServer.query(
            `
              SELECT code as ticker, closePrice as price
              FROM [marketTrade].[dbo].[tickerTradeVND]
              WHERE [date] = @0
            `,
            [latestDate],
          )
        ).reduce((prev, curr) => {
          return { ...prev, [curr.ticker]: curr.price };
        }, {});
        await this.redis.set(RedisKeys.TickerPrice, tickerPrice);
        return tickerPrice;
      }
    } catch (e) {}
  }

  //Get the nearest day have transaction in session, week, month...
  public async getSessionDate(
    table: string,
    column: string = 'date_time',
    instance: any = this.dbServer,
  ): Promise<SessionDatesInterface> {
    const redisData = await this.redis.get<SessionDatesInterface>(
      `${RedisKeys.SessionDate}:${table}:${column}`,
    );
    if (redisData) return redisData;

    let dateColumn = column;
    if (column.startsWith('[')) {
      dateColumn = column.slice(1, column.length - 1);
    }

    const lastYear = moment().subtract('1', 'year').format('YYYY-MM-DD');
    const firstDateYear = moment().startOf('year').format('YYYY-MM-DD');

    const dates = await instance.query(`
            SELECT DISTINCT TOP 20 ${column} FROM ${table}
            WHERE ${column} IS NOT NULL ORDER BY ${column} DESC 
        `);

    const query: string = `
          SELECT TOP 1 ${column}
          FROM ${table}
          WHERE ${column} IS NOT NULL
          AND ${column} >= @0
          ORDER BY ${column};
        `;
    const result = {
      latestDate: UtilCommonTemplate.toDate(dates[0]?.[dateColumn]),
      previousDate: UtilCommonTemplate.toDate(dates[1]?.[dateColumn]),
      weekDate: UtilCommonTemplate.toDate(dates[4]?.[dateColumn]),
      monthDate: UtilCommonTemplate.toDate(
        dates[dates.length - 1]?.[dateColumn],
      ),
      yearDate: UtilCommonTemplate.toDate(
        (await instance.query(query, [lastYear]))[0]?.[dateColumn],
      ),
      firstDateYear: UtilCommonTemplate.toDate(
        (await instance.query(query, [firstDateYear]))[0]?.[dateColumn],
      ),
    };

    await this.redis.set(`${RedisKeys.SessionDate}:${table}:${column}`, result);
    return result;
  }

  //Biến động thị trường
  async getMarketVolatility(): Promise<MarketVolatilityResponse[]> {
    try {
      const redisData: MarketVolatilityResponse[] = await this.redis.get(
        RedisKeys.MarketVolatility,
      );
      if (redisData) return redisData;

      const sessionDates: SessionDatesInterface = await this.getSessionDate(
        '[PHANTICH].[dbo].[database_chisotoday]',
      );

      const query: string = `
                SELECT ticker, close_price FROM [PHANTICH].[dbo].[database_chisotoday]
                WHERE date_time = @0 ORDER BY ticker DESC
            `;

      let dataToday: MarketVolatilityRawInterface[],
        dataYesterday: MarketVolatilityRawInterface[],
        dataLastWeek: MarketVolatilityRawInterface[],
        dataLastMonth: MarketVolatilityRawInterface[],
        dataLastYear: MarketVolatilityRawInterface[];

      [dataToday, dataYesterday, dataLastWeek, dataLastMonth, dataLastYear] =
        await Promise.all(
          Object.values(sessionDates).map((date: Date) => {
            return this.dbServer.query(query, [date]);
          }),
        );

      const result: MarketVolatilityResponse[] =
        new MarketVolatilityResponse().mapToList(
          dataToday.map((item) => {
            const previousData = dataYesterday.find(
              (i) => i.ticker === item.ticker,
            );
            const weekData = dataLastWeek.find((i) => i.ticker === item.ticker);
            const monthData = dataLastMonth.find(
              (i) => i.ticker === item.ticker,
            );
            const yearData = dataLastYear.find((i) => i.ticker === item.ticker);

            return {
              ticker: item.ticker,
              day_change_percent:
                ((item.close_price - previousData.close_price) /
                  previousData.close_price) *
                100,
              week_change_percent:
                ((item.close_price - weekData.close_price) /
                  weekData.close_price) *
                100,
              month_change_percent:
                ((item.close_price - monthData.close_price) /
                  monthData.close_price) *
                100,
              year_change_percent:
                ((item.close_price - yearData.close_price) /
                  yearData.close_price) *
                100,
            };
          }),
        );
      // Cache the mapped data in Redis for faster retrieval in the future, using the same key as used earlier
      await this.redis.set(
        RedisKeys.MarketVolatility,
        result,
        TimeToLive.Minute,
      );
      return result;
    } catch (error) {
      throw new CatchException(error);
    }
  }

  //Thanh khoản
  async getMarketLiquidity(
    q: MarketLiquidityQueryDto,
  ): Promise<MarketLiquidityResponse[]> {
    try {
      const { order } = q;
      //Check caching data is existed
      const redisData: MarketLiquidityResponse[] = await this.redis.get(
        `${RedisKeys.MarketLiquidity}:${order}`,
      );
      if (redisData) return redisData;
      // Get 2 latest date
      const { latestDate, previousDate }: SessionDatesInterface =
        await this.getSessionDate(
          '[marketTrade].[dbo].[tickerTradeVND]',
          'date',
          this.dbServer,
        );

      //Calculate exchange volume
      let exchange: ExchangeValueInterface[] = await this.getExchangesVolume(
        latestDate,
      );

      const query: string = `
                SELECT t.totalVal AS value, t.code as ticker, c.LV2 AS industry, c.floor AS exchange,
                ((t.totalVal - t2.totalVal) / NULLIF(t2.totalVal, 0)) * 100 AS value_change_percent
                FROM [marketTrade].[dbo].[tickerTradeVND] t
                JOIN [marketTrade].[dbo].[tickerTradeVND] t2 
                ON t.code = t2.code AND t2.[date] = @1
                JOIN [marketInfor].[dbo].[info] c ON c.code = t.code
                WHERE t.[date] = @0 AND c.type in ('STOCK', 'ETF')
            `;

      const data: TickerByExchangeInterface[] = await this.dbServer.query(
        query,
        [latestDate, previousDate],
      );
      const mappedData = new MarketLiquidityResponse().mapToList(
        data.map((item) => {
          return {
            ticker: item.ticker,
            industry: item.industry,
            value: item.value,
            value_change_percent: item.value_change_percent,
            contribute: (item.value / exchange[item.exchange]) * 100,
          };
        }),
      );
      let sortedData: MarketLiquidityResponse[];
      switch (+order) {
        case 0:
          sortedData = [...mappedData].sort(
            (a, b) => b.value_change_percent - a.value_change_percent,
          );
          break;
        case 1:
          sortedData = [...mappedData].sort(
            (a, b) => a.value_change_percent - b.value_change_percent,
          );
          break;
        case 2:
          sortedData = [...mappedData].sort(
            (a, b) => b.contribute - a.contribute,
          );
          break;
        case 3:
          sortedData = [...mappedData].sort(
            (a, b) => a.contribute - b.contribute,
          );
          break;
        default:
          sortedData = mappedData;
      }

      // Cache the mapped data in Redis for faster retrieval in the future, using the same key as used earlier
      await this.redis.set(
        `${RedisKeys.MarketLiquidity}:${order}`,
        sortedData,
        TimeToLive.Minute,
      );
      return sortedData;
    } catch (error) {
      throw new CatchException(error);
    }
  }

  //Phân ngành
  async getIndustry(exchange: string): Promise<any> {
    try {
      //Check caching data is existed
      const redisData: IndustryResponse[] = await this.redis.get(
        `${RedisKeys.Industry}:${exchange}`,
      );
      // if (redisData) return redisData;

      //Get 2 latest date
      const {
        latestDate,
        previousDate,
        weekDate,
        monthDate,
        firstDateYear,
      }: SessionDatesInterface = await this.getSessionDate(
        '[RATIO].[dbo].[ratioInday]',
        'date',
        this.dbServer,
      );

      const query = (date): string => `
      SELECT
        i.LV2 AS industry,
        t.code AS ticker,
        t.closePrice AS close_price,
        t.highPrice AS high,
        t.lowPrice AS low,
        t.date AS date_time
      FROM marketTrade.dbo.tickerTradeVND t
      INNER JOIN marketInfor.dbo.info i
        ON t.code = i.code
      WHERE t.date = '${date}'
    ${
      exchange == 'ALL'
        ? ``
        : exchange == 'HSX'
        ? `AND t.floor = 'HOSE'`
        : `AND t.floor = '${exchange}'`
    }
            `;
      // const marketCapQuery: string = `
      //           SELECT c.LV2 AS industry, p.date_time, SUM(p.mkt_cap) AS total_market_cap
      //           ${groupBy} FROM [PHANTICH].[dbo].[database_mkt] p JOIN [WEBSITE_SERVER].[dbo].[ICBID] c
      //           ON p.ticker = c.TICKER
      //           WHERE p.date_time IN
      //               ('${UtilCommonTemplate.toDate(latestDate)}',
      //               '${UtilCommonTemplate.toDate(previousDate)}',
      //               '${UtilCommonTemplate.toDate(weekDate)}',
      //               '${UtilCommonTemplate.toDate(monthDate)}',
      //               '${UtilCommonTemplate.toDate(
      //   firstDateYear,
      // )}' ) ${byExchange}
      //           AND c.LV2 != '#N/A' AND c.LV2 NOT LIKE 'C__________________'
      //           GROUP BY c.LV2 ${groupBy}, p.date_time
      //           ORDER BY p.date_time DESC
      //       `;
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
        ${
          exchange == 'ALL'
            ? ``
            : exchange == 'HSX'
            ? `AND f.floor = 'HOSE'`
            : `AND f.floor = '${exchange}'`
        }
        GROUP BY f.LV2, i.date ${exchange == 'ALL' ? `` : `, f.floor`} 
        ORDER BY i.date DESC
        `;

      const marketCapQuery2 = `
          with temp as (select distinct i.closePrice, i.shareout, i.code, f.LV2 ,date FROM RATIO.dbo.ratioInday i inner join marketInfor.dbo.info f on f.code = i.code
            where date in ('${UtilCommonTemplate.toDate(latestDate)}', 
            '${UtilCommonTemplate.toDate(previousDate)}', 
            '${UtilCommonTemplate.toDate(weekDate)}', 
            '${UtilCommonTemplate.toDate(monthDate)}', 
            '${UtilCommonTemplate.toDate(firstDateYear)}') 
            ${
              exchange == 'ALL'
                ? ``
                : exchange == 'HSX'
                ? `AND f.floor = 'HOSE'`
                : `AND f.floor = '${exchange}'`
            }
                      )
            select sum(closePrice * shareout) as total_market_cap, LV2 as industry, date as date_time from temp group by LV2, date ORDER BY date DESC
          `;

      const industryChild: ChildProcess = fork(
        __dirname + '/processes/industry-child.js',
      );
      industryChild.send({ marketCapQuery: marketCapQuery2 });
      const industryChanges = (await new Promise((resolve, reject): void => {
        industryChild.on('message', (industryChanges): void => {
          resolve(industryChanges);
        });
        industryChild.on('exit', (code, e): void => {
          if (code !== 0) reject(e);
        });
      })) as any;

      const industryDataChild: ChildProcess = fork(
        __dirname + '/processes/industry-data-child.js',
      );

      industryDataChild.send({
        query1: query(UtilCommonTemplate.toDate(latestDate)),
        query2: query(UtilCommonTemplate.toDate(previousDate)),
      });

      const result = (await new Promise((resolve, reject): void => {
        industryDataChild.on('message', (result: any): void => {
          resolve(result);
        });
        industryDataChild.on('exit', (code, e): void => {
          if (code !== 0) reject(e);
        });
      })) as any;

      //Count how many stock change (increase, decrease, equal, ....) by industry(ICBID.LV2)
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

      const buySellPressure: ChildProcess = fork(
        __dirname + '/processes/buy-sell-pressure-child.js',
      );
      buySellPressure.send({ exchange });

      const buySellData = (await new Promise((resolve, reject): void => {
        buySellPressure.on('message', (buySellData: any): void => {
          resolve(buySellData);
        });
        buySellPressure.on('exit', (code, e): void => {
          if (code !== 0) reject(e);
        });
      })) as any;

      //Map response
      const mappedData: IndustryResponse[] = [
        ...new IndustryResponse().mapToList(final),
      ].sort((a, b) => (a.industry > b.industry ? 1 : -1));

      //Caching data for the next request
      await this.redis.set(
        `${RedisKeys.Industry}:${exchange}`,
        {
          data: mappedData,
          buySellData: buySellData?.[0],
        },
        { ttl: TimeToLive.Minute },
      );

      return { data: mappedData, buySellData: buySellData?.[0] };
    } catch (error) {
      throw new CatchException(error);
    }
  }

  //Giao dịch ròng
  async getNetTransactionValue(
    q: GetExchangeQuery,
  ): Promise<NetTransactionValueResponse[]> {
    try {
      const { exchange } = q;

      // Lưu trữ các giá trị ngày vào biến để tránh tính toán nhiều lần
      const today = moment().format('YYYY-MM-DD');
      const threeMonthsAgo = moment().subtract(3, 'month').format('YYYY-MM-DD');
      const exchangeUpperCase = exchange.toUpperCase();

      // Thay đổi thứ tự parameters cho dễ đọc và logic hơn
      const parameters: string[] = [today, threeMonthsAgo, exchangeUpperCase];

      // Truy vấn SQL được tối ưu hóa
      const query: string = `
        SELECT 
          e.date AS date, 
          e.closePrice AS exchange_price, 
          e.code AS exchange,
          SUM(n.net_value_td) AS net_proprietary,
          SUM(n.net_value_canhan) AS net_retail,
          SUM(n.net_value_foreign) AS net_foreign
        FROM 
          marketTrade.dbo.indexTradeVND e
        JOIN 
          PHANTICH.dbo.BCN_netvalue n 
          ON e.date = n.date_time
        WHERE 
          e.code = @2
          AND e.date BETWEEN @1 AND @0 -- Tối ưu điều kiện thời gian trong khoảng
        GROUP BY 
          e.date, e.closePrice, e.code
        ORDER BY 
          e.date DESC
      `;

      // Trả về kết quả truy vấn sau khi map dữ liệu
      return new NetTransactionValueResponse().mapToList(
        await this.dbServer.query(query, parameters),
      );
    } catch (e) {
      // Sử dụng ngoại lệ để xử lý lỗi một cách tốt hơn
      throw new CatchException(e);
    }
  }

  //Tin tức thị trường
  async getNews(): Promise<StockNewsResponse[]> {
    try {
      const redisData: StockNewsResponse[] = await this.redis.get(
        RedisKeys.StockNews,
      );
      if (redisData) return redisData;
      const query = `
                SELECT TOP 80 * FROM [macroEconomic].[dbo].[TinTuc] WHERE Img != ''
                ORDER BY Date DESC
            `;
      const data = new StockNewsResponse().mapToList(
        await this.dbServer.query(query),
      );
      await this.redis.set(RedisKeys.StockNews, data);
      return data;
    } catch (e) {
      throw new CatchException(e);
    }
  }

  //Tin tức vĩ mô thế giới
  async getMacroNews(): Promise<StockNewsResponse[]> {
    try {
      const redisData: StockNewsResponse[] = await this.redis.get(
        RedisKeys.StockMacroNews,
      );
      if (redisData) return redisData;
      const query = `
                SELECT TOP 80 * FROM [macroEconomic].[dbo].[TinTucViMo]
                ORDER BY Date DESC
            `;
      const data = new StockNewsResponse().mapToList(
        await this.dbServer.query(query),
      );
      await this.redis.set(RedisKeys.StockMacroNews, data);
      return data;
    } catch (e) {
      throw new CatchException(e);
    }
  }

  //Chỉ số trong nước
  async getDomesticIndex() {
    try {
      const query: string = `
        with DomesticIndex as (
            SELECT code,
                  timeInday,
                  closePrice,
                  change,
                  totalVol,
                  totalVal,
                  perChange,
                  rank() over (partition by code order by timeInday desc) as rank
            FROM tradeIntraday.dbo.indexTradeVNDIntraday
            WHERE code in ('VNINDEX', 'VN30', 'VNALL', 'HNX', 'HNX30', 'UPCOM')
                and date = (select max(date) from tradeIntraday.dbo.indexTradeVNDIntraday)
        ) select * from DomesticIndex
        where rank = 1
        order by code desc;
      `;
      const dataToday: LineChartInterface[] = await this.mssqlService.query<
        LineChartInterface[]
      >(query);

      const mappedData: DomesticIndexResponse[] =
        new DomesticIndexResponse().mapToList(dataToday);

      return mappedData;
    } catch (e) {
      throw new CatchException(e);
    }
  }

  //Top giá trị ròng khối ngoại
  async getTopNetForeign(exchange): Promise<TopNetForeignResponse[]> {
    try {
      // const redisData: TopNetForeignResponse[] = await this.redis.get(
      //   RedisKeys.TopNetForeign,
      // );
      // if (redisData) return redisData;

      const { latestDate } = await this.getSessionDate(
        '[marketTrade].[dbo].[foreign]',
        'date',
        this.dbServer,
      );

      // Define a function query() that takes an argument order and returns a
      // SQL query string that selects the top 10 tickers
      // with the highest or lowest net value foreign for the latest date, depending on the order argument
      const query = (order: string): string => `
                SELECT TOP 10 f.code as ticker, f.netVal as net_value_foreign
                FROM [marketTrade].[dbo].[foreign] f
                JOIN [marketInfor].[dbo].[info] i
                on f.code = i.code
                WHERE f.date = @0 and i.floor = @1 and i.[type] = 'STOCK'
                ORDER BY netVal ${order}
            `;
      // Execute two SQL queries using the database object to retrieve the top 10 tickers
      // with the highest and lowest net value foreign
      // for the latest date, and pass the latest date as a parameter
      const [dataTop, dataBot]: [
        TopNetForeignInterface[],
        TopNetForeignInterface[],
      ] = await Promise.all([
        this.dbServer.query(query('DESC'), [latestDate, exchange]),
        this.dbServer.query(query('ASC'), [latestDate, exchange]),
      ]);

      // Concatenate the results of the two queries into a single array, and reverse the order of the bottom 10 tickers
      // so that they are listed in ascending order of net value foreign
      const mappedData = new TopNetForeignResponse().mapToList([
        ...dataTop,
        ...[...dataBot].reverse(),
      ]);
      // await this.redis.set(RedisKeys.TopNetForeign, mappedData);

      return mappedData;
    } catch (e) {
      throw new CatchException(e);
    }
  }

  //Khối ngoại mua bán ròng
  async getNetForeign(q: NetForeignQueryDto): Promise<NetForeignResponse[]> {
    try {
      const { exchange, transaction } = q;
      // const redisData: NetForeignResponse[] = await this.redis.get(
      //   `${RedisKeys.NetForeign}:${exchange}:${transaction}`,
      // );
      // if (redisData) return redisData;

      const { latestDate }: SessionDatesInterface = await this.getSessionDate(
        '[marketTrade].[dbo].[foreign]',
        'date',
        this.dbServer,
      );

      const query = (transaction: number): string => `
        SELECT c.floor as EXCHANGE, c.LV2, c.code as ticker, n.netVal AS total_value_${
          +transaction ? 'sell' : 'buy'
        }
        FROM [marketTrade].[dbo].[foreign] n
        JOIN [marketInfor].[dbo].[info] c
        ON c.code = n.code AND c.floor = @1
        WHERE date = @0 and n.netVal ${
          +transaction ? ' < 0 ' : ' > 0 '
        } and c.[type] = 'STOCK'
        ORDER BY netVal ${+transaction ? 'ASC' : 'DESC'}
    `;

      const data: NetForeignInterface[] = await this.dbServer.query(
        query(transaction),
        [latestDate, exchange],
      );
      const mappedData = new NetForeignResponse().mapToList(data);
      // await this.redis.set(
      //   `${RedisKeys.NetForeign}:${exchange}:${transaction}`,
      //   mappedData,
      // );
      return mappedData;
    } catch (e) {
      throw new CatchException(e);
    }
  }

  //Top thay đổi giữa 5 phiên theo sàn
  async getTopROC(q: GetExchangeQuery): Promise<TopRocResponse[]> {
    try {
      const { exchange } = q;
      let ex =
        exchange.toUpperCase() === 'UPCOM' ? 'UPCoM' : exchange.toUpperCase();
      ex = exchange.toUpperCase() === 'HOSE' ? 'HSX' : exchange.toUpperCase();

      const redisData: TopRocResponse[] = await this.redis.get(
        `${RedisKeys.TopRoc5}:${ex}`,
      );
      if (redisData) return redisData;

      const query = (order: string): string => `
                SELECT TOP 10 t1.ticker, ((t1.gia - t2.gia) / t2.gia) * 100 AS ROC_5
                FROM [COPHIEUANHHUONG].[dbo].[${ex}] t1
                JOIN [COPHIEUANHHUONG].[dbo].[${ex}] t2
                ON t1.ticker = t2.ticker AND t2.date = @1
                WHERE t1.date = @0
                ORDER BY ROC_5 ${order}
            `;

      const { latestDate, weekDate }: SessionDatesInterface =
        await this.getSessionDate(`[COPHIEUANHHUONG].[dbo].[${ex}]`, 'date');

      const [dataTop, dataBot]: [TopRocInterface[], TopRocInterface[]] =
        await Promise.all([
          this.dbServer.query(query('DESC'), [latestDate, weekDate]),
          this.dbServer.query(query('ASC'), [latestDate, weekDate]),
        ]);

      const mappedData: TopRocResponse[] = new TopRocResponse().mapToList([
        ...dataTop,
        ...[...dataBot].reverse(),
      ]);
      await this.redis.set(`${RedisKeys.TopRoc5}:${ex}`, mappedData);
      return mappedData;
    } catch (e) {
      throw new CatchException(e);
    }
  }

  //Top mua bán ròng khối ngoại thay đổi giữa 5 phiên theo sàn
  async getTopNetForeignChangeByExchange(
    q: GetExchangeQuery,
  ): Promise<TopNetForeignByExResponse[]> {
    try {
      const { exchange } = q;
      const redisData: TopNetForeignByExResponse[] = await this.redis.get(
        `${RedisKeys.TopNetForeignByEx}:${exchange.toUpperCase()}`,
      );
      // if (redisData) return redisData;

      const { latestDate, weekDate }: SessionDatesInterface =
        await this.getSessionDate(`[PHANTICH].[dbo].[BCN_netvalue]`);

      const query = (order: string): string => `
                SELECT TOP 10 t1.ticker, c.floor AS exchange, 
                    SUM(t1.net_value_foreign) AS net_value
                FROM [PHANTICH].[dbo].[BCN_netvalue] t1
                JOIN [marketInfor].[dbo].[info] c
                ON t1.ticker = c.code
                WHERE c.floor = '${exchange.toUpperCase()}'
                AND t1.date_time >= @1
                AND t1.date_time <= @0
                GROUP BY t1.ticker, c.floor
                ORDER BY net_value ${order}
            `;

      const [dataTop, dataBot]: [
        TopNetForeignByExInterface[],
        TopNetForeignByExInterface[],
      ] = await Promise.all([
        this.dbServer.query(query('DESC'), [latestDate, weekDate]),
        this.dbServer.query(query('ASC'), [latestDate, weekDate]),
      ]);

      const mappedData: TopNetForeignByExResponse[] =
        new TopNetForeignByExResponse().mapToList([
          ...dataTop,
          ...[...dataBot].reverse(),
        ]);

      await this.redis.set(
        `${RedisKeys.TopNetForeignByEx}:${exchange.toUpperCase()}`,
        mappedData,
      );
      return mappedData;
    } catch (e) {
      throw new CatchException(e);
    }
  }

  //Chỉ số quốc tế
  async getMaterialPrice(): Promise<InternationalIndexResponse[]> {
    try {
      const redisData: InternationalIndexResponse[] = await this.redis.get(
        RedisKeys.InternationalIndex,
      );
      if (redisData) return redisData;

      const { latestDate }: SessionDatesInterface = await this.getSessionDate(
        '[PHANTICH].[dbo].[data_chisoquocte]',
        'date_time',
        this.dbServer,
      );
      const date2: SessionDatesInterface = await this.getSessionDate(
        `[macroEconomic].[dbo].[HangHoa]`,
        'lastUpdated',
        this.dbServer,
      );

      const data3 = await this.dbServer.query(`
        select top 3 code as ticker, 
          closePrice as diemso, perChange as percent_d
        from [marketTrade].[dbo].[tickerTradeVND]
        order by date desc, perChange desc
      `);

      const query: string = `
                SELECT name AS ticker,lastUpdated AS date_time, price AS diemso, unit, 
                change1D AS percent_d,
                change5D AS percent_w,
                change1M AS percent_m, changeYTD AS percent_ytd
                FROM [macroEconomic].[dbo].[HangHoa]
                WHERE lastUpdated >= @0 and (name like '%WTI%' OR name like 'USD/VND' OR name like 'Vàng')
            `;
      const data2 = new InternationalSubResponse().mapToList(
        await this.dbServer.query(query, [date2.latestDate]),
      );

      const data: InternationalIndexInterface[] = await this.dbServer.query(
        `
                SELECT * FROM [PHANTICH].[dbo].[data_chisoquocte]
                WHERE date_time = @0
            `,
        [latestDate],
      );

      const mappedData: InternationalIndexResponse[] =
        new InternationalIndexResponse().mapToList([
          ...data,
          ...data2,
          ...data3,
        ]);
      await this.redis.set(RedisKeys.InternationalIndex, mappedData);
      return mappedData;
    } catch (e) {
      throw new CatchException(e);
    }
  }

  async getMaterialPriceV2() {
    try {
      const query = `
      WITH mx_date_h
      AS (SELECT
        MAX(lastUpdated) AS date,
        name AS code
      FROM macroEconomic.dbo.HangHoa
      WHERE unit != ''
      AND id IS NOT NULL
      GROUP BY name),
      temp
      AS (SELECT
        name,
        closePrice,
        date,
        (closePrice - LEAD(closePrice) OVER (PARTITION BY name ORDER BY date DESC)) / LEAD(closePrice) OVER (PARTITION BY name ORDER BY date DESC) * 100 AS prev,
        (closePrice - LEAD(closePrice, 5) OVER (PARTITION BY name ORDER BY date DESC)) / LEAD(closePrice, 5) OVER (PARTITION BY name ORDER BY date DESC) * 100 AS week,
        (closePrice - LEAD(closePrice, 19) OVER (PARTITION BY name ORDER BY date DESC)) / LEAD(closePrice, 19) OVER (PARTITION BY name ORDER BY date DESC) * 100 AS month
      FROM macroEconomic.dbo.WorldIndices),
      max_date
      AS (SELECT
        MAX(date) AS date,
        name
      FROM temp
      GROUP BY name),
      ytd_date
      AS (SELECT
        MIN(date) AS date,
        name
      FROM macroEconomic.dbo.WorldIndices
      WHERE YEAR(date) = YEAR(GETDATE())
      GROUP BY name),
      ytd_price
      AS (SELECT
        t.name,
        t.date,
        t.closePrice
      FROM temp t
      INNER JOIN ytd_date y
        ON t.name = y.name
        AND t.date = y.date),

      temp_1
      AS (SELECT
        code,
        closePrice,
        date,
        (closePrice - LEAD(closePrice) OVER (PARTITION BY code ORDER BY date DESC)) / LEAD(closePrice) OVER (PARTITION BY code ORDER BY date DESC) * 100 AS prev,
        (closePrice - LEAD(closePrice, 5) OVER (PARTITION BY code ORDER BY date DESC)) / LEAD(closePrice, 5) OVER (PARTITION BY code ORDER BY date DESC) * 100 AS week,
        (closePrice - LEAD(closePrice, 19) OVER (PARTITION BY code ORDER BY date DESC)) / LEAD(closePrice, 19) OVER (PARTITION BY code ORDER BY date DESC) * 100 AS month
      FROM marketTrade.dbo.indexTradeVND
      WHERE code IN ('VNINDEX', 'HNX', 'UPCOM', 'VN30')),
      max_date_1
      AS (SELECT
        MAX(date) AS date,
        code
      FROM temp_1
      GROUP BY code),
      ytd_date_1
      AS (SELECT
        MIN(date) AS date,
        code
      FROM marketTrade.dbo.indexTradeVND
      WHERE YEAR(date) = YEAR(GETDATE())
      GROUP BY code),
      ytd_price_1
      AS (SELECT
        t.code,
        t.date,
        t.closePrice
      FROM temp_1 t
      INNER JOIN ytd_date_1 y
        ON t.code = y.code
        AND t.date = y.date)

      SELECT
        t.code AS ticker,
        t.date AS date_time,
        t.closePrice AS diemso,
        t.prev AS percent_d,
        t.week AS percent_w,
        t.month AS percent_m,
        (t.closePrice - y.closePrice) / y.closePrice * 100 AS percent_ytd
      FROM temp_1 t
      INNER JOIN max_date_1 m
        ON t.date = m.date
        AND t.code = m.code
      INNER JOIN ytd_price_1 y
        ON t.code = y.code

      UNION ALL
      SELECT
        t.name AS ticker,
        t.date AS date_time,
        t.closePrice AS diemso,
        t.prev AS percent_d,
        t.week AS percent_w,
        t.month AS percent_m,
        (t.closePrice - y.closePrice) / y.closePrice * 100 AS percent_ytd
      FROM temp t
      INNER JOIN max_date m
        ON t.date = m.date
        AND t.name = m.name
      INNER JOIN ytd_price y
        ON t.name = y.name

      UNION ALL
      SELECT
        name AS ticker,
        lastUpdated AS date_time,
        price AS diemso,
        CAST(SUBSTRING(change1D, CHARINDEX('(', change1D) + 1, CHARINDEX(')', change1D) - CHARINDEX('(', change1D) - 2) AS float) AS percent_d,
        CAST(SUBSTRING(change5D, CHARINDEX('(', change5D) + 1, CHARINDEX(')', change5D) - CHARINDEX('(', change5D) - 2) AS float) AS percent_w,
        CAST(SUBSTRING(change1M, CHARINDEX('(', change1M) + 1, CHARINDEX(')', change1M) - CHARINDEX('(', change1M) - 2) AS float) AS percent_m,
        CAST(SUBSTRING(changeYTD, CHARINDEX('(', changeYTD) + 1, CHARINDEX(')', changeYTD) - CHARINDEX('(', changeYTD) - 2) AS float) AS percent_ytd
      FROM macroEconomic.dbo.HangHoa h
      INNER JOIN mx_date_h m
        ON h.lastUpdated = m.date
        AND h.name = m.code
      `;
      const data = await this.mssqlService.query<InternationalIndexResponse[]>(
        query,
      );
      const dataMapped = new InternationalIndexResponse().mapToList(data);
      return dataMapped;
    } catch (e) {
      throw new CatchException(e);
    }
  }

  //Sự kiện thị trường
  async getStockEvents() {
    try {
      const redisData = await this.redis.get(RedisKeys.StockEvents);
      if (redisData) return redisData;

      const data: StockEventsInterface[] = await this.dbServer.query(`
                SELECT TOP 50 * FROM [PHANTICH].[dbo].[LichSuKien]
                ORDER BY NgayDKCC DESC
            `);

      const mappedData: StockEventsResponse[] =
        new StockEventsResponse().mapToList(data);
      await this.redis.set(RedisKeys.StockEvents, mappedData);
      return mappedData;
    } catch (e) {
      throw new CatchException(e);
    }
  }

  //Giá hàng hóa
  async getMerchandisePrice(
    q: MerchandisePriceQueryDto,
  ): Promise<MerchandisePriceResponse[]> {
    try {
      const { type } = q;

      const redisData: MerchandisePriceResponse[] = await this.redis.get(
        `${RedisKeys.MerchandisePrice}:${type}`,
      );
      // if (redisData) return redisData;

      const codeExchange = `'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'SGD', 'CAD', 'HKD', 'THB', 'CNY', 'MYR', 'INR', 'KRW', 'RUB', 'SEK', 'CHF', 'NOK', 'DKK', 'SAR', 'KWD'`;
      const sortExchange = UtilCommonTemplate.generateSortCase(
        codeExchange,
        'code',
      );

      const nameGoods = `N'Dầu Brent', N'Dầu Thô', N'Vàng', N'Cao su', N'Đường', N'Khí Gas', N'Thép', N'Xăng', N'Đồng', N'Gạo', N'Bông', N'Cà phê', N'Ure', N'Thép HRC'`;
      const sortGoods = UtilCommonTemplate.generateSortCase(nameGoods, 'name');

      const query: string = +type
        ? `
          WITH temp
            AS (SELECT
              code + '/VND' as name,
              bySell AS price,
              date,
              (bySell - LEAD(bySell) OVER (PARTITION BY code ORDER BY date DESC)) / LEAD(bySell) OVER (PARTITION BY code ORDER BY date DESC) * 100 AS Day,
              ${sortExchange}
            FROM macroEconomic.dbo.exchangeRateVCB)
            SELECT
              name,
              price,
              date,
              Day
            FROM temp
            WHERE date IN (SELECT TOP 1
              date
            FROM macroEconomic.dbo.exchangeRateVCB
            ORDER BY date DESC) 
            ORDER BY row_num
        `
        : `
          WITH temp
            AS (SELECT
              name,
              MAX(lastUpdated) AS lastUpdated,
              ${sortGoods}
            FROM [macroEconomic].[dbo].[HangHoa]
            WHERE unit != ''
            GROUP BY name)
            SELECT
              h.name,
              h.price,
              h.unit,
              h.change1D AS Day,
              h.changeMTD AS MTD,
              h.changeYTD AS YTD
            FROM [macroEconomic].[dbo].[HangHoa] h
            INNER JOIN temp t
              ON t.lastUpdated = h.lastUpdated
              AND t.name = h.name
            WHERE unit != ''
            AND id IS NOT NULL
            ORDER BY row_num
          `;
      const data: MerchandisePriceInterface[] = await this.dbServer.query(
        query,
      );
      const mappedData: MerchandisePriceResponse[] =
        MerchandisePriceResponse.mapToList(data, type);
      await this.redis.set(`${RedisKeys.MerchandisePrice}:${type}`, mappedData);
      return mappedData;
    } catch (e) {
      throw new CatchException(e);
    }
  }

  //Đánh giá thị trường
  async marketEvaluation(): Promise<MarketEvaluationResponse[]> {
    try {
      const redisData: MarketEvaluationResponse[] = await this.redis.get(
        RedisKeys.MarketEvaluation,
      );
      if (redisData) return redisData;

      const { latestDate }: SessionDatesInterface = await this.getSessionDate(
        '[PHANTICH].[dbo].[biendong-chiso-mainweb]',
        '[Date Time]',
      );

      // const query: string = `
      //     select * from [PHANTICH].[dbo].[biendong-chiso-mainweb]
      //     where [Date Time] = @0
      //     order by [Date Time] desc
      // `;
      // const data = await this.db.query(query, [latestDate]);

      const mappedData = new MarketEvaluationResponse().mapToList(
        await this.dbServer.query(`
                 select top 6 *, [Date Time] as date from [PHANTICH].[dbo].[biendong-chiso-mainweb]
                 order by [Date Time] desc
            `),
      );
      await this.redis.set(RedisKeys.MarketEvaluation, mappedData);
      return mappedData;
    } catch (e) {
      throw new CatchException(e);
    }
  }

  // Đóng góp thanh khoản
  async getLiquidityContribute(q: GetLiquidityQueryDto) {
    try {
      const { order, type, exchange } = q;
      const redisData = await this.redis.get(
        `${RedisKeys.LiquidityContribute}:${type}:${order}:${exchange}`,
      );
      if (redisData) return redisData;

      let group: string = ` `;
      let select: string = ` t.Ticker as symbol, `;
      let select2: string = `
                        sum(m.totalVal) as totalValueMil,
                        sum(m.totalVol) as totalVolume,
                        sum(t.Gia_tri_mua) - sum(t.Gia_tri_ban) as supplyDemandValueGap,
                        sum(t.Chenh_lech_cung_cau) as supplyDemandVolumeGap `;
      let ex: string =
        exchange.toUpperCase() == 'ALL'
          ? ' '
          : ` and c.EXCHANGE = '${exchange.toUpperCase()}'`;
      switch (parseInt(type)) {
        case SelectorTypeEnum.LV1:
          select = ' c.LV1 as symbol, ';
          group = ` and c.LV1 != '#N/A' group by c.LV1 `;
          break;
        case SelectorTypeEnum.LV2:
          select = ' c.LV2 as symbol, ';
          group = ` and c.LV2 != '#N/A' group by c.LV2 `;
          break;
        case SelectorTypeEnum.LV3:
          select = ' c.LV3 as symbol, ';
          group = ` and c.LV3 != '#N/A' group by c.LV3 `;
          break;
        default:
          select2 = ` 
                       m.totalVal as totalValueMil,
                       m.totalVol as totalVolume,
                       t.Gia_tri_mua - t.Gia_tri_ban as supplyDemandValueGap,
                       t.Chenh_lech_cung_cau as supplyDemandVolumeGap `;
      }
      const { latestDate, weekDate, monthDate, firstDateYear } =
        await this.getSessionDate(
          `[PHANTICH].[dbo].[TICKER_AC_CC]`,
          '[DateTime]',
          this.dbServer,
        );

      let startDate: Date | string;

      switch (+order) {
        case TransactionTimeTypeEnum.Latest:
          startDate = UtilCommonTemplate.toDate(latestDate);
          break;
        case TransactionTimeTypeEnum.OneWeek:
          startDate = UtilCommonTemplate.toDate(weekDate);
          break;
        case TransactionTimeTypeEnum.OneMonth:
          startDate = UtilCommonTemplate.toDate(monthDate);
          break;
        default:
          startDate = UtilCommonTemplate.toDate(firstDateYear);
          break;
      }

      const query: string = `
                select top 30 ${select} ${select2} from PHANTICH.dbo.TICKER_AC_CC t
                join PHANTICH.dbo.ICBID c on t.Ticker = c.TICKER 
                join marketTrade.dbo.tickerTradeVND m on c.TICKER = m.code
                and t.[DateTime] = m.date 
                where t.[DateTime] >= @0 and t.[DateTime] <= @1 ${ex} ${group} 
                order by totalValueMil desc
            `;

      const data = await this.dbServer.query(query, [
        startDate,
        UtilCommonTemplate.toDate(latestDate),
      ]);
      const exchangesVolume: any = await this.getExchangesVolume(
        startDate,
        UtilCommonTemplate.toDate(latestDate),
      );
      const mappedData = new LiquidContributeResponse().mapToList(
        data,
        exchangesVolume[exchange.toUpperCase()],
      );
      await this.redis.set(
        `${RedisKeys.LiquidityContribute}:${type}:${order}:${exchange}`,
        mappedData,
      );
      return mappedData;
    } catch (e) {
      throw new CatchException(e);
    }
  }

  //Bản đồ toàn thị trường
  async getMarketMap(q: GetMarketMapQueryDto) {
    try {
      const { exchange, order } = q;
      const ex = exchange.toUpperCase();
      const floor = ex == 'ALL' ? ` ('HOSE', 'HNX', 'UPCOM') ` : ` ('${ex}') `;

      const redisData = await this.redis.get(`${RedisKeys.MarketMap}:${ex}:${order}`);
      if (redisData) {
        return redisData;
      }

      let { latestDate }: SessionDatesInterface = await this.getSessionDate('[marketTrade].[dbo].[tickerTradeVND]', 'date', this.dbServer);
      let date = latestDate;

      if (+order === MarketMapEnum.Foreign) {
        date = (await this.getSessionDate('[marketTrade].[dbo].[foreign]', 'date', this.dbServer)).latestDate;
        const query: string = `
          WITH top15 AS (
            SELECT i.floor AS global, i.LV2 AS industry, c.code AS ticker, sum(c.buyVal) + sum(c.sellVal) AS value, 
                   ROW_NUMBER() OVER (PARTITION BY i.LV2 ORDER BY sum(c.buyVal) + sum(c.sellVal) DESC) AS rn
            FROM [marketTrade].[dbo].[foreign] c
            INNER JOIN [marketInfor].[dbo].[info] i ON c.code = i.code
            WHERE i.floor IN ${floor} AND c.date = @0 AND i.[type] IN ('STOCK', 'ETF') AND I.status = 'listed' AND i.LV2 != ''
            GROUP BY i.floor, i.LV2, c.code
          )
          SELECT * FROM (
            SELECT global, industry, ticker, value
            FROM top15
            WHERE rn <= 15
            UNION ALL
            SELECT i.floor AS global, i.LV2 AS industry, 'KHÁC' AS ticker, SUM(c.buyVal + c.sellVal) AS value
            FROM [marketTrade].[dbo].[foreign] c
            INNER JOIN [marketInfor].[dbo].[info] i ON c.code = i.code
            WHERE i.floor IN ${floor} AND c.date = @0 AND i.[type] IN ('STOCK', 'ETF') AND i.LV2 != '' AND I.status = 'listed' AND i.code NOT IN (SELECT ticker FROM top15 WHERE rn <= 15)
            GROUP BY i.floor, i.LV2
          ) AS resultredisData
          ORDER BY industry, CASE WHEN ticker = 'KHÁC' THEN 1 ELSE 0 END, value DESC;
        `;

        const mappedData = new MarketMapResponse().mapToList(await this.dbServer.query(query, [date]));
        await this.redis.set(`${RedisKeys.MarketMap}:${ex}:${order}`, mappedData, { ttl: TimeToLive.FiveMinutes });

        return mappedData;
      }

      if (+order === MarketMapEnum.MarketCap) {
        const floor = ex == 'ALL' ? ` ('HOSE', 'HNX', 'UPCOM') ` : ` ('${ex}') `;

        date = UtilCommonTemplate.toDate((await this.mssqlService.query(`select max(date) as date from RATIO.dbo.ratio where ratioCode = 'MARKETCAP'`))[0].date);
        const query: string = `
          WITH top15 AS (
              SELECT i.floor AS global, i.LV2 AS industry, c.code AS ticker, c.value, ROW_NUMBER() OVER (PARTITION BY i.LV2 ORDER BY c.value DESC) AS rn
              FROM [RATIO].[dbo].[ratio] c
              INNER JOIN [marketInfor].[dbo].[info] i ON c.code = i.code
              WHERE i.floor IN ${floor}
                AND c.date = @0 AND c.ratioCode = 'MARKETCAP'
                AND i.[type] IN ('STOCK', 'ETF')
                AND i.LV2 != ''
              GROUP BY i.floor, i.LV2, c.code, c.value
          )
          SELECT * FROM (
              SELECT global, industry, ticker, value
              FROM top15
              WHERE rn <= 15
              UNION ALL
              SELECT i.floor AS global, i.LV2 AS industry, 'khác' AS ticker, SUM(c.value) AS value
              FROM [RATIO].[dbo].[ratio] c
              INNER JOIN [marketInfor].[dbo].[info] i ON c.code = i.code
              WHERE i.floor IN ${floor}
                AND c.date = @0 AND c.ratioCode = 'MARKETCAP'
                AND i.[type] IN ('STOCK', 'ETF')
                AND i.LV2 != ''
                AND i.code NOT IN (SELECT ticker FROM top15 WHERE rn <= 15)
              GROUP BY i.floor, i.LV2
          ) AS result
          ORDER BY industry, CASE WHEN ticker = 'khác' THEN 1 ELSE 0 END, value DESC;
        `;

        const mappedData = new MarketMapResponse().mapToList(await this.dbServer.query(query, [date]));
        await this.redis.set(`${RedisKeys.MarketMap}:${ex}:${order}`, mappedData, { ttl: TimeToLive.FiveMinutes });

        return mappedData;
      }

      let field: string;
      switch (parseInt(order)) {
        case MarketMapEnum.Value:
          field = 'totalVal';
          break;
        case MarketMapEnum.Volume:
          field = 'totalVol';
          break;
        default:
          throw new ExceptionResponse(HttpStatus.BAD_REQUEST, 'order not found');
      }
      
      const query: string = `
        WITH top15 AS (
            SELECT i.floor AS global, i.LV2 AS industry, c.code AS ticker, c.${field} as value,
                  ROW_NUMBER() OVER (PARTITION BY i.LV2 ORDER BY c.${field} DESC) AS rn
            FROM [marketTrade].[dbo].[tickerTradeVND] c
            INNER JOIN [marketInfor].[dbo].[info] i ON c.code = i.code
            WHERE i.floor IN ${floor}
              AND c.date = @0
              AND i.[type] IN ('STOCK', 'ETF')
              AND i.LV2 != ''
            GROUP BY i.floor, i.LV2, c.code, c.${field}
        )
        SELECT * FROM (
            SELECT global, industry, ticker, value
            FROM top15
            WHERE rn <= 15
            UNION ALL
            SELECT i.floor AS global, i.LV2 AS industry, 'khác' AS ticker, SUM(c.${field}) AS value
            FROM [marketTrade].[dbo].[tickerTradeVND] c
            INNER JOIN [marketInfor].[dbo].[info] i ON c.code = i.code
            WHERE i.floor IN ${floor}
              AND c.date = @0
              AND i.[type] IN ('STOCK', 'ETF')
              AND i.LV2 != ''
              AND i.code NOT IN (SELECT ticker FROM top15 WHERE rn <= 15)
            GROUP BY i.floor, i.LV2
        ) AS result
        ORDER BY industry, CASE WHEN ticker = 'khác' THEN 1 ELSE 0 END, value DESC;
      `;

      const mappedData = new MarketMapResponse().mapToList(await this.dbServer.query(query, [date]));
      await this.redis.set(`${RedisKeys.MarketMap}:${ex}:${order}`, mappedData, { ttl: TimeToLive.FiveMinutes });

      return mappedData;
    } catch (e) {
      throw new CatchException(e);
    }
  }

  async getUpDownTicker(index: string): Promise<IndustryFullInterface> {
    try {
      const redisData = await this.redis.get<IndustryFullInterface>(
        `${RedisKeys.BienDongThiTruong}:${index}`,
      );
      if (redisData) return redisData;

      const { latestDate, previousDate } = await this.getSessionDate(
        '[marketTrade].[dbo].[tickerTradeVND]',
        'date',
        this.dbServer,
      );
      let high!: string;
      let low!: string;
      let indexCode!: string;

      switch (index) {
        case 'VNINDEX':
          high = '1.065';
          low = '0.935';
          indexCode = " and i.floor = 'HOSE'";
          break;
        case 'VN30':
          high = '1.065';
          low = '0.935';
          indexCode = " and i.floor = 'HOSE' and i.[indexCode] = 'VN30'";
          break;
        case 'VNALL':
          high = '1.065';
          low = '0.935';
          indexCode = " and i.floor = 'HOSE' or i.floor = 'HNX'";
          break;
        case 'HNX':
          high = '1.062';
          low = '0.938';
          indexCode = " and i.floor = 'HNX'";
          break;
        case 'HNX30':
          high = '1.062';
          low = '0.938';
          indexCode = " and i.floor = 'HNX' and i.[indexCode] = 'HNX30'";
          break;
        case 'UPCOM':
          high = '1.12';
          low = '0.88';
          indexCode = " and i.floor = 'UPCOM'";
          break;
        default:
          throw new ExceptionResponse(
            HttpStatus.BAD_REQUEST,
            'Index not found',
          );
          break;
      }

      const query: string = `
      select
        sum(case when now.closePrice = prev.closePrice then 1 else 0 end) as [equal],
        sum(case when now.closePrice >= prev.closePrice * ${high} then 1 else 0 end) as [high],
        sum(case when now.closePrice <= prev.closePrice * ${low} then 1 else 0 end) as [low],
        sum(case when now.closePrice > prev.closePrice and now.closePrice < prev.closePrice * ${high}  then 1 else 0 end) as [increase],
        sum(case when now.closePrice < prev.closePrice and now.closePrice > prev.closePrice * ${low} then 1 else 0 end) as [decrease]
      from (
          select code, closePrice from [marketTrade].[dbo].[tickerTradeVND] where [date] = @0
      ) now right join (
          select code, closePrice from [marketTrade].[dbo].[tickerTradeVND] where [date] = @1
      ) prev on now.code = prev.code
      join [marketInfor].[dbo].[info] i on i.code = now.code
      where now.closePrice is not null and prev.closePrice is not null and i.[type] = 'STOCK' ${indexCode};
      `;

      const data: IndustryFullInterface = await this.dbServer.query(query, [
        latestDate,
        previousDate,
      ]);

      const mappedData = new UpDownTickerResponse(data![0]);

      await this.redis.set(
        `${RedisKeys.BienDongThiTruong}:${index}`,
        mappedData,
      );

      return mappedData;
    } catch (e) {
      throw new CatchException(e);
    }
  }
}
