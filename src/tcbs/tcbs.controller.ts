import { Controller, Get, HttpStatus, Query, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CatchException } from '../exceptions/common.exception';
import { BaseResponse } from '../utils/utils.response';
import { HistoricalPEPBDto } from './dto/historical-pe-pb.dto';
import { TCBSService } from './tcbs.service';
import { ContributePEPBDto } from './dto/contribute-pe-pb.dto';

@ApiTags('TCBS')
@Controller('tcbs')
export class TCBSController {
  constructor(private readonly tcbsService: TCBSService) {}

  @ApiOperation({ summary: 'Lịch sử pe pb' })
  @ApiOkResponse({ status: HttpStatus.OK })
  @Get('historical-pe-pb')
  async historicalPEPB(@Query() q: HistoricalPEPBDto, @Res() res: Response) {
    try {
      const data = await this.tcbsService.historicalPEPB(q.stock.toUpperCase(), q.period);
      return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
    } catch (error) {
      throw new CatchException(error);
    }
  }

  @ApiOperation({ summary: 'Bổ sung thông tin PE, PB' })
  @ApiOkResponse({ status: HttpStatus.OK })
  @Get('contribute-pe-pb')
  async contributePEPB(@Query() q: ContributePEPBDto, @Res() res: Response) {
    try {
      const data = await this.tcbsService.contributePEPB(q)
      return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
    } catch (error) {
      throw new CatchException(error);
    }
  }
}
