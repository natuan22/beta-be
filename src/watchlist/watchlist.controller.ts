import { Body, Controller, Get, HttpStatus, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthGuard } from '../guards/auth.guard';
import { BaseResponse } from '../utils/utils.response';
import { CreateWatchlistDto } from './dto/create-watchlist.dto';
import { DeleteWatchlistDto } from './dto/delete-watchlist.dto';
import { UpdateWatchlistDto } from './dto/update-watchlist.dto';
import { WatchListDataDto } from './dto/watchlist-data.dto';
import { WatchlistService } from './watchlist.service';

@UseGuards(AuthGuard)
@ApiTags('WatchList')
@Controller('watchlist')
export class WatchlistController {
  constructor(private readonly watchlistService: WatchlistService) { }

  @ApiOperation({ summary: 'Tạo watchlist' })
  @Post('create')
  async create(@Req() req: Request, @Body() body: CreateWatchlistDto, @Res() res: Response) {
    const data = await this.watchlistService.create(body, req['user'].userId);
    return res.status(HttpStatus.OK).send(new BaseResponse({ data }))
  }

  @ApiOperation({ summary: 'Update watchlist' })
  @Post('update')
  async update(@Req() req: Request, @Body() body: UpdateWatchlistDto, @Res() res: Response) {
    const data = await this.watchlistService.update(body, req['user'].userId);
    return res.status(HttpStatus.OK).send(new BaseResponse({ data }))
  }

  @ApiOperation({ summary: 'Delete watchlist' })
  @Post('delete')
  async delete(@Req() req: Request, @Body() body: DeleteWatchlistDto, @Res() res: Response) {
    const data = await this.watchlistService.delete(body.id, req['user'].userId);
    return res.status(HttpStatus.OK).send(new BaseResponse({ data }))
  }

  @ApiOperation({ summary: 'Lấy watchlist' })
  @Get()
  async getAll(@Req() req: Request, @Res() res: Response) {
    const data = await this.watchlistService.getAll(req['user'].userId);
    return res.status(HttpStatus.OK).send(new BaseResponse({ data }))
  }

  @ApiOperation({ summary: 'watchlist data' })
  @Get(':id')
  async getDetail(@Req() req: Request, @Param() p: WatchListDataDto, @Res() res: Response) {
    const data = await this.watchlistService.watchListData(p.id, req['user'].userId);
    return res.status(HttpStatus.OK).send(new BaseResponse({ data }))
  }
}
