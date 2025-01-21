import { ApiProperty } from "@nestjs/swagger";

export class ContributePEPBResponse {
    @ApiProperty({
        type: String,
    })
    code: string;

    @ApiProperty({
        type: Number,
    })
    latest_PE: number;
    
    @ApiProperty({
        type: Number,
    })
    latest_PB: number;
    
    @ApiProperty({
        type: Number,
    })
    min_PE: number;
    
    @ApiProperty({
        type: Number,
    })
    max_PE: number;
    
    @ApiProperty({
        type: Number,
    })
    avg_PE: number;
    
    @ApiProperty({
        type: Number,
    })
    plus_1_std_PE: number;
    
    @ApiProperty({
        type: Number,
    })
    minus_1_std_PE: number;
    
    @ApiProperty({
        type: Number,
    })
    min_PB: number;
    
    @ApiProperty({
        type: Number,
    })
    max_PB: number;
    
    @ApiProperty({
        type: Number,
    })
    avg_PB: number;
    
    @ApiProperty({
        type: Number,
    })
    plus_1_std_PB: number;
    
    @ApiProperty({
        type: Number,
    })
    minus_1_std_PB: number;

    constructor(data: ContributePEPBResponse) {
        this.code = data?.code || '';
        this.latest_PE = data?.latest_PE || 0;
        this.latest_PB = data?.latest_PB || 0;
        this.min_PE = data?.min_PE || 0;
        this.max_PE = data?.max_PE || 0;
        this.avg_PE = data?.avg_PE || 0;
        this.plus_1_std_PE = data?.plus_1_std_PE || 0;
        this.minus_1_std_PE = data?.minus_1_std_PE || 0;
        this.min_PB = data?.min_PB || 0;
        this.max_PB = data?.max_PB || 0;
        this.avg_PB = data?.avg_PB || 0;
        this.plus_1_std_PB = data?.plus_1_std_PB || 0;
        this.minus_1_std_PB = data?.minus_1_std_PB || 0;
    }

    static mapToList(data: ContributePEPBResponse[], data_1: any) {
        return data.map((item) => new ContributePEPBResponse({
            ...item,
            ...data_1.find((vol) => item.code == vol.code)
        }));
      }
}
