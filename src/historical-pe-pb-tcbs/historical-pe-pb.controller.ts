import { Controller, Get, HttpStatus, Query, Res } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Response } from 'express';
import { CatchException } from "../exceptions/common.exception";
import { BaseResponse } from "../utils/utils.response";
import { HistoricalPEPBService } from "./historical-pe-pb.service";
import { HistoricalPEPBResponse } from "./reponse/historical-pe-pb.reponse";
import { HistoricalPEPBDto } from "./dto/historical-pe-pb.dto";

@ApiTags('Historical PE PB TCBS')
@Controller('historical-pe-pb')
export class HistoricalPEPBController {
    constructor(private readonly analysisService: HistoricalPEPBService) {}

    @ApiOperation({summary: ''})
    @ApiOkResponse({type: HistoricalPEPBResponse})
    @Get()
    async historicalPEPB(@Query() q: HistoricalPEPBDto, @Res() res: Response){
        try {
            const data = await this.analysisService.historicalPEPB(q.stock.toUpperCase(), q.period)
            return res.status(HttpStatus.OK).send(new BaseResponse({data}))
        } catch (error) {
            throw new CatchException(error)
        }
    }
}