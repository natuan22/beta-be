import { PartialType } from "@nestjs/mapped-types";
import { ApiProperty } from "@nestjs/swagger";
import { BaseResponse } from "../../utils/utils.response";

export class TagResponse {
    @ApiProperty({ type: Number, example: 1 })
    id: number;

    @ApiProperty({ type: String, example: 'Tag 1' })
    name: string;

    @ApiProperty({ type: String, example: 'A description of Tag 1' })
    description: string;

    @ApiProperty({ type: Number, example: 1 })
    published: number;

    constructor(data: any) {
        this.id = data?.id || 0;
        this.name = data?.name || '';
        this.description = data?.description || '';
        this.published = data?.published || 0;
    }
}

export class TagSwagger extends PartialType(BaseResponse) {
    @ApiProperty({
      type: TagResponse,
    })
    data: TagResponse;
}