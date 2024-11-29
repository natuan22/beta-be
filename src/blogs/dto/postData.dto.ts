import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumberString } from "class-validator";

export class PostDataDto {
    @IsNotEmpty()
    @IsNumberString()
    @ApiProperty({
        type: Number,
    })
    id: number;
}