import { ApiProperty } from "@nestjs/swagger"

export class GetAllWatchListResponse {
    @ApiProperty({
        type: Number
    })
    id: number

    @ApiProperty({
        type: String
    })
    name: string

    @ApiProperty({
        type: String,
        isArray: true
    })
    code: any

    constructor(data?: GetAllWatchListResponse) {
        this.id = data?.id
        this.name = data?.name
        this.code = data?.code
    }

    static mapToList(data?: GetAllWatchListResponse[]) {
        return data.map(item => new GetAllWatchListResponse({...item, code: JSON.parse(item.code)}))
    }
}