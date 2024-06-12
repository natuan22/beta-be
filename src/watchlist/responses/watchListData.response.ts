import { ApiProperty } from "@nestjs/swagger"


class ISignal {
    @ApiProperty({
        type: Number
    })
    positive: number

    @ApiProperty({
        type: Number
    })
    negative: number

    @ApiProperty({
        type: Number
    })
    neutral: number
}

class INews {
    @ApiProperty({
        type: String
    })
    title: string

    @ApiProperty({
        type: String
    })
    date: string

    @ApiProperty({
        type: String
    })
    img: string

    @ApiProperty({
        type: String
    })
    href: string
}
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
        description: '%W'
    })
    perChangeW: number

    @ApiProperty({
        type: Number,
        description: '%M'
    })
    perChangeM: number

    @ApiProperty({
        type: Number,
        description: '%YoY'
    })
    perChangeY: number

    @ApiProperty({
        type: Number,
        description: '%YtD'
    })
    perChangeYtD: number

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

    @ApiProperty({
        type: Number,
        description: 'beta'
    })
    beta: number

    trend: string
    overview: string
    tech: string

    @ApiProperty({
        type: ISignal,
        description: 'Tín hiệu chỉ báo kỹ thuật'
    })
    technicalSignal: any

    @ApiProperty({
        type: ISignal,
        description: 'Tín hiệu đường xu hướng'
    })
    trendSignal: any

    @ApiProperty({
        type: ISignal,
        description: 'Tín hiệu kỹ thuật tổng hợp'
    })
    generalSignal: any

    @ApiProperty({
        type: INews,
        isArray: true,
        description: 'Tin tức'
    })
    news: INews[]

    constructor(data?: WatchListDataResponse) {
        this.code = data?.code || ''
        this.closePrice = data?.closePrice || 0
        this.floor = data?.floor || ''
        this.LV2 = data?.LV2 || ''
        this.totalVol = data?.totalVol || 0
        this.totalVal = data?.totalVal / 1000000000 || 0
        this.perChange = data?.perChange || 0
        this.perChangeW = data?.perChangeW || 0
        this.perChangeM = data?.perChangeM || 0
        this.perChangeY = data?.perChangeY || 0
        this.perChangeYtD = data?.perChangeYtD || 0
        this.buyVol = data?.buyVol || 0
        this.buyVal = data?.buyVal / 1000000000 || 0
        this.Mua = data?.Mua || 0
        this.Ban = data?.Ban || 0
        this.MB = data?.MB || 0
        this.PE = data?.PE || 0
        this.EPS = data?.EPS || 0
        this.PB = data?.PB || 0
        this.marketCap = data?.marketCap / 1000000000 || 0
        this.BVPS = data?.BVPS || 0
        this.ROE = data?.ROE || 0
        this.ROA = data?.ROA || 0
        this.grossProfitMarginQuarter = data?.grossProfitMarginQuarter || 0
        this.netProfitMarginQuarter = data?.netProfitMarginQuarter || 0
        this.grossProfitMarginYear = data?.grossProfitMarginYear || 0
        this.netProfitMarginYear = data?.netProfitMarginYear || 0
        this.PRICE_HIGHEST_CR_52W = data?.PRICE_HIGHEST_CR_52W || 0
        this.PRICE_LOWEST_CR_52W = data?.PRICE_LOWEST_CR_52W || 0
        this.beta = data?.beta || 0
        this.technicalSignal = this.genStar(data?.tech)
        this.trendSignal = this.genStar(data?.trend)
        this.generalSignal = this.genStar(data?.overview)
        this.news = data?.news
    }


    static mapToList(data?: WatchListDataResponse[]) {
        return data.map(item => new WatchListDataResponse(item))
    }

    private genStar(str?: string): ISignal {
        if (!str) {
            return {
                negative: 0,
                neutral: 0,
                positive: 0,
            }
        }
        const star = str.split('-')
        return {
            negative: +star[0],
            neutral: +star[1],
            positive: +star[2],
        }
    }
}