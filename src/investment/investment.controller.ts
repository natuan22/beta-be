import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CatchException } from '../exceptions/common.exception';
import { AuthGuard } from '../guards/auth.guard';
import { Role, Roles } from '../guards/roles.decorator';
import { RolesGuard } from '../guards/roles.guard';
import { StockDto } from '../shares/dto/stock.dto';
import {
  GetRoleFromTokenV2,
  GetUserIdFromToken,
} from '../utils/utils.decorators';
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
import { TickerTransLogResponse } from './response/tickerTransLog.response';
import { BackTestTradingToolDto } from './dto/back-test-trading-tool';
import { BackTestTradingToolBackupDto } from './dto/back-test-trading-tool-back-up';
import { StockByIndustryDto } from './dto/stock-by-industry.dto';
import { TradingStrategiesDto } from './dto/trading-strategies.dto';
import { StockValuationDto } from './dto/stock-valuation.dto';

@Controller('investment')
@ApiTags('Investment - Công cụ đầu tư')
export class InvestmentController {
  constructor(private readonly investmentService: InvestmentService) {}

  /**
   * Công cụ đầu tư
   */
  @Post('filter')
  @ApiOperation({ summary: 'Lọc tiêu chí' })
  @ApiOkResponse({ type: InvestmentFilterResponseSwagger })
  async filter(@Body() b: InvestmentFilterDto, @Res() res: Response) {
    try {
      const data = await this.investmentService.filter(b);
      return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
    } catch (error) {
      throw new CatchException(error);
    }
  }

  @Get('key-filter')
  @ApiOperation({ summary: 'Lấy max min từng tiêu chí' })
  @ApiOkResponse({ type: KeyFilterResponse, isArray: true })
  async keyFilter(@Res() res: Response) {
    try {
      const data = await this.investmentService.keyFilter();
      return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
    } catch (e) {
      throw new CatchException(e);
    }
  }

  @Post('save-filter')
  @ApiOperation({ summary: 'Lưu bộ lọc' })
  async saveFilter(
    @GetUserIdFromToken() user_id: number,
    @Body() b: SaveFilterDto,
    @Res() res: Response,
  ) {
    const data = await this.investmentService.saveFilter(user_id, b);
    return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
  }

  @Get('your-filter')
  @ApiOperation({ summary: 'Lấy bộ lọc' })
  async getFilter(@GetUserIdFromToken() user_id: number, @Res() res: Response) {
    const data = await this.investmentService.getFilterUser(user_id);
    return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
  }

  @Post('update-filter/:id')
  @ApiOperation({ summary: 'Chỉnh sửa bộ lọc' })
  async updateFilter(
    @GetUserIdFromToken() user_id: number,
    @Param() p: IdParamDto,
    @Body() b: SaveFilterDto,
    @Res() res: Response,
  ) {
    const data = await this.investmentService.updateFilter(+p.id, user_id, b);
    return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
  }

  @Post('delete-filter/:id')
  @ApiOperation({ summary: 'Xoá bộ lọc' })
  async deleteFilter(
    @GetUserIdFromToken() user_id: number,
    @Param() p: IdParamDto,
    @Res() res: Response,
  ) {
    const data = await this.investmentService.deleteFilter(+p.id, user_id);
    return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
  }

  /**
   * Giả lập đầu tư
   */

  @Post('emulator')
  @ApiOperation({ summary: 'Giả lập đầu tư' })
  async emulatorInvestment(
    @Body() b: EmulatorInvestmentDto,
    @Res() res: Response,
  ) {
    try {
      const data = await this.investmentService.emulatorInvestment(b);
      return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
    } catch (e) {
      throw new CatchException(e);
    }
  }

  @Get('search')
  @ApiOperation({ summary: 'Tìm cổ phiếu' })
  async search(@Query() q: StockDto, @Res() res: Response) {
    try {
      const data = await this.investmentService.search(q.stock.toUpperCase());
      return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
    } catch (e) {
      throw new CatchException(e);
    }
  }

  @Get('trading-strategies')
  async tradingStrategies(@GetRoleFromTokenV2() role: number, @Query() q: TradingStrategiesDto, @Res() res: Response) {
    try {
      const { indicator, stock, from, to, maShort, maLong } = q;
      const upperStock = stock.toUpperCase();
  
      let data;
      switch (indicator) {
        case 'ma':
          data = await this.investmentService.tradingStrategiesMa(upperStock, from, to, 0, null, role);
          break;
        case 'sar':
          data = await this.investmentService.tradingStrategiesSar(upperStock, from, to);
          break;
        case 'macdSignal':
        case 'macdHistogram':
          data = await this.investmentService.tradingStrategiesMacdSignal(upperStock, from, to, indicator);
          break;
        case 'maShortCutLong':
          data = await this.investmentService.tradingStrategiesMaShortCutLong(upperStock, from, to, maShort, maLong);
          break;
        default:
          return res.status(HttpStatus.BAD_REQUEST).send(new BaseResponse({ message: 'Invalid indicator' }));
      }
  
      return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
    } catch (e) {
      throw new CatchException(e);
    }
  }

  @Post('trading-strategies-ma-all-stock')
  async tradingStrategiesMaAllStock(@Body() q: any, @Res() res: Response) {
    try {
      const data = await this.investmentService.tradingStrategiesMaAllStock(q.stock, q.from, q.to);
      return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
    } catch (e) {
      throw new CatchException(e);
    }
  }

  @Get('all-stock')
  async allStock(@Query() q: any, @Res() res: Response) {
    try {
      const data = await this.investmentService.allStock();
      return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
    } catch (e) {
      throw new CatchException(e);
    }
  }

  @Get('stock-by-industry')
  async findStockByIndustry(@Query() q: StockByIndustryDto, @Res() res: Response) {
    try {
      const data = await this.investmentService.findStockByIndustry(q.industry);
      return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
    } catch (e) {
      throw new CatchException(e);
    }
  }

  @Get('all-industry')
  async allIndustry(@Query() q: any, @Res() res: Response) {
    try {
      const data = await this.investmentService.allIndustry();
      return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
    } catch (e) {
      throw new CatchException(e);
    }
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Thêm cổ phiếu dô watchlist' })
  @Post('create-beta-watch-list')
  async createBetaWatchList(@Body() q: CreateBetaListDto, @Res() res: Response) {
    try {
      const data = await this.investmentService.createBetaWatchList(q);
      return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
    } catch (e) {
      throw new CatchException(e);
    }
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Sửa cổ phiếu trong watchlist' })
  @Post('update-beta-watch-list')
  async updateBetaWatchList(@Body() q: UpdateBetaListDto, @Res() res: Response) {
    try {
      const data = await this.investmentService.updateBetaWatchList(q);
      return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
    } catch (e) {
      throw new CatchException(e);
    }
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Xoá cổ phiếu trong watchlist' })
  @Post('delete-beta-watch-list')
  async deleteBetaWatchList(@Body() q: DeleteBetaListDto, @Res() res: Response) {
    try {
      const data = await this.investmentService.deleteBetaWatchList(q.code);
      return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
    } catch (e) {
      throw new CatchException(e);
    }
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.PremiumUser, Role.AdminBlogs)
  @ApiOperation({ summary: 'Danh mục beta' })
  @Get('beta-watch-list')
  async getBeteWatchList(@Query() p: any, @Res() res: Response) {
    try {
      const data = await this.investmentService.getBetaWatchList(p.from, p.to);
      return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
    } catch (e) {
      throw new CatchException(e);
    }
  }

  /**
   * BETA Smart
   */

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.PremiumUser, Role.AdminBlogs)
  @ApiOperation({ summary: 'BETA Smart' })
  @Get('beta-smart')
  async getBetaSmart(@Res() res: Response) {
    try {
      const data = await this.investmentService.getBetaSmart();
      return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
    } catch (e) {
      throw new CatchException(e);
    }
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.PremiumUser, Role.AdminBlogs)
  @Get('stock-basic')
  async getDataStockBasic(@Query() q: StockDto, @Res() res: Response) {
    try {
      const data = await this.investmentService.getDataStockBasic(q.stock.toUpperCase());
      return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
    } catch (e) {
      throw new CatchException(e);
    }
  }

  /**
   * MB chủ động
   */

  @ApiOperation({ summary: 'Lấy mua bán chủ động' })
  @ApiOkResponse({ status: HttpStatus.OK, type: TickerTransLogResponse })
  @Get('ticker-translog')
  async tickerTransLog(@Query() q: StockDto, @Res() res: Response) {
    try {
      const data = await this.investmentService.tickerTransLog(q.stock.toUpperCase());
      return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
    } catch (error) {
      throw new CatchException(error);
    }
  }

  /**
   * Backtest Trading tool
   */
  @ApiOperation({ summary: 'Backtest Trading tool'})
  @ApiOkResponse({ status: HttpStatus.OK})
  @Get('back-test-trading-tool')
  async backtest(@Query() p: BackTestTradingToolDto, @Res() res: Response){
    try {
      const data = await this.investmentService.getBackTestTrading(p.from, p.to);
      return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
    } catch (error) {
      throw new CatchException(error);
    }
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.PremiumUser, Role.AdminBlogs)
  @ApiOperation({ summary: 'Backtest Trading tool'})
  @ApiOkResponse({ status: HttpStatus.OK})
  @Get('beta-watch-list-back-up')
  async getBetaWatchListBackup(@Query() p: BackTestTradingToolBackupDto, @Res() res: Response){
    try {
      const data = await this.investmentService.getBetaWatchListBackup(p.date);
      return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
    } catch (error) {
      throw new CatchException(error);
    }
  }

  /**
   * Định giá cổ phiếu
   */
  @ApiOperation({ summary: 'Định giá cổ phiếu'})
  @ApiOkResponse({ status: HttpStatus.OK})
  @Get('stock-valuation')
  async stockValuation(@Query() q: StockValuationDto, @Res() res: Response){
    try {
      const data = await this.investmentService.getStockValuation(q)
      return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
    } catch (error) {
      throw new CatchException(error);
    }
  }

  @ApiOperation({ summary: 'Lấy giá định giá của các cty khác'})
  @ApiOkResponse({ status: HttpStatus.OK})
  @Get('stock-valuation-recommendations')
  async stockValuationRecommendations(@Query() q: StockDto, @Res() res: Response){
    try {
      const data = await this.investmentService.stockValuationRecommendations(q.stock)
      return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
    } catch (error) {
      throw new CatchException(error);
    }
  }
}
