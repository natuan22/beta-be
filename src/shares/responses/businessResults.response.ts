import { ApiProperty } from '@nestjs/swagger';

export class BusinessResultsResponse {
  @ApiProperty({
    type: String,
  })
  name: string;

  @ApiProperty({
    type: Number,
  })
  value: number;

  @ApiProperty({
    type: String,
  })
  date: string;

  constructor(data?: BusinessResultsResponse) {
    switch (data?.name) {
      case 'LỢI NHUẬN KẾ TOÁN SAU THUẾ TNDN':
        this.name = 'Lợi nhuận kế toán sau thuế TNDN';
        break;
      case 'KẾT QUẢ HOẠT ĐỘNG':
        this.name = 'Kết quả hoạt động';
        break;
      case 'TỔNG CỘNG TÀI SẢN':
        this.name = 'Tổng cộng tài sản';
        break;
      case 'NỢ PHẢI TRẢ':
        this.name = 'Nợ phải trả';
        break;
      case 'VỐN CHỦ SỞ HỮU':
        this.name = 'Vốn chủ sở hữu';
        break;
      case 'TỔNG CỘNG NGUỒN VỐN':
        this.name = 'Tổng cộng nguồn vốn';
        break;
      case 'Cộng doanh thu hoạt động':
        this.name = 'Doanh thu hoạt động';
        break;
      case 'Cộng doanh thu hoạt động tài chính':
        this.name = 'Doanh thu hoạt động tài chính';
        break;
      case 'TỔNG LỢI NHUẬN KẾ TOÁN TRƯỚC THUẾ':
        this.name = 'Tổng lợi nhuận kế toán trước thuế';
        break;
      case 'TÀI SẢN NGẮN HẠN':
        this.name = 'Tài sản ngắn hạn';
        break;
      case 'TÀI SẢN DÀI HẠN':
        this.name = 'Tài sản dài hạn';
        break;

      default:
        this.name =
          data?.name && data.name.indexOf('(') != -1
            ? data.name.slice(0, data.name.indexOf('(')).trim()
            : data?.name;
        break;
    }
    this.value = data?.value || 0;
    this.date = data?.date.toString() || '';
  }

  static mapToList(data?: BusinessResultsResponse[]) {
    return data.map((item) => new BusinessResultsResponse(item));
  }
}
