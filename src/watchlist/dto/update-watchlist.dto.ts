import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsEmpty, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class UpdateWatchlistDto {
    @IsNotEmpty()
    @ApiProperty({
        type: Number
    })
    id: number

    @IsOptional()
    @IsString()
    @ApiProperty({
        type: String
    })
    name: string

    @IsOptional()
    @IsArray()
    @ApiProperty({
        type: String,
        isArray: true
    })
    code: string[]
}
