import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsNotEmpty, IsNumberString } from "class-validator";

export class WatchListDataDto {
    @IsNotEmpty()
    @IsNumberString()
    @ApiProperty({
        type: Number
    })
    id: number
}