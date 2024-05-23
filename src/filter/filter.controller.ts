import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { BaseResponse } from '../utils/utils.response';
import { FilterService } from './filter.service';

@Controller('filter')
export class FilterController {
  constructor(private readonly filterService: FilterService) {}

  @ApiOperation({summary: 'Lấy dữ liệu'})
  @Get()
  async create(@Res() res: Response) {
    const data = await this.filterService.get()
    return res.status(HttpStatus.OK).send(new BaseResponse({data}))
  }
}
