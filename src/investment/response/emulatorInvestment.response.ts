import { UtilCommonTemplate } from '../../utils/utils.common';

interface EmulatorInvestmentInterface {
  value: number;
  so_tien_thu_duoc_1: number;
  so_tien_thu_duoc_2: number;
  so_tien_thu_duoc_3: number;
  loi_nhuan_danh_muc_1: number;
  loi_nhuan_danh_muc_2: number;
  loi_nhuan_danh_muc_3: number;
  lai_thap_nhat_danh_muc_1: number;
  lai_thap_nhat_danh_muc_2: number;
  lai_thap_nhat_danh_muc_3: number;
  lai_cao_nhat_danh_muc_1: number;
  lai_cao_nhat_danh_muc_2: number;
  lai_cao_nhat_danh_muc_3: number;
  lai_trung_binh_danh_muc_1: number;
  lai_trung_binh_danh_muc_2: number;
  lai_trung_binh_danh_muc_3: number;
  loi_nhuan_am_cao_nhat_danh_muc_1: number;
  loi_nhuan_am_cao_nhat_danh_muc_2: number;
  loi_nhuan_am_cao_nhat_danh_muc_3: number;
  tg_loi_nhuan_cao_nhat_1: string;
  tg_loi_nhuan_cao_nhat_2: string;
  tg_loi_nhuan_cao_nhat_3: string;
  tg_loi_nhuan_thap_nhat_1: string;
  tg_loi_nhuan_thap_nhat_2: string;
  tg_loi_nhuan_thap_nhat_3: string;
  tg_loi_nhuan_am_thap_nhat_1: string;
  tg_loi_nhuan_am_thap_nhat_2: string;
  tg_loi_nhuan_am_thap_nhat_3: string;
  sharpe_1: number;
  sharpe_2: number;
  sharpe_3: number;
  beta_1: number;
  beta_2: number;
  beta_3: number;
  alpha_1: number;
  alpha_2: number;
  alpha_3: number;
  percent_loi_nhuan: { name: string; date: string; value: number }[];
  hieu_qua_dau_tu_co_phieu: {
    danh_muc_1: { name: string; date: string; value: number }[];
    danh_muc_2: { name: string; date: string; value: number }[];
    danh_muc_3: { name: string; date: string; value: number }[];
  };
  bieu_do_lai_lo: { name: string; date: string; value: number }[];
}
export class EmulatorInvestmentResponse {
  static mapToList(data?: EmulatorInvestmentInterface) {
    return {
      data_1: [
        {
          name: 'Danh mục 1',
          von_ban_dau: data.value,
          thu_duoc: data.so_tien_thu_duoc_1,
          loi_nhuan: data.loi_nhuan_danh_muc_1,
          lai_thap_nhat: data.lai_thap_nhat_danh_muc_1,
          tg_lai_thap_nhat: UtilCommonTemplate.toDate(
            data.tg_loi_nhuan_thap_nhat_1,
          ),
          lai_cao_nhat: data.lai_cao_nhat_danh_muc_1,
          tg_lai_cao_nhat: UtilCommonTemplate.toDate(
            data.tg_loi_nhuan_cao_nhat_1,
          ),
          lai_trung_binh: data.lai_trung_binh_danh_muc_1,
          lo_cao_nhat: data.loi_nhuan_am_cao_nhat_danh_muc_1,
          tg_lo_cao_nhat: UtilCommonTemplate.toDate(
            data.tg_loi_nhuan_am_thap_nhat_1,
          ),
          sharpe: data.sharpe_1,
          beta: data.beta_1,
          alpha: data.alpha_1,
        },
        {
          name: 'Danh mục 2',
          von_ban_dau: data.value,
          thu_duoc: data.so_tien_thu_duoc_2,
          loi_nhuan: data.loi_nhuan_danh_muc_2,
          lai_thap_nhat: data.lai_thap_nhat_danh_muc_2,
          tg_lai_thap_nhat: UtilCommonTemplate.toDate(
            data.tg_loi_nhuan_thap_nhat_2,
          ),
          lai_cao_nhat: data.lai_cao_nhat_danh_muc_2,
          tg_lai_cao_nhat: UtilCommonTemplate.toDate(
            data.tg_loi_nhuan_cao_nhat_2,
          ),
          lai_trung_binh: data.lai_trung_binh_danh_muc_2,
          lo_cao_nhat: data.loi_nhuan_am_cao_nhat_danh_muc_2,
          tg_lo_cao_nhat: UtilCommonTemplate.toDate(
            data.tg_loi_nhuan_am_thap_nhat_2,
          ),
          sharpe: data.sharpe_2,
          beta: data.beta_2,
          alpha: data.alpha_2,
        },
        {
          name: 'Danh mục 3',
          von_ban_dau: data.value,
          thu_duoc: data.so_tien_thu_duoc_3,
          loi_nhuan: data.loi_nhuan_danh_muc_3,
          lai_thap_nhat: data.lai_thap_nhat_danh_muc_3,
          tg_lai_thap_nhat: UtilCommonTemplate.toDate(
            data.tg_loi_nhuan_thap_nhat_3,
          ),
          lai_cao_nhat: data.lai_cao_nhat_danh_muc_3,
          tg_lai_cao_nhat: UtilCommonTemplate.toDate(
            data.tg_loi_nhuan_cao_nhat_3,
          ),
          lai_trung_binh: data.lai_trung_binh_danh_muc_3,
          lo_cao_nhat: data.loi_nhuan_am_cao_nhat_danh_muc_3,
          tg_lo_cao_nhat: UtilCommonTemplate.toDate(
            data.tg_loi_nhuan_am_thap_nhat_3,
          ),
          sharpe: data.sharpe_3,
          beta: data.beta_3,
          alpha: data.alpha_3,
        },
      ],
      data_2: data.percent_loi_nhuan,
      data_3: data.hieu_qua_dau_tu_co_phieu,
      data_4: data.bieu_do_lai_lo,
    };
  }
}
