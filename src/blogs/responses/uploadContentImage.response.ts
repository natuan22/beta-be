import { ApiProperty } from "@nestjs/swagger";
import { BaseResponse } from "../../utils/utils.response";

class UploadResponse {
    @ApiProperty({ type: String, isArray: true })
    url: string[]
}

export class UploadContentImageResponse extends BaseResponse {
    @ApiProperty({
        type: UploadResponse
    })
    data: UploadResponse
}