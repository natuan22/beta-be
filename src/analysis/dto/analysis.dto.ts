import { ApiProperty } from "@nestjs/swagger";

export class AnalysisDto {
    @ApiProperty({
        type: Number,
        description: `0 - all, 1 - nhan-dinh-thi-truong, 2 - phan-tich-doanh-nghiep, 3 - bao-cao-nganh, 4 - phan-tich-ky-thuat, 5 - bao-cao-vi-mo, 6 - bao-cao-chien-luoc, 7 - bao-cao-trai-phieu-va-tien-te`
    })
    type: string
}