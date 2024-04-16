import { ApiProperty } from "@nestjs/swagger"

export class WatchListDataResponse {
    @ApiProperty({
        type: String
    })
    code: string

    @ApiProperty({
        type: Number
    })
    closePrice: number

    @ApiProperty({
        type: String
    })
    floor: string

    @ApiProperty({
        type: String
    })
    LV2: string

    @ApiProperty({
        type: Number,
        description: 'KLGD (CP)'
    })
    totalVol: number

    @ApiProperty({
        type: Number,
        description: 'GTGD (Tỷ đồng)'
    })
    totalVal: number

    @ApiProperty({
        type: Number,
        description: '%D'
    })
    perChange: number

    @ApiProperty({
        type: Number,
        description: 'KLNN mua ròng (cp)'
    })
    buyVol: number

    @ApiProperty({
        type: Number,
        description: 'Giá trị NN mua ròng (tỷ đồng)'
    })
    buyVal: number

    @ApiProperty({
        type: Number,
        description: 'Vốn hoá (tỷ đồng)'
    })
    marketCap: number

    @ApiProperty({
        type: Number,
        description: 'KL Mua chủ động (cp) (M)'
    })
    Mua: number

    @ApiProperty({
        type: Number,
        description: 'KL Bán chủ động (cp) (B)'
    })
    Ban: number

    @ApiProperty({
        type: Number,
        description: 'M/B'
    })
    MB: number

    @ApiProperty({
        type: Number
    })
    PE: number

    @ApiProperty({
        type: Number
    })
    EPS: number

    @ApiProperty({
        type: Number
    })
    PB: number

    @ApiProperty({
        type: Number
    })
    BVPS: number

    @ApiProperty({
        type: Number
    })
    ROE: number

    @ApiProperty({
        type: Number
    })
    ROA: number

    @ApiProperty({
        type: Number,
        description: 'Biên lợi nhuận gộp quý gần nhất (%)'
    })
    grossProfitMarginQuarter: number

    @ApiProperty({
        type: Number,
        description: 'Biên lợi nhuận ròng quý gần nhất (%)'
    })
    netProfitMarginQuarter: number

    @ApiProperty({
        type: Number,
        description: 'Biên lợi nhuận gộp năm gần nhất (%)'
    })
    grossProfitMarginYear: number

    @ApiProperty({
        type: Number,
        description: 'Biên lợi nhuận ròng năm gần nhất (%)'
    })
    netProfitMarginYear: number

    ROENH: number

    ROANH: number

    @ApiProperty({
        type: Number,
        description: 'Giá cao nhất 52 tuần'
    })
    PRICE_HIGHEST_CR_52W: number

    @ApiProperty({
        type: Number,
        description: 'Giá thấp nhất 52 tuần'
    })
    PRICE_LOWEST_CR_52W: number

    constructor(data?: WatchListDataResponse) {
        this.code = data?.code || ''
        this.closePrice = data?.closePrice || 0
        this.floor = data?.floor || ''
        this.LV2 = data?.LV2 || ''
        this.totalVol = data?.totalVol || 0
        this.totalVal = data?.totalVal || 0
        this.perChange = data?.perChange || 0
        this.buyVol = data?.buyVol || 0
        this.buyVal = data?.buyVal || 0
        this.Mua = data?.Mua || 0
        this.Ban = data?.Ban || 0
        this.MB = data?.MB || 0
        this.PE = data?.PE || 0
        this.EPS = data?.EPS || 0
        this.PB = data?.PB || 0
        this.BVPS = data?.BVPS || 0
        this.ROE = data?.ROE || data?.ROENH || 0
        this.ROA = data?.ROA || data?.ROENH || 0
        this.grossProfitMarginQuarter = data?.grossProfitMarginQuarter || 0
        this.netProfitMarginQuarter = data?.netProfitMarginQuarter || 0
        this.grossProfitMarginYear = data?.grossProfitMarginYear || 0
        this.netProfitMarginYear = data?.netProfitMarginYear || 0
        this.PRICE_HIGHEST_CR_52W = data?.PRICE_HIGHEST_CR_52W / 1000 || 0
        this.PRICE_LOWEST_CR_52W = data?.PRICE_LOWEST_CR_52W / 1000 || 0
    }


    static mapToList(data?: WatchListDataResponse[]) {
        return data.map(item => new WatchListDataResponse(item))
    }
}