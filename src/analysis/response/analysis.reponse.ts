import { ApiProperty } from "@nestjs/swagger"
import { UtilCommonTemplate } from "../../utils/utils.common"

export class AnalysisResponse {
    @ApiProperty({
        type: String
    })
    date: string

    @ApiProperty({
        type: String
    })
    type: string

    @ApiProperty({
        type: String
    })
    title: string

    @ApiProperty({
        type: String
    })
    link: string

    constructor(data: AnalysisResponse){
        this.date =  data?.date ? UtilCommonTemplate.toDateV2(data?.date) : ''
        this.type =  data?.type ? data?.type : ''
        this.title = data?.title ? data?.title : ''
        this.link = data?.link ? data?.link : ''
    }

    static mapToList(data?: AnalysisResponse[]){
        return data.map(item => new AnalysisResponse(item))
    }
}