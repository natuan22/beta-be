import { Controller, Get, HttpStatus, Query, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { BaseResponse } from '../utils/utils.response';
import { ExchangeOrderDto } from './dto/ex-order.dto';
import { IndustryFilterDto } from './dto/industry-filter.dto';
import { TimeFrameDto } from './dto/time-frame.dto';
import { FinanceHealthService } from './finance-health.service';
import { IndusValueSwagger } from './responses/indus-value.response';
import { PEBSwagger } from './responses/peb-ticker.response';
import { CashRatioSwagger } from './responses/cash-ratio.response';
import { PayoutRatioSwagger } from './responses/payout-ratio.response';
import { RotationRatioSwagger } from './responses/rotation.response';
import { DebtSolvencySwagger } from './responses/debt-solvency.response';
import { ProfitMarginSwagger } from './responses/profit-margin.response';
import { PEIndustrySwagger } from './responses/pe-industry.response';
import { PEPBIndustrySwagger } from './responses/pepb-industry.response';
import { IndusInterestCoverageResponse } from './responses/indus-interest-coverage.response';
import { IndsProfitMarginsTableResponse } from './responses/indsProfitMarginsTable.response';

@ApiTags('Sức khỏe tài chính - API')
@Controller('finance-health')
export class FinanceHealthController {
  constructor(private readonly fHealthService: FinanceHealthService) {}

  @Get('p-b-binh-quan-nganh')
  @ApiOperation({
    summary: 'P/B bình quân các nhóm ngành (lần)',
  })
  @ApiOkResponse({ type: PEPBIndustrySwagger })
  async PBIndustry(@Query() q: TimeFrameDto, @Res() res: Response) {
    const data = await this.fHealthService.PBIndustry(
      q.exchange.toUpperCase(),
      parseInt(q.type),
      parseInt(q.order),
      q.industry,
    );
    return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
  }

  @Get('p-e-binh-quan-nganh')
  @ApiOperation({
    summary: 'Diễn biến P/E bình quân các nhóm ngành (lần)',
  })
  @ApiOkResponse({ type: PEIndustrySwagger })
  async PEIndustry(@Query() q: TimeFrameDto, @Res() res: Response) {
    const data = await this.fHealthService.PEIndustry(
      q.exchange.toUpperCase(),
      parseInt(q.type),
      parseInt(q.order),
    );
    return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
  }

  @Get('p-e-binh-quan-co-phieu')
  @ApiOperation({
    summary: 'Diễn biến P/E bình quân các co phieu',
  })
  @ApiOkResponse({ type: PEBSwagger })
  async PETicker(@Query() q: IndustryFilterDto, @Res() res: Response) {
    const data = await this.fHealthService.PETicker(
      q.exchange.toUpperCase(),
      q.industry.split(','),
    );
    return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
  }

  @Get('p-b-binh-quan-co-phieu')
  @ApiOperation({
    summary: 'Diễn biến P/B bình quân các co phieu',
  })
  @ApiOkResponse({ type: PEBSwagger })
  async PBTicker(@Query() q: IndustryFilterDto, @Res() res: Response) {
    const data = await this.fHealthService.PBTicker(
      q.exchange.toUpperCase(),
      q.industry.split(','),
    );
    return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
  }

  @Get('ty-so-thanh-toan')
  @ApiOperation({
    summary: `
      Tỷ số thanh toán hiện hành (Lần),
      Tỷ số thanh toán nhanh (Lần),
    `,
  })
  @ApiOkResponse({ type: PayoutRatioSwagger })
  async payoutRatio(@Query() q: ExchangeOrderDto, @Res() res: Response) {
    const data = await this.fHealthService.payoutRatio(
      q.exchange.toUpperCase(),
      parseInt(q.order),
    );
    return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
  }

  @Get('ty-so-thanh-toan-tien-mat')
  @ApiOperation({
    summary: `
      Tỷ số thanh toán tiền mặt (Lần)
    `,
  })
  @ApiOkResponse({ type: CashRatioSwagger })
  async cashRatio(@Query() q: ExchangeOrderDto, @Res() res: Response) {
    const data = await this.fHealthService.cashRatio(
      q.exchange.toUpperCase(),
      parseInt(q.order),
    );
    return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
  }

  @Get('ty-so-vong-xoay')
  @ApiOperation({
    summary: `
      Vòng quay Tài sản cố định (Lần),
      Vòng quay Tiền (Lần),
      Vòng quay Tổng tài sản (Lần),
      Vòng quay Vốn chủ sở hữu (Lần)
    `,
  })
  @ApiOkResponse({ type: RotationRatioSwagger })
  async rotationRatio(@Query() q: ExchangeOrderDto, @Res() res: Response) {
    const data = await this.fHealthService.rotationRatio(
      q.exchange.toUpperCase(),
      parseInt(q.order),
    );
    return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
  }

  @Get('cac-chi-so-kha-nang-tra-no-nganh')
  @ApiOperation({
    summary: `
      Các chỉ số khả năng trả nợ các ngành
    `,
  })
  @ApiOkResponse({ type: DebtSolvencySwagger })
  async indsDebtSolvency(@Query() q: ExchangeOrderDto, @Res() res: Response) {
    const data = await this.fHealthService.indsDebtSolvency(
      q.exchange.toUpperCase(),
      parseInt(q.order),
    );
    return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
  }

  @Get('ty-suat-loi-nhuan-gop-bien-cac-nhom-nganh')
  @ApiOperation({
    summary: `
      Diễn biến Tỷ suất lợi nhuận gộp biên các nhóm ngành
    `,
  })
  @ApiOkResponse({ type: ProfitMarginSwagger })
  async indsProfitMargins(@Query() q: TimeFrameDto, @Res() res: Response) {
    const data = await this.fHealthService.indsProfitMargins(
      q.exchange.toUpperCase(),
      parseInt(q.type),
      parseInt(q.order),
    );
    return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
  }

  @Get('he-so-thanh-toan-lai-vay')
  @ApiOperation({
    summary: `
      Hệ số thanh toán lãi vay
    `,
  })
  @ApiOkResponse({ type: IndusInterestCoverageResponse })
  async indsInterestCoverage(@Query() q: TimeFrameDto, @Res() res: Response) {
    const data = await this.fHealthService.indsInterestCoverage(
      q.exchange.toUpperCase(),
      parseInt(q.type),
      parseInt(q.order),
    );
    return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
  }

  @Get('lai-suat-vay-no-cac-nhom-nganh')
  @ApiOperation({
    summary: `
    Diễn biến Lãi suất vay nợ các nhóm ngành
    `,
  })
  @ApiOkResponse({ type: IndusInterestCoverageResponse })
  async interestRatesOnLoans(@Query() q: TimeFrameDto, @Res() res: Response) {
    const data = await this.fHealthService.interestRatesOnLoans(
      q.exchange.toUpperCase(),
      parseInt(q.type),
      parseInt(q.order),
    );
    return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
  }

  @Get('ty-suat-loi-nhuan-cac-nhom-nganh-table')
  @ApiOperation({
    summary: `
      Diễn biến Tỷ suất lợi nhuận gộp biên các nhóm ngành
    `,
  })
  @ApiOkResponse({ type: IndsProfitMarginsTableResponse })
  async indsProfitMarginsTable(
    @Query() q: ExchangeOrderDto,
    @Res() res: Response,
  ) {
    const data = await this.fHealthService.indsProfitMarginsTable(
      q.exchange.toUpperCase(),
      parseInt(q.order),
    );
    return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
  }

  @Get('ty-suat-loi-nhuan-rong-cac-nganh')
  @ApiOperation({
    summary: `
    Tỷ suất lợi nhuận ròng các ngành (%)
    `,
  })
  @ApiOkResponse({ type: IndusInterestCoverageResponse })
  async netProfitMarginByIndustries(
    @Query() q: TimeFrameDto,
    @Res() res: Response,
  ) {
    const data = await this.fHealthService.netProfitMarginByIndustries(
      q.exchange.toUpperCase(),
      parseInt(q.type),
      parseInt(q.order),
    );
    return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
  }
}
