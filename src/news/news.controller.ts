import { Controller, Get, HttpStatus, Query, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CatchException } from '../exceptions/common.exception';
import { BaseResponse } from '../utils/utils.response';
import { EventDto } from './dto/event.dto';
import { NewsFilterDto } from './dto/news-filter.dto';
import { PageLimitDto } from './dto/page-limit.dto';
import { NewsService } from './news.service';
import { NewsEventResponse } from './response/event.response';
import { FilterResponse, InfoStockResponse } from './response/filer.response';
import { MacroDomesticResponse } from './response/macro-domestic.response';
import { NewsEnterpriseResponse } from './response/news-enterprise.response';
import { NewsFilterResponse } from './response/news-filter.response';
import { NewsProxyDto } from './dto/news-proxy.dto';
import axios from 'axios';
import { UtilsRandomUserAgent } from '../tcbs/utils/utils.random-user-agent';

@Controller('news')
@ApiTags('Trung tâm tin tức')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @ApiOperation({ summary: 'Tin doanh nghiệp - Lịch sự kiện' })
  @ApiOkResponse({ type: NewsEventResponse })
  @Get('event')
  async event(@Query() q: EventDto, @Res() res: Response) {
    try {
      const data = await this.newsService.getEvent(q);
      return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
    } catch (error) {
      throw new CatchException(error);
    }
  }

  @ApiOperation({ summary: 'Tin doanh nghiệp - Tin tức doanh nghiệp' })
  @ApiOkResponse({ type: NewsEnterpriseResponse })
  @Get('tin-tuc-doanh-nghiep')
  async newsEnterprise(@Res() res: Response) {
    try {
      const data = await this.newsService.newsEnterprise();
      return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
    } catch (error) {
      throw new CatchException(error);
    }
  }

  @ApiOperation({ summary: 'Tin vĩ mô trong nước' })
  @ApiOkResponse({ type: MacroDomesticResponse })
  @Get('vi-mo-trong-nuoc')
  async macroDomestic(@Res() res: Response, @Query() q: PageLimitDto) {
    try {
      const data = await this.newsService.macroDomestic(q);
      return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
    } catch (error) {
      throw new CatchException(error);
    }
  }

  @ApiOperation({ summary: 'Tin vĩ mô quốc tế' })
  @ApiOkResponse({ type: MacroDomesticResponse })
  @Get('vi-mo-quoc-te')
  async macroInternational(@Res() res: Response, @Query() q: PageLimitDto) {
    try {
      const data = await this.newsService.macroInternational(q);
      return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
    } catch (error) {
      throw new CatchException(error);
    }
  }

  @Get('filter')
  @ApiOperation({ summary: 'Bộ lọc' })
  @ApiOkResponse({ type: FilterResponse })
  async filter(@Res() res: Response) {
    try {
      const data = await this.newsService.filter();
      return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
    } catch (e) {
      throw new CatchException(e);
    }
  }

  @Get('info-stock')
  @ApiOperation({ summary: 'Thông tin cổ phiếu' })
  @ApiOkResponse({ type: InfoStockResponse })
  async getInfoStock(@Res() res: Response) {
    try {
      const data = await this.newsService.getInfoStock();
      return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
    } catch (e) {
      throw new CatchException(e);
    }
  }

  @ApiOperation({ summary: 'Bộ lọc tin tức' })
  @ApiOkResponse({ type: NewsFilterResponse })
  @Get('bo-loc-tin-tuc')
  async newsFilter(@Res() res: Response, @Query() q: NewsFilterDto) {
    try {
      const data = await this.newsService.newsFilter(q);
      return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
    } catch (error) {
      throw new CatchException(error);
    }
  }

  @ApiOperation({ summary: 'Tin tức proxy' })
  @ApiOkResponse({ type: NewsFilterResponse })
  @Get('proxy')
  async newsProxy(@Res() res: Response, @Query() q: NewsProxyDto) {
    try {
      const response = await axios.get(q.url, { responseType: 'text', headers: { 'User-Agent': UtilsRandomUserAgent.getRandomUserAgent() }, maxRedirects: 5 });
  
      let html = response.data;
      // Thêm thẻ <base> vào <head> để đảm bảo tải đúng tài nguyên
      html = html.replace(/<head>/i, `<head><base href="${new URL(q.url).origin}/">`);
  
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('X-Frame-Options', 'ALLOW-FROM *');
      res.send(html);
    } catch (error) {
      throw new CatchException(error);
    }
  }
}
