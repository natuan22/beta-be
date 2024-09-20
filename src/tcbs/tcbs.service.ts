import { CACHE_MANAGER, Inject, Injectable } from "@nestjs/common";
import axios from "axios";
import { Cache } from 'cache-manager';
import { TimeToLive } from "../enums/common.enum";
import { RedisKeys } from "../enums/redis-keys.enum";
import { MssqlService } from "../mssql/mssql.service";
import { UtilsRandomUserAgent } from "./utils/utils.random-user-agent";

@Injectable()
export class TCBSService {
  constructor(
    private readonly mssqlService: MssqlService,
    @Inject(CACHE_MANAGER) private readonly redis: Cache
  ) {}

  async historicalPEPB(code: string, period: string){
    const redisData = await this.redis.get(`${RedisKeys.historicalPEPB}:${code}:${period}`)
    if(redisData) return redisData

    try {
      const response = await axios.get(
        `https://apipubaws.tcbs.com.vn/tcanalysis/v1/evaluation/${code}/historical-chart?period=${period}&tWindow=D`,
        {
          headers: {
            "User-Agent": UtilsRandomUserAgent.getRandomUserAgent(),
          },
        }
      );
      
      await this.redis.set(`${RedisKeys.historicalPEPB}:${code}:${period}`, response.data, { ttl: TimeToLive.OneHour })
      
      return response.data;

    } catch (err) {
      console.error(err);
    }
  }

  async tradingInfo(code: string) {
    const redisData = await this.redis.get(`${RedisKeys.tradingInfo}:${code}`);
    if (redisData) return redisData;

    //wss://priceapi.bsc.com.vn/market/socket.io/?__sails_io_sdk_version=1.2.1&__sails_io_sdk_platform=browser&__sails_io_sdk_language=javascript&EIO=3&transport=websocket 
    try {
      const response = await axios.get(
        `https://priceapi.bsc.com.vn/datafeed/alltranslogs/${code}`,
        {
          headers: {
            "User-Agent": UtilsRandomUserAgent.getRandomUserAgent(),
          },
        }
      );

      const query = `
        select closePrice from marketTrade.dbo.tickerTradeVND
        where date = (select max(date) from tradeIntraday.dbo.tickerTradeVNDIntraday where date < (select max(date) from tradeIntraday.dbo.tickerTradeVNDIntraday)
        ) and code = '${code}'
      `
      const data_2 = await this.mssqlService.query(query)

      const dataFormat = response.data.d.map((item) => {
        return {
          ...item,
          formattedVal: item.formattedVol * item.formattedMatchPrice,
          highlight: item.formattedVol * item.formattedMatchPrice > 1_000_000_000,
        }
      })

      const dataMB = response.data.d.map((item) => {
        return {
          formattedTime: item.formattedTime,
          value: item.totalBuyVol !== "0" ? (item.totalSellVol / item.totalBuyVol) : 0, 
        }
      })

      const finalResponse = {
        "ticker": code,
        prevClosePrice: data_2[0].closePrice,
        totalVol: response.data.d[0].formattedAccVol,   //co atc, ato
        totalVal: response.data.d[0].formattedAccVal,   //co atc, ato
        totalBuyVol: response.data.d[0].totalSellVol,   //k co atc, ato
        totalSellVol: response.data.d[0].totalBuyVol,   //k co atc, ato
        data: dataFormat,
        dataMB: dataMB
      };

      await this.redis.set(`${RedisKeys.tradingInfo}:${code}`, finalResponse, { ttl: TimeToLive.HaftMinute })

      return finalResponse

    } catch (err) {
      console.error(err);
    }
  }
}