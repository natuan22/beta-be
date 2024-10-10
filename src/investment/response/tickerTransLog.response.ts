import { ApiProperty } from "@nestjs/swagger"
import { UtilCommonTemplate } from "../../utils/utils.common"
import * as moment from "moment"

export class DataBuySell {
    @ApiProperty({
        type: String
    })
    time: string

    @ApiProperty({
        type: Number
    })
    timestamp: number

    @ApiProperty({
        type: String
    })
    action: string

    @ApiProperty({
        type: String,
        description: 'Phân loại nhà đầu tư: large (>1 tỷ/lệnh); medium (100tr-1tỷ/lệnh) và small (<100tr/lệnh)'
    })
    type: string
    
    @ApiProperty({
        type: Number
    })
    volume: number

    @ApiProperty({
        type: Number
    })
    value: number

    @ApiProperty({
        type: Number
    })
    matchPrice: number

    @ApiProperty({
        type: Number
    })
    priceChangeReference: number

    @ApiProperty({
        type: Number
    })
    perChangeReference: number

    @ApiProperty({
        type: Boolean
    })
    highlight: boolean

    constructor(data: DataBuySell) {
        this.time = UtilCommonTemplate.toTimeUTC(data?.time) || ''
        this.timestamp = Date.UTC(
            new Date().getFullYear(),
            new Date().getMonth(),
            new Date().getDate(),
            moment(data.time).utcOffset('+00:00').hour(),
            moment(data.time).utcOffset('+00:00').minute(),
            moment(data.time).utcOffset('+00:00').second(),
          ).valueOf()
        this.action = data?.action || ''
        this.type = data?.type || ''
        this.volume = data?.volume || 0
        this.value = data?.value || 0
        this.matchPrice = data?.matchPrice || 0
        this.priceChangeReference = data?.priceChangeReference || 0
        this.perChangeReference = data?.perChangeReference || 0
        this.highlight = data?.highlight !== undefined ? data.highlight : false
    }

    static mapToList(data: DataBuySell[]){
        return data.map(item => new DataBuySell(item))
    }
}

export class TickerTransLogResponse {
    @ApiProperty({
        type: String
    })
    ticker: string

    @ApiProperty({
        type: Number,
        description: `Giá đóng cửa phiên trước stock`
    })
    prevClosePrice: number

    @ApiProperty({
        type: DataBuySell,
        isArray: true,
        description: `Data mua bán`
    })
    data: DataBuySell[]

    constructor(data?: TickerTransLogResponse){
        this.ticker = data?.ticker || ''
        this.prevClosePrice = data?.prevClosePrice || 0
        this.data = data?.data || []
    }
}