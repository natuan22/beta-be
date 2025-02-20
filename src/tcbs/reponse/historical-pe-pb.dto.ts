import { ApiProperty } from "@nestjs/swagger";

export class DataHistoricalPEPB {
    @ApiProperty({
        type: Number,
    })
    pe: number;

    @ApiProperty({
        type: Number,
    })
    pb: number;

    @ApiProperty({
        type: Number,
    })
    industryPe: number;

    @ApiProperty({
        type: Number,
    })
    industryPb: number;

    @ApiProperty({
        type: Number,
    })
    indexPe: number;

    @ApiProperty({
        type: Number,
    })
    indexPb: number;

    @ApiProperty({
        type: String,
    })
    date: string;

    constructor(data?: DataHistoricalPEPB) {
        this.pe = data?.pe || 0;
        this.pb = data?.pb || 0;
        this.industryPe = data?.industryPe || null;
        this.industryPb = data?.industryPb || null;
        this.indexPe = data?.indexPe || 0;
        this.indexPb = data?.indexPb || 0;
        this.date = data?.date || '';
    }

    static mapToList(data: DataHistoricalPEPB[]) {
        return data.map(item => new DataHistoricalPEPB(item));
    }
}

export class HistoricalPEPBResponse {
    @ApiProperty({ type: String })
    industry: string;

    @ApiProperty({ type: () => [DataHistoricalPEPB] })
    data: DataHistoricalPEPB[];

    constructor(data?: DataHistoricalPEPB[], industry?: string) {
        this.industry = industry || '';
        this.data = data ? DataHistoricalPEPB.mapToList(data) : [];
    }
}