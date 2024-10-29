import { Controller, Get, HttpStatus, Query, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CatchException } from '../exceptions/common.exception';
import { BaseResponse } from '../utils/utils.response';
import { AnalysisService } from './analysis.service';
import { AnalysisDto } from './dto/analysis.dto';
import { AnalysisResponse } from './response/analysis.reponse';

@ApiTags('Trung tâm phân tích - analysis report')
@Controller('analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @ApiOperation({ summary: 'Trung tâm phân tích' })
  @ApiOkResponse({ type: AnalysisResponse })
  @Get('analysis-report')
  async analysis(@Query() q: AnalysisDto, @Res() res: Response) {
    try {
      const data = await this.analysisService.getAnalysis(q);
      return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
    } catch (error) {
      throw new CatchException(error);
    }
  }
}
