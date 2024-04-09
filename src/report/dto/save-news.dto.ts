import { ApiProperty } from "@nestjs/swagger";
import { IsEnum } from "class-validator";

export class INews {
    @ApiProperty({
        type: String
    })
    title: string

    @ApiProperty({
        type: String
    })
    href: string
}

export class SaveNewsDto {
    @IsEnum([0, 1, 2, 3, 4])
    @ApiProperty({
        type: Number,
        description: `
        0 - Tin quốc tế sáng, 1 - Tin trong nước sáng, 2 - Tin doanh nghiệp sáng,

        3 - Tin quốc tế bản tin tuần, 4 - Tin trong nước bản tin tuần.

        5 - Tin quốc tế chiều, 6 - Tin trong nước chiều, 7 - Tin doanh nghiệp chiều
        `
    })
    id: number

    @ApiProperty({
        type: INews,
        isArray: true
    })
    value: INews[]
}