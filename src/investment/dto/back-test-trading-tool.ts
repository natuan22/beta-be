import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from "class-validator";

export class BackTestTradingToolDto {
    @IsNotEmpty()
    @ApiProperty({
        type: String,
        description: 'YYYY-MM-DD',
        example: '2024-10-23',
    })
    from: string;

    @IsNotEmpty()
    @ApiProperty({
        type: String,
        description: 'YYYY-MM-DD',
        example: '2024-12-05',
    })
    to: string;
}