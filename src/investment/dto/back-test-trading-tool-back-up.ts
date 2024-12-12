import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from "class-validator";

export class BackTestTradingToolBackupDto {
    @IsNotEmpty()
    @ApiProperty({
        type: String,
        description: 'YYYY-MM-DD',
        example: '2024-10-23',
    })
    date: string;
}