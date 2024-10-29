export class FinancialIndicatorsDetailResponse {
  name: string;
  value: number;
  date: string;
  color: any;

  constructor(data?: FinancialIndicatorsDetailResponse, is_chart?: number) {
    this.name = data?.name || '';
    switch (data?.name) {
      case 'Chi so danh gia':
        this.name = 'CHỈ SỐ ĐÁNH GIÁ';
        break;
      case 'BVPS':
        this.name = 'Giá trị sổ sách của cổ phiếu (BVPS)';
        break;
      case 'Hieu qua hoat dong':
        this.name = 'HIỆU QUẢ HOẠT ĐỘNG';
        break;
      case 'Vong quay tai san co dinh':
        this.name = 'Vòng quay tài sản cố định';
        break;
      case 'Vong quay tong tai san':
        this.name = 'Vòng quay tổng tài sản';
        break;
      case 'Vong quay tien':
        this.name = 'Vòng quay tiền';
        break;
      case 'Vong quay VCSH':
        this.name = 'Vòng quay vốn chủ sở hữu';
        break;
      case 'Kha nang thanh toan':
        this.name = 'KHẢ NĂNG THANH TOÁN';
        break;
      case 'Chi so kha nang tra no':
        this.name = 'Chỉ số khả năng trả nợ';
        break;
      case 'Ty le no hien tai/Tong tai san':
        this.name = 'Tỷ lệ nợ hiện tại trên tổng tài sản';
        break;
      case 'Ty le no hien tai/VCSH':
        this.name = 'Tỷ lệ nợ trên vốn chủ sở hữu';
        break;
      case 'Ty le dam bao tra no bang tai san':
        this.name = 'Tỷ lệ đảm bảo trả nợ bằng tài sản';
        break;
      case 'Thanh khoan':
        this.name = 'THANH KHOẢN';
        break;
      case 'Ty so thanh toan hien hanh':
        this.name = 'Tỷ số thanh toán hiện hành';
        break;
      case 'Ty so thanh nhanh':
        this.name = 'Tỷ số thanh toán nhanh';
        break;
      case 'Ty so thanh toan tien mat':
        this.name = 'Tỷ số thanh toán tiền mặt';
        break;
      case 'Kha nang thanh toan lai vay':
        this.name = 'Khả năng thanh toán lãi vay';
        break;
      case 'Kha nang sinh loi':
        this.name = 'KHẢ NĂNG SINH LỜI';
        break;
      case 'Ty suat loi nhuan gop bien':
        this.name = 'Tỷ suất lợi nhuận gộp biên';
        break;
      case 'Ty suat loi nhuan rong':
        this.name = 'Tỷ suất lợi nhuận ròng';
        break;
      case 'Co cau tai san':
        this.name = 'CƠ CẤU TÀI SẢN';
        break;
      case 'NIM':
        this.name = 'Tỷ lệ thu nhập lãi thuần (NIM)';
        break;
      case 'YOEA':
        this.name = 'Tỷ suất sinh lợi của tài sản có sinh lãi';
        break;
      case 'LAR_EAA':
        this.name = 'Cho vay/Tài sản sinh lãi';
        break;
      case 'LAR_TR':
        this.name = 'Cho vay/Tổng tài sản';
        break;
      case 'DDA_EAA':
        this.name = 'Tiền gửi khách hàng/Tài sản sinh lãi';
        break;
      case 'LDR':
        this.name = 'Cho vay/Tiền gửi khách hàng';
        break;
      case 'LFR':
        this.name = 'Dư nợ cho vay khách hàng/Tổng vốn huy động';
        break;
      case 'LTR':
        this.name = 'Dư nợ cho vay khách hàng/Tổng tài sản';
        break;
      case 'CAR':
        this.name = 'Vốn chủ sở hữu/Tổng tài sản';
        break;
      case 'LAR_AR':
        this.name = 'Tài sản thanh khoản/Nợ phải trả';
        break;
      case 'Chat luong tin dung':
        this.name = 'CHẤT LƯỢNG TÍN DỤNG';
        break;
      case 'NPLR':
        this.name = 'Tỷ lệ nợ xấu';
        break;
      case 'NDR':
        this.name = 'Tỷ lệ xóa nợ';
        break;
      case 'LLP_NPL':
        this.name = 'Dự phòng/Nợ xấu';
        break;
      case 'NPL_TR':
        this.name = 'Nợ xấu/Tổng tài sản';
        break;
      default:
        break;
    }
    this.value = data?.value || 0;
    this.date = data?.date.toString() || '';
    this.color = is_chart
      ? {
          // Thêm thuộc tính color ở đây
          linearGradient: {
            x1: 0,
            y1: 0,
            x2: 0,
            y2: 1,
          },
          stops: [
            [0, 'rgba(57,234,202,1)'],
            [0.2, 'rgba(44,185,185,1)'],
            [0.4, 'rgba(48,153,198,1)'],
            [0.61, 'rgba(54,90,185,1)'],
            [0.78, 'rgba(49,23,201,1)'],
          ],
        }
      : {};
  }

  static mapToList(
    data?: FinancialIndicatorsDetailResponse[],
    is_chart?: number,
  ) {
    return data.map(
      (item) => new FinancialIndicatorsDetailResponse(item, is_chart),
    );
  }
}
