import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import axios from 'axios';
import { Cache } from 'cache-manager';
import * as moment from 'moment';
import { TimeToLive } from '../enums/common.enum';
import { RedisKeys } from '../enums/redis-keys.enum';
import { MssqlService } from '../mssql/mssql.service';
import { UtilsRandomUserAgent } from './utils/utils.random-user-agent';
import { ContributePEPBResponse } from './reponse/contribute-pe-pb.dto';

@Injectable()
export class TCBSService {
  constructor(
    private readonly mssqlService: MssqlService,
    @Inject(CACHE_MANAGER) private readonly redis: Cache,
  ) {}

  async historicalPEPB(code: string, period: string) {
    const redisData = await this.redis.get(`${RedisKeys.historicalPEPB}:${code}:${period}`);
    if (redisData) return redisData;

    try {
      const response = await axios.get(`https://apipubaws.tcbs.com.vn/tcanalysis/v1/evaluation/${code}/historical-chart?period=${period}&tWindow=D`, { headers: { 'User-Agent': UtilsRandomUserAgent.getRandomUserAgent() }});

      await this.redis.set(`${RedisKeys.historicalPEPB}:${code}:${period}`, response.data, { ttl: TimeToLive.OneHour });

      return response.data;
    } catch (err) {
      console.error(err);
    }
  }

  async contributePEPB(query: any) {
    const stocks = query.stock.split(',');
    const period = query.period;

    const listStock: any = !Array.isArray(stocks) ? `= '${stocks}'` : `in (${stocks.map((item) => `'${item}'`).join(',')})`;
    
    const query_sql = `
      SELECT code, 
             MIN(PE) AS min_PE, MAX(PE) AS max_PE, AVG(PE) AS avg_PE, 
             AVG(PE) + STDEV(PE) AS plus_1_std_PE, AVG(PE) - STDEV(PE) AS minus_1_std_PE, 
             MIN(PB) AS min_PB, MAX(PB) AS max_PB, AVG(PB) AS avg_PB, 
             AVG(PB) + STDEV(PB) AS plus_1_std_PB, AVG(PB) - STDEV(PB) AS minus_1_std_PB
      FROM [RATIO].[dbo].[ratioIndayTcbs]
      WHERE code ${listStock} AND date BETWEEN '${moment().subtract(period, 'year').format('YYYY-MM-DD')}' AND '${moment().format('YYYY-MM-DD')}'
      GROUP BY code
      ORDER BY code;
    `;

    const query_sql_2 = `
      WITH RankedData AS (
        SELECT code, PE AS latest_PE, PB AS latest_PB, ROW_NUMBER() OVER (PARTITION BY code ORDER BY date DESC) AS rn
        FROM VISUALIZED_DATA.dbo.filterResource
        WHERE code ${listStock}
      )
      SELECT code, latest_PE, latest_PB FROM RankedData WHERE rn = 1 ORDER BY code;
    `;
    
    const [data, data_2] = await Promise.all([this.mssqlService.query<ContributePEPBResponse[]>(query_sql), this.mssqlService.query(query_sql_2)]);
    const dataMapped = ContributePEPBResponse.mapToList(data, data_2);
      
    return dataMapped;
  }
}
