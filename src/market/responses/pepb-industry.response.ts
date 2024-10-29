import { ApiProperty } from '@nestjs/swagger';
import { UtilCommonTemplate } from '../../utils/utils.common';
import { ISPEPBIndustry } from '../interfaces/pe-pb-industry-interface';

export class PEPBIndustryResponse {
  @ApiProperty({
    type: String,
    example: 'ACB',
  })
  industry: string;

  @ApiProperty({
    type: Date,
    example: '2018/03/30',
  })
  date: Date | string;

  @ApiProperty({
    type: String,
    example: '#512DA8',
  })
  color: string;

  @ApiProperty({
    type: Number,
    example: 1.5,
  })
  PE: number;

  @ApiProperty({
    type: Number,
    example: 1.5,
  })
  PB: number;

  constructor(data?: ISPEPBIndustry, type: number = 0) {
    this.industry = data?.industry || '';
    switch (this.industry) {
      case 'Bảo hiểm':
        this.color = '#512DA8';
        break;
      case 'Bất động sản':
        this.color = '#303F9F';
        break;
      case 'Công nghệ':
        this.color = '#00796B';
        break;
      case 'Dầu khí':
        this.color = '#689F38';
        break;
      case 'Dịch vụ bán lẻ':
        this.color = '#FFEB3B';
        break;
      case 'Dịch vụ tài chính':
        this.color = '#FFE0B2';
        break;
      case 'Dịch vụ tiện ích':
        this.color = '#2b908f';
        break;
      case 'Đồ dùng cá nhân và đồ gia dụng':
        this.color = '#AFB42B';
        break;
      case 'Du lịch & Giải trí':
        this.color = '#607D8B';
        break;
      case 'Hàng hóa và dịch vụ công nghiệp':
        this.color = '#795548';
        break;
      case 'Hóa chất':
        this.color = '#f7a35c';
        break;
      case 'Ngân hàng':
        this.color = '#f45b5b';
        break;
      case 'Ôtô & linh kiện phụ tùng ':
        this.color = '#00BCD4';
        break;
      case 'Phương tiện truyền thông':
        this.color = '#C2185B';
        break;
      case 'Tài nguyên':
        this.color = '#F8BBD0';
        break;
      case 'Thực phẩm & Đồ uống':
        this.color = '#F0F4C3';
        break;
      case 'Viễn thông':
        this.color = '#B2EBF2';
        break;
      case 'Xây dựng & Vật liệu':
        this.color = '#BDBDBD';
        break;
      case 'Quỹ mở & Quỹ đóng':
        this.color = '#CC521F';
        break;
      default:
        this.color = '#90ed7d';
        break;
    }
    this.date = data?.date ? data.date.toString() : '';
    this.PE = data?.PE || 0;
    this.PB = data?.PB || 0;
  }

  public mapToList(data?: ISPEPBIndustry[], type: number = 0) {
    return data?.map((item) => new PEPBIndustryResponse(item, type));
  }
}

export class PEPBIndustrySwagger {
  @ApiProperty({
    type: PEPBIndustryResponse,
    isArray: true,
  })
  data: PEPBIndustryResponse[];
}
