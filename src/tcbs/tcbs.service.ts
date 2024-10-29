import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import axios from 'axios';
import { Cache } from 'cache-manager';
import { TimeToLive } from '../enums/common.enum';
import { RedisKeys } from '../enums/redis-keys.enum';
import { MssqlService } from '../mssql/mssql.service';
import { UtilsRandomUserAgent } from './utils/utils.random-user-agent';

@Injectable()
export class TCBSService {
  constructor(
    private readonly mssqlService: MssqlService,
    @Inject(CACHE_MANAGER) private readonly redis: Cache,
  ) {}

  async historicalPEPB(code: string, period: string) {
    const redisData = await this.redis.get(
      `${RedisKeys.historicalPEPB}:${code}:${period}`,
    );
    if (redisData) return redisData;

    try {
      const response = await axios.get(
        `https://apipubaws.tcbs.com.vn/tcanalysis/v1/evaluation/${code}/historical-chart?period=${period}&tWindow=D`,
        {
          headers: {
            'User-Agent': UtilsRandomUserAgent.getRandomUserAgent(),
          },
        },
      );

      await this.redis.set(
        `${RedisKeys.historicalPEPB}:${code}:${period}`,
        response.data,
        { ttl: TimeToLive.OneHour },
      );

      return response.data;
    } catch (err) {
      console.error(err);
    }
  }
}
