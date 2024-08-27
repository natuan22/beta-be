import { ApiProperty } from "@nestjs/swagger"

class DataItem {
    @ApiProperty()
    pe: number;

    @ApiProperty()
    pb: number;

    @ApiProperty()
    industryPe: number;

    @ApiProperty()
    industryPb: number;

    @ApiProperty()
    indexPe: number;

    @ApiProperty()
    indexPb: number;

    @ApiProperty()
    from: string;

    @ApiProperty()
    to: string;

    constructor(data: any) {
        this.pe = data?.pe || 0;
        this.pb = data?.pb || 0;
        this.industryPe = data?.industryPe || 0;
        this.industryPb = data?.industryPb || 0;
        this.indexPe = data?.indexPe || 0;
        this.indexPb = data?.indexPb || 0;
        this.from = data?.from || '';
        this.to = data?.to || '';
    }
}

export class HistoricalPEPBResponse {
    @ApiProperty()
    industry: string;
  
    @ApiProperty()
    medianPe: number;
  
    @ApiProperty()
    medianPb: number;
  
    @ApiProperty()
    medianIndexPe: number;
  
    @ApiProperty()
    medianIndexPb: number;
  
    @ApiProperty()
    medianIndustryPe: number;
  
    @ApiProperty()
    medianIndustryPb: number;
  
    @ApiProperty({ type: [DataItem] })
    data: DataItem[];
  
    constructor(data: any) {
      this.industry = data?.industry || '';
      this.medianPe = data?.medianPe || 0;
      this.medianPb = data?.medianPb || 0;
      this.medianIndexPe = data?.medianIndexPe || 0;
      this.medianIndexPb = data?.medianIndexPb || 0;
      this.medianIndustryPe = data?.medianIndustryPe || 0;
      this.medianIndustryPb = data?.medianIndustryPb || 0;
      this.data = Array.isArray(data?.data) ? data.data.map((item: DataItem) => new DataItem(item)) : [];
    }
}