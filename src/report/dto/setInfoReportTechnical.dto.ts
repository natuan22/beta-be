import { ApiProperty } from "@nestjs/swagger";

export class SetInfoReportTechnicalDto {
    @ApiProperty({
        type: String
    })
    code: string

    @ApiProperty({
        type: String,
        isArray: true
    })
    text: string[]

    @ApiProperty({
        isArray: true,
        description: 'Bảng các chỉ số hỗ trợ'
    })
    table: any[]

    @ApiProperty({
        description: 'Hình biểu đô giá'
    })
    img: any

    @ApiProperty({
        type: String,
        description: 'Khuyến nghị mua hoặc bán'
    })
    is_sell: string

    @ApiProperty({
        type: Number
    })
    gia_muc_tieu: number

    @ApiProperty({
        type: String,
        description: 'Thời gian nắm giữ, truyền lên string',
        example: '01 tháng'
    })
    thoi_gian_nam_giu: string

    @ApiProperty({
        type: Number
    })
    gia_khuyen_nghi: number

    @ApiProperty({
        type: Number
    })
    loi_nhuan_ky_vong: number

    @ApiProperty({
        type: Number
    })
    gia_ban_dung_lo: number

    @ApiProperty({
        type: String
    })
    analyst_name: string
}