import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class CreateWatchlistDto {
    @IsNotEmpty()
    @IsString()
    @ApiProperty({
        type: String,
        description: 'Tên watchlist'
    })
    name: string
}
