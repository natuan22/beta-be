import { Body, Controller, Get, HttpStatus, Param, Post, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { BaseResponse } from '../utils/utils.response';
import { SignalWarningService } from './signal-warning.service';
import { GetUserIdFromToken } from '../utils/utils.decorators';
import { SaveSignalDto } from './dto/save-signal.dto';
import { IdParamSignalDto } from './dto/paramId-signal.dto';
import { TestQueryDto } from './dto/test-query.dto';

@Controller('signal-warning')
@ApiTags('Cảnh báo tín hiệu - Signal Warning')
export class SignalWarningController {
  constructor(private readonly signalWarningService: SignalWarningService) {}

  @Post('save-signal')
  @ApiOperation({ summary: 'Lưu bộ lọc' })
  async saveSignal(@GetUserIdFromToken() user_id: number, @Body() b: SaveSignalDto, @Res() res: Response) {
    const data = await this.signalWarningService.saveSignal(user_id, b);
    return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
  }

  @Get('your-signal')
  @ApiOperation({ summary: 'Lấy bộ lọc' })
  async getSignal(@GetUserIdFromToken() user_id: number, @Res() res: Response) {
    const data = await this.signalWarningService.getSignalUser(user_id);
    return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
  }

  @Post('update-signal/:id')
  @ApiOperation({ summary: 'Chỉnh sửa bộ lọc' })
  async updateSignal(
    @GetUserIdFromToken() user_id: number,
    @Param() p: IdParamSignalDto,
    @Body() b: SaveSignalDto,
    @Res() res: Response,
  ) {
    const data = await this.signalWarningService.updateSignal(+p.id, user_id, b);
    return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
  }

  @Post('delete-signal/:id')
  @ApiOperation({ summary: 'Xoá bộ lọc' })
  async deleteSignal(
    @GetUserIdFromToken() user_id: number,
    @Param() p: IdParamSignalDto,
    @Res() res: Response,
  ) {
    const data = await this.signalWarningService.deleteSignal(+p.id, user_id);
    return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
  }
    
  @ApiOperation({ summary: 'Lấy dữ liệu' })
  @Get()
  async create(@Res() res: Response) {
    const data = await this.signalWarningService.get();
    return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
  }
  
  @ApiOperation({ summary: 'Lấy dữ liệu stock group' })
  @Get('stock-group/:group')
  async getStockGroup(@Param('group') group: string, @Res() res: Response) {
    const data = await this.signalWarningService.getStockGroup(group);
    return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
  }

  @ApiOperation({ summary: 'Lấy dữ liệu signal realtime MA' })
  @Get('testRealtime')
  async testRealtime(@Query() q: TestQueryDto, @Res() res: Response) {
    const data = await this.signalWarningService.handleSignalWarning(q.type);
    return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
  }
}
