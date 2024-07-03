import { Body, Controller, Get, HttpStatus, Param, Post, Query, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CatchException } from '../exceptions/common.exception';
import { StockDto } from '../shares/dto/stock.dto';
import { GetRoleFromTokenV2, GetUserIdFromToken } from '../utils/utils.decorators';
import { BaseResponse } from '../utils/utils.response';
import { CreateBetaListDto } from './dto/create-beta-list.dto';
import { DeleteBetaListDto } from './dto/delete-beta-list.dto';
import { EmulatorInvestmentDto } from './dto/emulator.dto';
import { InvestmentFilterDto } from './dto/investment-filter.dto';
import { IdParamDto } from './dto/paramId.dto';
import { SaveFilterDto } from './dto/save-filter.dto';
import { UpdateBetaListDto } from './dto/update-beta-list.dto';
import { InvestmentService } from './investment.service';
import { InvestmentFilterResponseSwagger } from './response/investmentFilter.response';
import { KeyFilterResponse } from './response/keyFilter.response';

@Controller('investment')
@ApiTags('Investment - Công cụ đầu tư')
export class InvestmentController {
  constructor(
    private readonly investmentService: InvestmentService,
    ) {}


  /**
   * Công cụ đầu tư
   */  
  @Post('filter')
  @ApiOperation({summary: 'Lọc tiêu chí'})
  @ApiOkResponse({type: InvestmentFilterResponseSwagger})
  async filter(@Body() b: InvestmentFilterDto, @Res() res: Response) {
    try {
      const data = await this.investmentService.filter(b);
      return res.status(HttpStatus.OK).send(new BaseResponse({data}))
    } catch (error) {
      throw new CatchException(error)        
    }
  }

  @Get('key-filter')
  @ApiOperation({summary: 'Lấy max min từng tiêu chí'})
  @ApiOkResponse({type: KeyFilterResponse, isArray: true})
  async keyFilter(@Res() res: Response){
    try {
      const data = await this.investmentService.keyFilter()
      return res.status(HttpStatus.OK).send(new BaseResponse({data}))
    } catch (e) {
      throw new CatchException(e)
    }
  }

  @Post('save-filter')
  @ApiOperation({summary: 'Lưu bộ lọc'})
  async saveFilter(@GetUserIdFromToken() user_id: number, @Body() b: SaveFilterDto, @Res() res: Response){
    const data = await this.investmentService.saveFilter(user_id, b)
    return res.status(HttpStatus.OK).send(new BaseResponse({data}))
  }

  @Get('your-filter')
  @ApiOperation({summary: 'Lấy bộ lọc'})
  async getFilter(@GetUserIdFromToken() user_id: number, @Res() res: Response){
    const data = await this.investmentService.getFilterUser(user_id)
    return res.status(HttpStatus.OK).send(new BaseResponse({data}))
  }

  @Post('update-filter/:id')
  @ApiOperation({summary: 'Chỉnh sửa bộ lọc'})
  async updateFilter(@GetUserIdFromToken() user_id: number, @Param() p: IdParamDto, @Body() b: SaveFilterDto, @Res() res: Response){
    const data = await this.investmentService.updateFilter(+p.id, user_id, b)
    return res.status(HttpStatus.OK).send(new BaseResponse({data}))
  }

  @Post('delete-filter/:id')
  @ApiOperation({summary: 'Xoá bộ lọc'})
  async deleteFilter(@GetUserIdFromToken() user_id: number, @Param() p: IdParamDto, @Res() res: Response){
    const data = await this.investmentService.deleteFilter(+p.id, user_id)
    return res.status(HttpStatus.OK).send(new BaseResponse({data}))
  }


  /**
   * Giả lập đầu tư
   */

  @Post('emulator')
  @ApiOperation({summary: 'Giả lập đầu tư'})
  async emulatorInvestment(@Body() b: EmulatorInvestmentDto, @Res() res: Response){
    try {
      const data = await this.investmentService.emulatorInvestment(b)
      return res.status(HttpStatus.OK).send(new BaseResponse({data}))
    } catch (e) {
      throw new CatchException(e)
    }
  }

  @Get('search')
  @ApiOperation({summary: 'Tìm cổ phiếu'})
  async search(@Query() q: StockDto, @Res() res: Response){
    try {
      const data = await this.investmentService.search(q.stock.toUpperCase())
      return res.status(HttpStatus.OK).send(new BaseResponse({data}))
    } catch (e) {
      throw new CatchException(e)
    }
  }

  @Get('test')
  async test(@GetRoleFromTokenV2() role: number, @Query() q: any, @Res() res: Response){
    try {
      const data = await this.investmentService.test(q.stock.toUpperCase(), q.from, q.to, 0, null, role)
      return res.status(HttpStatus.OK).send(new BaseResponse({data}))
    } catch (e) {
      throw new CatchException(e)
    }
  }

  @Post('test-all-stock')
  async testAllStock(@Body() q: any, @Res() res: Response){
    try {
      const data = await this.investmentService.testAllStock(q.stock, q.from, q.to)
      return res.status(HttpStatus.OK).send(new BaseResponse({data}))
    } catch (e) {
      throw new CatchException(e)
    }
  }

  @Get('all-stock')
  async allStock(@Query() q: any, @Res() res: Response){
    try {
      const data = await this.investmentService.allStock()
      return res.status(HttpStatus.OK).send(new BaseResponse({data}))
    } catch (e) {
      throw new CatchException(e)
    }
  }

  @ApiOperation({summary: 'Thêm cổ phiếu dô watchlist'})
  @Post('create-beta-watch-list')
  async createBetaWatchList(@Body() q: CreateBetaListDto, @Res() res: Response){
    try {
      const data = await this.investmentService.createBetaWatchList(q)
      return res.status(HttpStatus.OK).send(new BaseResponse({data}))
    } catch (e) {
      throw new CatchException(e)
    }
  }

  @ApiOperation({summary: 'Sửa cổ phiếu trong watchlist'})
  @Post('update-beta-watch-list')
  async updateBetaWatchList(@Body() q: UpdateBetaListDto, @Res() res: Response){
    try {
      const data = await this.investmentService.updateBetaWatchList(q)
      return res.status(HttpStatus.OK).send(new BaseResponse({data}))
    } catch (e) {
      throw new CatchException(e)
    }
  }

  @ApiOperation({summary: 'Xoá cổ phiếu trong watchlist'})
  @Post('delete-beta-watch-list')
  async deleteBetaWatchList(@Body() q: DeleteBetaListDto, @Res() res: Response){
    try {
      const data = await this.investmentService.deleteBetaWatchList(q.code)
      return res.status(HttpStatus.OK).send(new BaseResponse({data}))
    } catch (e) {
      throw new CatchException(e)
    }
  }


  @ApiOperation({summary: 'Danh mục beta'})
  @Get('beta-watch-list')
  async getBeteWatchList(@Query() p: any, @Res() res: Response){
    try {
      const data = await this.investmentService.getBetaWatchList(p.from, p.to)
      return res.status(HttpStatus.OK).send(new BaseResponse({data}))
    } catch (e) {
      throw new CatchException(e)
    }
  }
}
