import { CACHE_MANAGER, HttpStatus, Inject, Injectable } from '@nestjs/common';
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

  async handleSignalWarning(type: any) {
    const stocks: any = await this.mssqlService.query(`SELECT code FROM marketInfor.dbo.info WHERE status = 'listed' AND type = 'STOCK' ORDER BY code`)
    return this.getDataSignal(stocks, type) // [{code: 'ANV'}]
  }

  async getDataSignal(stock: string | any[], type: any, realtimePrice?: number) {
    const listStock: any = !Array.isArray(stock) ? `= '${stock}'` : `in (${stock.map((item) => `'${item.code}'`).join(',')})`;
    
    const [dataRedis, dataLiquidityMarketCapRedis] = await Promise.all([
      this.redis.get(`price-signal:${listStock}`),
      this.redis.get(`data-liquidity-marketCap:${listStock}`)
    ]);
    
    let [data, data_2] = await Promise.all([
      !dataRedis ? (this.mssqlService.query(`
        SELECT closePrice, date, code from marketTrade.dbo.historyTicker 
        WHERE code ${listStock}
        ORDER BY date DESC;
      `) as any) : [],
      !dataLiquidityMarketCapRedis ? (this.mssqlService.query(`
        WITH LatestTrade AS (
          SELECT r.marketCap, r.date, r.code
          FROM RATIO.dbo.ratioInday r
          INNER JOIN marketInfor.dbo.info i ON i.code = r.code
          WHERE r.code ${listStock} AND r.type = 'STOCK' AND i.status = 'listed' 
          AND r.date = (SELECT MAX(date) FROM [RATIO].[dbo].[ratioInday] WHERE code = r.code)
        ),
        ranked_trades AS (
          SELECT code, totalVol, date, ROW_NUMBER() OVER (PARTITION BY code ORDER BY date DESC) AS rn
          FROM marketTrade.dbo.tickerTradeVND 
          WHERE type = 'STOCK' AND code ${listStock}
        ),
        average_volumes AS (
          SELECT code, 
                 AVG(CASE WHEN rn <= 5 THEN totalVol END) AS avg_totalVol_5d, 
                 AVG(CASE WHEN rn <= 20 THEN totalVol END) AS avg_totalVol_20d
          FROM ranked_trades 
          GROUP BY code
        ),
        info AS (
          SELECT code, floor, indexCode
          FROM marketInfor.dbo.info
          WHERE code ${listStock}
        )
        SELECT lt.marketCap, lt.date, lt.code, av.avg_totalVol_5d, av.avg_totalVol_20d, i.floor, i.indexCode
        FROM LatestTrade lt
        JOIN average_volumes av ON lt.code = av.code
        JOIN info i ON lt.code = i.code
        ORDER BY lt.code;
      `) as any) : [],
    ]);

    if (realtimePrice && !dataRedis) {
      await this.redis.set(`price-signal:${listStock}`, data, { ttl: 180 });
    }
  
    if (data_2 && data_2.length > 0 && !dataLiquidityMarketCapRedis) {
      await this.redis.set(`data-liquidity-marketCap:${listStock}`, data_2, { ttl: TimeToLive.TenMinutes });
    }
    
    if (dataRedis) data = dataRedis;
    if (dataLiquidityMarketCapRedis) data_2 = dataLiquidityMarketCapRedis;
    
    const arr = [];

    if (Array.isArray(stock)) {
      stock.map((item: any) => {
        const stockData = data.filter(res => res.code === item.code);
        stockData[stockData.length - 1]['closePrice'] = !realtimePrice ? data.find((price) => price.code == item.code).closePrice : realtimePrice;

        const result = this.calculateAllIndicators(stockData);

        arr.push(result);
      });
    }

    return SignalWarningResponse.mapToList(arr, data_2)
  }

  private calculateAllIndicators(data: any) {
    const price = data.map((item) => item.closePrice);
    const dateFormat = data.map((item) => ({ ...item, date: UtilCommonTemplate.toDateV2(item.date) }));

    const maPeriods = [5, 10, 15, 20, 50, 60, 100];
  
    // Tính SMA và EMA
    maPeriods.forEach((period) => {
      const maValues = calTech.sma({ values: price, period });
      const emaValues = calTech.ema({ values: price, period });
  
      dateFormat.forEach((item, index) => {
        item[`ma${period}`] = parseFloat((maValues[index] / 1000).toFixed(2));
        item[`ema${period}`] = parseFloat((emaValues[index] / 1000).toFixed(2));
      });
    });

    // Tính RSI
    const price_reverse = price.reverse();
    const rsiValues = calTech.rsi({ values: price_reverse, period: 14 }).reverse();
    dateFormat.forEach((item, index) => {
      item.rsi = parseFloat((rsiValues[index] || 0).toFixed(2));
    });
  
    // Tính MACD
    const macdValues = calTech.macd({ 
      values: price, 
      fastPeriod: 12, 
      slowPeriod: 26, 
      signalPeriod: 9, 
      SimpleMAOscillator: false, 
      SimpleMASignal: false 
    });
    const macd = macdValues.map((value) => value.MACD);
    const macdSignal = macdValues.map((value) => value.signal);
  
    dateFormat.forEach((item, index) => {
      item.macd = parseFloat((macd[index] / 1000 || 0).toFixed(2));
      item.macd_signal = parseFloat((macdSignal[index] / 1000 || 0).toFixed(2));
    });
  
    // Tính Bollinger Bands
    const bollingerBandValues = calTech.bollingerbands({ period: 20, stdDev: 2, values: price });
    const bbu = bollingerBandValues.map((value) => value.upper);
    const bbl = bollingerBandValues.map((value) => value.lower);
  
    dateFormat.forEach((item, index) => {
      item.BBU = parseFloat((bbu[index] / 1000 || 0).toFixed(2));
      item.BBL = parseFloat((bbl[index] / 1000 || 0).toFixed(2));
    });

    const today = UtilCommonTemplate.toDateV2(moment());
    const yesterday = UtilCommonTemplate.toDateV2(moment().subtract(1, 'day'));
    const todayData = dateFormat.find((item) => item.date === today) || {};
    const yesterdayData = dateFormat.find((item) => item.date === yesterday) || {};
    
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