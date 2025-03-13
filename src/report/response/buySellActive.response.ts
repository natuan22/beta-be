import { ApiProperty } from "@nestjs/swagger";

export class BuySellActiveResponse {
    @ApiProperty({
      type: String,
    })
    code: string;

    @ApiProperty({
        type: Number,
    })
    point: number;

    @ApiProperty({
        type: String,
    })
    type: 'MB' | 'BM';

    @ApiProperty({
        type: Number,
    })
    price: number;
    
    @ApiProperty({
        type: Number,
    })
    day: number;

    @ApiProperty({
        type: Number,
    })
    value: number;
    
    @ApiProperty({
        type: Number,
    })
    volume: number;

    constructor(data?: BuySellActiveResponse) {
        this.code = data?.code || '';
        this.point = data?.point || 0;
        this.price = data?.price || 0;
        this.day = data?.day || 0;
        this.value = data?.value || 0;
        this.volume = data?.volume || 0;
    }
}