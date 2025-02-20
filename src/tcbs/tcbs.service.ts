import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import axios from 'axios';
import { Cache } from 'cache-manager';
import * as moment from 'moment';
import { TimeToLive } from '../enums/common.enum';
import { RedisKeys } from '../enums/redis-keys.enum';
import { MssqlService } from '../mssql/mssql.service';
import { UtilsRandomUserAgent } from './utils/utils.random-user-agent';
import { ContributePEPBResponse } from './reponse/contribute-pe-pb.dto';
import { DataHistoricalPEPB, HistoricalPEPBResponse } from './reponse/historical-pe-pb.dto';

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
      const startDate = moment().subtract(period, 'year').format('YYYY-MM-DD');
      const endDate = moment().format('YYYY-MM-DD');

      const query = `
        WITH Industry AS ( SELECT nganh FROM RATIO.dbo.phanNganhTcbs WHERE code = '${code}' ORDER BY date DESC OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY)
        SELECT s.date, s.PE AS pe, s.PB AS pb, i.PE AS industryPe, i.PB AS industryPb, idx.PE AS indexPe, idx.PB AS indexPb
        FROM RATIO.dbo.ratioIndayTcbs s
        LEFT JOIN Industry ind ON 1=1
        LEFT JOIN RATIO.dbo.ratioIndayTcbs i ON i.code = ind.nganh AND i.date = s.date AND i.type = 'industry'
        LEFT JOIN RATIO.dbo.ratioIndayTcbs idx ON idx.type = 'index' AND idx.date = s.date
        WHERE s.code = '${code}' AND s.date BETWEEN '${startDate}' AND '${endDate}'
        ORDER BY s.date ASC;
      `;
      const industry = `SELECT nganh FROM RATIO.dbo.phanNganhTcbs WHERE code = '${code}'`

      const [data, data_industry] = await Promise.all([
        this.mssqlService.query<DataHistoricalPEPB[]>(query),
        this.mssqlService.query<{ nganh: string }[]>(industry),
      ]);
      const industryName = data_industry.length > 0 ? data_industry[0].nganh : '';
      const result = new HistoricalPEPBResponse(data, industryName)
      
      await this.redis.set(`${RedisKeys.historicalPEPB}:${code}:${period}`, result, { ttl: TimeToLive.OneHour });
      return result;
    } catch (err) {
      console.error(err);
    }
  }

  async contributePEPB(query: any) {
    const { stock, period } = query;
  
    if (!stock || !period) {
      throw new Error("Stock and period are required");
    }
  
    const stocks = stock.split(',');
    const stockCondition = stocks.length === 1 ? `= '${stocks[0]}'` : `IN (${stocks.map((s) => `'${s}'`).join(',')})`;
  
    const startDate = moment().subtract(period, 'year').format('YYYY-MM-DD');
    const endDate = moment().format('YYYY-MM-DD');
  
    const query_sql = `
      SELECT code, 
             MIN(PE) AS min_PE, MAX(PE) AS max_PE, AVG(PE) AS avg_PE, 
             AVG(PE) + STDEV(PE) AS plus_1_std_PE, AVG(PE) - STDEV(PE) AS minus_1_std_PE, 
             MIN(PB) AS min_PB, MAX(PB) AS max_PB, AVG(PB) AS avg_PB, 
             AVG(PB) + STDEV(PB) AS plus_1_std_PB, AVG(PB) - STDEV(PB) AS minus_1_std_PB
      FROM [RATIO].[dbo].[ratioIndayTcbs]
      WHERE code ${stockCondition} AND date BETWEEN '${startDate}' AND '${endDate}' AND PE BETWEEN 0 AND 50
      GROUP BY code
      ORDER BY code;
    `;

    const query_sql_2 = `
      SELECT TOP 1 WITH TIES code, PE AS latest_PE, PB AS latest_PB
      FROM VISUALIZED_DATA.dbo.filterResource
      WHERE code ${stockCondition}
      ORDER BY date DESC;
    `;

    const query_industry = `
      WITH Industry AS (SELECT TOP 1 WITH TIES nganh FROM RATIO.dbo.phanNganhTcbs WHERE code IN ('${stocks[0]}') ORDER BY date DESC)
      SELECT r.code, 
             MIN(r.PE) AS min_PE, MAX(r.PE) AS max_PE, AVG(r.PE) AS avg_PE, 
             AVG(r.PE) + STDEV(r.PE) AS plus_1_std_PE, AVG(r.PE) - STDEV(r.PE) AS minus_1_std_PE, 
             MIN(r.PB) AS min_PB, MAX(r.PB) AS max_PB, AVG(r.PB) AS avg_PB, 
             AVG(r.PB) + STDEV(r.PB) AS plus_1_std_PB, AVG(r.PB) - STDEV(r.PB) AS minus_1_std_PB
      FROM RATIO.dbo.ratioIndayTcbs r
      JOIN Industry i ON r.code = i.nganh
      WHERE r.date BETWEEN '${startDate}' AND '${endDate}' AND r.PE BETWEEN 0 AND 50 AND r.type = 'industry'
      GROUP BY r.code
      ORDER BY r.code;
    `;

    const query_industry_2 = `
      WITH Industry AS (SELECT TOP 1 WITH TIES nganh FROM RATIO.dbo.phanNganhTcbs WHERE code IN ('${stocks[0]}') ORDER BY date DESC)
      SELECT TOP 1 WITH TIES r.code, r.PE AS latest_PE, r.PB AS latest_PB
      FROM RATIO.dbo.ratioIndayTcbs r
      JOIN Industry i ON r.code = i.nganh
      WHERE r.date BETWEEN '${startDate}' AND '${endDate}' AND r.PE BETWEEN 0 AND 50 AND r.type = 'industry'
      ORDER BY r.date DESC;
    `
  
    try {
      const [data, data_2, data_industry, data_industry_2] = await Promise.all([
        this.mssqlService.query<ContributePEPBResponse[]>(query_sql), 
        this.mssqlService.query(query_sql_2), 
        this.mssqlService.query<ContributePEPBResponse[]>(query_industry),
        this.mssqlService.query(query_industry_2), 
      ]);
  
      const dataMapped: ContributePEPBResponse[] = [
        ...(ContributePEPBResponse.mapToList(data_industry, data_industry_2) ?? []),
        ...(ContributePEPBResponse.mapToList(data, data_2) ?? [])
      ];
  
      return dataMapped;
    } catch (error) {
      throw new Error("Error retrieving data from database");
    }
  }
}
