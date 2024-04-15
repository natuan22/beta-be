import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DB_SERVER } from '../constants';
import { CatchException, ExceptionResponse } from '../exceptions/common.exception';
import { CreateWatchlistDto } from './dto/create-watchlist.dto';
import { UpdateWatchlistDto } from './dto/update-watchlist.dto';
import { WatchListEntity } from './entities/watchlist.entity';
import { GetAllWatchListResponse } from './responses/getAll.response';

@Injectable()
export class WatchlistService {
  constructor(
    @InjectRepository(WatchListEntity, DB_SERVER) private readonly watchListRepo: Repository<WatchListEntity>
  ){}

  async create(body: CreateWatchlistDto, user_id: number) {
    try {
      const new_watch_list = this.watchListRepo.create({
        name: body.name,
        code: JSON.stringify([]),
        user: {
          user_id
        }
      })

      await this.watchListRepo.save(new_watch_list)

      return {
        id: new_watch_list.id,
        name: new_watch_list.name
      }
    } catch (e) {
      throw new CatchException(e)
    }
  }

  async update(body: UpdateWatchlistDto, user_id: number){
    try {
      const watch_list = await this.watchListRepo.findOne({where: {id: body.id, user: {user_id}}})
      if(!watch_list) throw new ExceptionResponse(HttpStatus.BAD_REQUEST, 'Watchlist invalid')

      await this.watchListRepo.update({id: body.id}, {name: body.name, code: JSON.stringify(body.code)})
    } catch (e) {
      throw new CatchException(e)
    }
  }

  async delete(id: number, user_id: number){
    try {
      const watch_list = await this.watchListRepo.findOne({where: {id, user: {user_id}}})
      if(!watch_list) throw new ExceptionResponse(HttpStatus.BAD_REQUEST, 'watch list invalid')

      await this.watchListRepo.delete({id})
    } catch (e) {
      throw new CatchException(e)
    }
  }

  async getAll(user_id: number){
    try {
      const watch_list = await this.watchListRepo.find({where: {user: {user_id}}})
      return GetAllWatchListResponse.mapToList(watch_list)
    } catch (e) {
      throw new CatchException(e)
    }
  }

  async watchListData(id: number, user_id: number){
    try {
      const watch_list = await this.watchListRepo.findOne({where: {id, user: {user_id}}})
      if(!watch_list) throw new ExceptionResponse(HttpStatus.BAD_REQUEST, 'watch list not found')

      const codes: string[] = JSON.parse(watch_list.code)
      if(codes.length === 0) return []
      
      const query = `
      select t.code, t.closePrice, i.floor, i.LV2, t.totalVol, t.totalVal, perChange from marketTrade.dbo.tickerTradeVND t
                            inner join marketInfor.dbo.info i on i.code = t.code
      where t.code in (${codes.map(item => `'${item}'`).join(',')})
      and t.date = (select max(date) from marketTrade.dbo.tickerTradeVND)
      `
      const data = await this.watchListRepo.query(query)
      return data
    } catch (e) {
      throw new CatchException(e)
    }
  }
}