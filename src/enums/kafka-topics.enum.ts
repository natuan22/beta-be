//receive
export enum Topics {
  DoRongThiTruong = 'kafka-do-rong-thi-truong-topic',
  DoRongThiTruongHNX = 'kafka-do-rong-thi-truong-hnx-topic',
  ThanhKhoanPhienHienTai = 'kafka-thanh-khoan-phien-hien-tai-topic',
  PhanNganh = 'kafka-phan-nganh-topic',
  ChiSoTrongNuoc = 'kakfa-chi-so-trong-nuoc-topic',
  BienDongThiTruong = 'kafka-bien-dong-thi-truong-topic',
  TickerChange = 'kafka-ticker-change-topic',
  ChiSoVNIndex = 'kafka-chi-so-vnindex-topic',
  LineChart = 'kafka-index-line-chart-topic',
  StockValue = 'kafka-stock-value-topic',
  Foreign = 'kafka-foreign-topic',
  ChiSoTrongNuoc2 = 'kafka-domestic-index-topic',
  CoPhieuAnhHuong = 'kafka-co-phieu-anh-huong-topic',
  ChartNenCoPhieu = 'kafka-chart-nen-tung-co-phieu-topic',
  ChartNenCoPhieuNew = 'kafka-chart-nen-tung-co-phieu-topic-new',
  ChartNenCoPhieuNewSignal = 'kafka-chart-nen-tung-co-phieu-topic-new_signal',
  GiaoDichCoPhieu = 'kafka-giao-dich-tung-co-phieu-topic',
}

//send
export const requestPatterns: string[] = [];
