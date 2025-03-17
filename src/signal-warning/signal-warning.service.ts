import { CACHE_MANAGER, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cache } from 'cache-manager';
import * as moment from 'moment';
import * as calTech from 'technicalindicators';
import { Repository } from 'typeorm';
import { DB_SERVER } from '../constants';
import { CatchException, ExceptionResponse } from '../exceptions/common.exception';
import { MssqlService } from '../mssql/mssql.service';
import { UtilCommonTemplate } from '../utils/utils.common';
import { SaveSignalDto } from './dto/save-signal.dto';
import { SignalWarningUserEntity } from './entities/signal-warning.entity';
import { SignalWarningResponse } from './response/signal-warning.response';
import { SignalWarningUserResponse } from './response/signalUser.response';
import { TimeToLive } from '../enums/common.enum';

@Injectable()
export class SignalWarningService {
  constructor(
    private readonly mssqlService: MssqlService,
    @Inject(CACHE_MANAGER)
    private readonly redis: Cache,
    @InjectRepository(SignalWarningUserEntity, DB_SERVER)
    private readonly signalUserRepo: Repository<SignalWarningUserEntity>,
  ) {}

  async get() {
    try {
      const redisData = await this.redis.get('signal-warning');
      if (redisData) return redisData;

      const query = `
        WITH latest_dates AS (
          SELECT DISTINCT TOP 2 date FROM VISUALIZED_DATA.dbo.filterResource ORDER BY date DESC
        ),
        temp AS (
          SELECT f.code, f.date, f.marketCap, f.floor, f.closePrice, f.ma5, f.ma10, f.ma15, f.ma20, f.ma50, f.ma60, f.ma100, 
                  f.ema5, f.ema10, f.ema15, f.ema20, f.ema50, f.ema60, f.ema100, f.rsi, f.macd, f.macd_signal, f.BBL, f.BBU,
                  LEAD(f.closePrice) OVER (PARTITION BY f.code ORDER BY f.date DESC) AS closePrice_pre, LEAD(f.ma5) OVER (PARTITION BY f.code ORDER BY f.date DESC) AS ma5_pre, 
                  LEAD(f.ma10) OVER (PARTITION BY f.code ORDER BY f.date DESC) AS ma10_pre, LEAD(f.ma15) OVER (PARTITION BY f.code ORDER BY f.date DESC) AS ma15_pre, 
                  LEAD(f.ma20) OVER (PARTITION BY f.code ORDER BY f.date DESC) AS ma20_pre, LEAD(f.rsi) OVER (PARTITION BY f.code ORDER BY f.date DESC) AS rsi_pre,
                  LEAD(f.macd) OVER (PARTITION BY f.code ORDER BY f.date DESC) AS macd_pre, LEAD(f.macd_signal) OVER (PARTITION BY f.code ORDER BY f.date DESC) AS macd_signal_pre
          FROM VISUALIZED_DATA.dbo.filterResource f
          WHERE f.date IN (SELECT date FROM latest_dates)
        )
        SELECT t.*, i.indexCode
        FROM temp t
        INNER JOIN marketInfor.dbo.info i ON i.code = t.code
        WHERE t.date = (SELECT MAX(date) FROM latest_dates) AND i.status = 'listed';
      `;

      const query_2 = `
        WITH ranked_trades AS (
          SELECT code, totalVal, date, row_number() OVER (PARTITION BY code ORDER BY date DESC) AS rn
          FROM marketTrade.dbo.tickerTradeVND
          WHERE type = 'STOCK'
        ),
        average_volumes AS (
          SELECT code, AVG(CASE WHEN rn <= 5 THEN totalVal END) AS avg_totalVal_5d, AVG(CASE WHEN rn <= 20 THEN totalVal END) AS avg_totalVal_20d
          FROM ranked_trades
          GROUP BY code
        )
        SELECT code, avg_totalVal_5d, avg_totalVal_20d
        FROM average_volumes
        ORDER BY code;
      `;
      const [data, data_2] = await Promise.all([this.mssqlService.query<SignalWarningResponse[]>(query), this.mssqlService.query(query_2)]);
      const dataMapped = SignalWarningResponse.mapToList(data, data_2);
      
      await this.redis.set('signal-warning', dataMapped, { ttl: TimeToLive.Minute });
      return dataMapped;
    } catch (error) {
      throw new CatchException(error);
    }
  }

  async getStockGroup(group: string): Promise<any> {
    try {
      const redisData = await this.redis.get('save-stock-group');
  
      if (Array.isArray(redisData)) {
        const filteredGroup = redisData.find((item: { name: string }) => item.name.toLowerCase() === group.toLowerCase());
  
        if (!filteredGroup) {
          throw new Error(`Group "${group}" không tồn tại trong dữ liệu`);
        }
  
        return filteredGroup;
      } else {
        throw new ExceptionResponse(HttpStatus.BAD_REQUEST, 'Dữ liệu lỗi');
      }
    } catch (error) {
      throw new CatchException(error);
    }
  }

  async saveSignal(user_id: number, b: SaveSignalDto) {
    try {
        const newSignals = b.value.map((valueItem) => {
            const newSignal = this.signalUserRepo.create({ value: JSON.stringify(valueItem), user: { user_id }});
            return newSignal;
        });

        await this.signalUserRepo.save(newSignals);
    } catch (error) {
        throw new CatchException(error);
    }
  }

  async getSignalUser(user_id: number) {
    try {
      const data = await this.signalUserRepo.find({ where: { user: { user_id } }, order: { created_at: 'ASC' } });
      
      const dataMapped = SignalWarningUserResponse.mapToList(data);
      return dataMapped;
    } catch (e) {
      throw new CatchException(e);
    }
  }

  async updateSignal(signal_id: number, user_id: number, b: SaveSignalDto) {
    try {
      const signal = await this.signalUserRepo.findOne({ where: { user: { user_id }, signal_id }});
  
      if (!signal) {
        throw new ExceptionResponse(HttpStatus.BAD_REQUEST, 'Signal not found');
      }
  
      await this.signalUserRepo.update({ signal_id }, { ...b, value: JSON.stringify(b.value) });
    } catch (error) {
      throw new CatchException(error);
    }
  }

  async deleteSignal(signal_id: number, user_id: number) {
    try {
      const signal = await this.signalUserRepo.findOne({ where: { user: { user_id }, signal_id }});
  
      if (!signal) {
        throw new ExceptionResponse(HttpStatus.BAD_REQUEST, 'Signal not found');
      }
  
      await this.signalUserRepo.delete({ signal_id });
    } catch (error) {
      throw new CatchException(error);
    }
  }

  async handleSignalWarning(stock: any) {
    const stocks: any = await this.mssqlService.query(`SELECT code FROM marketInfor.dbo.info WHERE status = 'listed' AND type = 'STOCK' ORDER BY code`)

    const dataSignal = await this.getDataSignal([{ code: stock }]); // [{code: 'ANV'}] //(stocks)
    const dataLiquidMarketCap = await this.getLiquidMarketCap([{ code: stock }]);

    return SignalWarningResponse.mapToList(dataSignal, dataLiquidMarketCap);
  }

  async getDataSignal(stock: any[], realtimePrice?: number) {
    try {
      // Validate input
      if (!Array.isArray(stock) || stock.length === 0) return [];

      // Create cache key
      const listStock = stock.map(item => `'${item.code}'`).join(',');
      const cacheKey = `price-signal:${listStock}:${realtimePrice || ''}`;

      // Check cache first
      const cachedData: any[] = await this.redis.get(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      // Get data from database
      const query = `SELECT TOP 150 closePrice, date, code FROM marketTrade.dbo.historyTicker WHERE code IN (${listStock}) ORDER BY date DESC;`;

      const data: any[] = await this.mssqlService.query(query);
      if (!data?.length) return [];

      // Process data efficiently using Map
      const stockMap = new Map();
      data.forEach(item => {
        if (!stockMap.has(item.code)) {
          stockMap.set(item.code, []);
        }
        stockMap.get(item.code).push(item);
      });

      // Calculate indicators for each stock
      const results = await Promise.all(
        stock.map(async (item) => {
          const stockData = stockMap.get(item.code) || [];
          if (stockData.length === 0) return null;

          // Update closePrice if realtimePrice is provided
          if (realtimePrice) {
            stockData[0] = { ...stockData[0], closePrice: realtimePrice };
          }

          // Calculate indicators
          const result = this.calculateAllIndicators(stockData);
          return result;
        })
      );

      // Filter out null results and cache valid ones
      const validResults = results.filter(Boolean);
      if (validResults.length > 0) {
        await this.redis.set(cacheKey, validResults, { ttl: 180 });
      }

      return validResults;
    } catch (error) {
      throw new CatchException(error);
    }
  }

  async getLiquidMarketCap(stock: any[]): Promise<any> {
    try {
      // Validate input
      if (!Array.isArray(stock) || stock.length === 0) return [];

      // Format stock list
      const listStock = `in (${stock.map(item => `'${item.code}'`).join(',')})`;
      const cacheKey = `data-liquidity-marketCap:${listStock}`;

      // Check cache
      const cachedData = await this.redis.get(cacheKey) as any[];
      if (cachedData?.length) return cachedData;

      // Optimize query with better indexing and filtering
      const query = `
        WITH LatestRatio AS (
          SELECT r.marketCap, r.date, r.code
          FROM (SELECT code, marketCap, date, ROW_NUMBER() OVER (PARTITION BY code ORDER BY date DESC) AS rn 
            FROM RATIO.dbo.ratioInday WITH (NOLOCK)
            WHERE type = 'STOCK' AND code ${listStock} AND date >= DATEADD(DAY, -7, GETDATE())
          ) r
          WHERE r.rn = 1
        ),
        StockInfo AS (SELECT code, floor, indexCode FROM marketInfor.dbo.info WITH (NOLOCK) WHERE status = 'listed' AND code ${listStock}),
        RecentTrades AS (
          SELECT code, totalVal, CASE WHEN rn <= 5 THEN 1 WHEN rn <= 20 THEN 2 ELSE 3 END AS period_type
          FROM (
            SELECT code, totalVal, ROW_NUMBER() OVER (PARTITION BY code ORDER BY date DESC) AS rn 
            FROM marketTrade.dbo.tickerTradeVND WITH (NOLOCK)
            WHERE type = 'STOCK' AND code ${listStock} AND date >= DATEADD(DAY, -30, GETDATE())
          ) AS t
          WHERE rn <= 20
        )
        SELECT lr.marketCap, lr.date, lr.code, si.floor, si.indexCode,
          ROUND(AVG(CASE WHEN rt.period_type = 1 THEN rt.totalVal ELSE NULL END), 2) AS avg_totalVal_5d,
          ROUND(AVG(CASE WHEN rt.period_type IN (1, 2) THEN rt.totalVal ELSE NULL END), 2) AS avg_totalVal_20d
        FROM LatestRatio lr
        INNER JOIN StockInfo si ON lr.code = si.code
        LEFT JOIN RecentTrades rt ON lr.code = rt.code
        GROUP BY lr.marketCap, lr.date, lr.code, si.floor, si.indexCode
        ORDER BY lr.code;
      `;

      // Execute query
      const data = await this.mssqlService.query(query) as any[];
      if (!data?.length) return [];

      // Cache results
      await this.redis.set(cacheKey, data, TimeToLive.FiveMinutes);

      return data;
    } catch (error) {
      throw new CatchException(error);
    }
  }

  private calculateAllIndicators(data: any) {
    const price = data.map((item) => item.closePrice);
    const dateFormat = data.map((item) => ({ ...item, date: UtilCommonTemplate.toDateV2(item.date) }));

    const maPeriods = [5, 10, 15, 20, 50, 60, 100];
  
    // Tính SMA và EMA
    const maResults = maPeriods.map(period => calTech.sma({ values: price, period }));
    const emaResults = maPeriods.map(period => calTech.ema({ values: price, period }));

    // Tính RSI
    const rsiResults = calTech.rsi({ values: [...price].reverse(), period: 14 }).reverse();
  
    // Tính MACD
    const macdResults = calTech.macd({ values: [...price].reverse(), fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, SimpleMAOscillator: false, SimpleMASignal: false }).reverse();
    const macd = macdResults.map(value => value.MACD);
    const macdSignal = macdResults.map(value => value.signal);
  
    // Tính Bollinger Bands
    const bollingerResults = calTech.bollingerbands({ period: 20, stdDev: 2, values: price });
    const bbu = bollingerResults.map(value => value.upper);
    const bbl = bollingerResults.map(value => value.lower);

    // Gán giá trị vào `dateFormat`
    dateFormat.forEach((item, index) => {
      maPeriods.forEach((period, i) => {
        item[`ma${period}`] = parseFloat((maResults[i][index] / 1000).toFixed(2));
        item[`ema${period}`] = parseFloat((emaResults[i][index] / 1000).toFixed(2));
      });

      item.rsi = parseFloat((rsiResults[index] || 0).toFixed(2));
      item.macd = parseFloat((macd[index] / 1000 || 0).toFixed(2));
      item.macd_signal = parseFloat((macdSignal[index] / 1000 || 0).toFixed(2));
      item.BBU = parseFloat((bbu[index] / 1000 || 0).toFixed(2));
      item.BBL = parseFloat((bbl[index] / 1000 || 0).toFixed(2));
    });

    // Lấy dữ liệu hôm nay và ngày giao dịch trước đó
    const today = UtilCommonTemplate.toDateV2(moment());
    
    // Tìm ngày giao dịch trước đó (bỏ qua thứ 7 và chủ nhật)
    let prevTradingDay = UtilCommonTemplate.toDateV2(moment().subtract(1, 'day'));
    let prevTradingDayData = dateFormat.find(item => item.date === prevTradingDay);
    
    // Nếu ngày hôm trước là thứ 7 hoặc chủ nhật, tìm ngày giao dịch gần nhất
    if (!prevTradingDayData) {
      for (let i = 2; i <= 5; i++) {
        const checkDate = UtilCommonTemplate.toDateV2(moment().subtract(i, 'day'));
        const checkData = dateFormat.find(item => item.date === checkDate);
        if (checkData) {
          prevTradingDay = checkDate;
          prevTradingDayData = checkData;
          break;
        }
      }
    }

    const todayData = dateFormat.find(item => item.date === today) || {};
    const yesterdayData = prevTradingDayData || {};
    
    // Kết hợp kết quả cho tất cả chỉ báo
    const result = {
      ...Object.fromEntries(
        Object.entries(yesterdayData).map(([key, value]) =>
          key.startsWith('ma') ||
          key.startsWith('ema') ||
          key.startsWith('rsi') ||
          key.startsWith('macd') ||
          key.startsWith('BB')
            ? [`${key}_pre`, value]
            : [key, value]
        )
      ),
      ...todayData,
      closePrice: todayData.closePrice ? parseFloat((todayData.closePrice / 1000).toFixed(2)) : 0,
      closePrice_pre: yesterdayData.closePrice ? parseFloat((yesterdayData.closePrice / 1000).toFixed(2)) : 0,
    }
    
    return result;
  }
}