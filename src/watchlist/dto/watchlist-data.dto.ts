import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber } from "class-validator";

export class WatchListDataDto {
    @IsNotEmpty()
    @IsNumber()
    @ApiProperty({
        type: Number
    })
    id: number
}