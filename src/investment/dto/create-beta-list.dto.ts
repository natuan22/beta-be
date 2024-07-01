import { ApiProperty } from "@nestjs/swagger";

export class CreateBetaListDto {
    @ApiProperty({
        type: String
    })
    code: string

    @ApiProperty({
        type: Number
    })
    price_2024: number

    @ApiProperty({
        type: Number
    })
    price_2025: number

    @ApiProperty({
        type: Number
    })
    ma: number

    @ApiProperty({
        type: Number,
        description: 'Truyền lên 1'
    })
    is_beta_page: Number 
}