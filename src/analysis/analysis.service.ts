import { CACHE_MANAGER, Inject, Injectable } from "@nestjs/common";
import { Cache } from 'cache-manager';
import { MssqlService } from "../mssql/mssql.service";
import { AnalysisDto } from "./dto/analysis.dto";
import { AnalysisResponse } from "./response/analysis.reponse";
import { RedisKeys } from "../enums/redis-keys.enum";
import { TimeToLive } from "../enums/common.enum";

@Injectable()
export class AnalysisService {
  constructor(
    @Inject(CACHE_MANAGER)
    private readonly redis: Cache,
    private readonly mssqlService: MssqlService,
  ) {}
  private analysisType = [`'nhan-dinh-thi-truong'`, `'phan-tich-doanh-nghiep'`, `'bao-cao-nganh'`, `'phan-tich-ky-thuat'`, `'bao-cao-vi-mo'`, `'bao-cao-chien-luoc'`, `'bao-cao-trai-phieu-va-tien-te'`]
  async getAnalysis(q: AnalysisDto){
    const redisData = await this.redis.get(`${RedisKeys.analysisReport}:${q.type}`)
    if(redisData) return redisData

    const query = `
        SELECT 
            Route AS type,
            Title AS title,
            Date AS date,
            PDFLink AS link
        FROM WEBSITE_SERVER.dbo.PDF_BSI
        WHERE ${!q.type || +q.type == 0 ? `Route IN (
            'nhan-dinh-thi-truong',
            'phan-tich-doanh-nghiep',
            'bao-cao-nganh',
            'phan-tich-ky-thuat',
            'bao-cao-vi-mo',
            'bao-cao-chien-luoc',
            'bao-cao-trai-phieu-va-tien-te'
        )` : `Route = ${this.analysisType[+q.type - 1]}`} 
        ${q.type && +q.type === 1 ? `AND Date >= '2024-01-01'` : ''}
        ORDER BY Date desc
    `
    const data = await this.mssqlService.query<AnalysisResponse[]>(query)
    const dataMapped = AnalysisResponse.mapToList(data)

    const titlePriority = {
      'Báo cáo tuần': 1,
      'Bản tin thị trường cuối ngày': 2,
      'Diễn biến thị trường phiên sáng': 3,
      'Bản tin trước giờ giao dịch': 4
    };

    const getMainTitle = (title: any) => {
      if (title.startsWith('Báo cáo tuần')) return 'Báo cáo tuần';
      if (title.includes('Bản tin thị trường cuối ngày')) return 'Bản tin thị trường cuối ngày';
      if (title.includes('Diễn biến thị trường phiên sáng')) return 'Diễn biến thị trường phiên sáng';
      if (title.includes('Bản tin trước giờ giao dịch')) return 'Bản tin trước giờ giao dịch';
      return title;
    };

    // Custom sorting function
    dataMapped.sort((a, b) => {
      // Sort by date in descending order
      const dateA = new Date(a.date.split('/').reverse().join('-'));
      const dateB = new Date(b.date.split('/').reverse().join('-'));

      if (dateA > dateB) return -1;
      if (dateA < dateB) return 1;

      // Sort by title priority if dates are the same
      const titleA = getMainTitle(a.title);
      const titleB = getMainTitle(b.title);

      return titlePriority[titleA] - titlePriority[titleB];
    });
    
    await this.redis.set(`${RedisKeys.analysisReport}:${q.type}`, dataMapped, {ttl: TimeToLive.OneHour})
    return dataMapped
  }
}