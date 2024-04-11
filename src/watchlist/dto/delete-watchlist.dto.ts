import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from "class-validator";

export class DeleteWatchlistDto {
    @IsNotEmpty()
    @ApiProperty({
        type: Number
    })
    id: number
}
