export class SignalWarningResponse {
    code: string;
    floor: string;
    indexCode: string;
    closePrice: number;
    closePrice_pre: number;
    ma5: number;
    ma10: number;
    ma15: number;
    ma20: number;
    ma50: number;
    ma60: number;
    ma100: number;
    ema5: number;
    ema10: number;
    ema15: number;
    ema20: number;
    ema50: number;
    ema60: number;
    ema100: number;
    ma5_pre: number;
    ma10_pre: number;
    ma15_pre: number;
    ma20_pre: number;
    rsi: number;
    rsi_pre: number;
    macd: number;
    macd_signal: number;
    macd_pre: number;
    macd_signal_pre: number;
    BBL: number;
    BBU: number;
    marketCap: number;
    gia_thoat_ra_bien_tren_bollinger_band: number;
    gia_cat_xuong_tu_ngoai_bien_tren_bollinger_band: number;
    gia_dang_o_ngoai_bien_tren_bollinger_band: number;
    gia_thoat_ra_bien_duoi_bollinger_band: number;
    gia_cat_len_tu_ngoai_bien_duoi_bollinger_band: number;
    gia_dang_o_ngoai_bien_duoi_bollinger_band: number;
    gia_hien_tai_cat_len_ma: any;
    gia_hien_tai_cat_xuong_ma: any;
    gia_hien_tai_cat_len_ema: any;
    gia_hien_tai_cat_xuong_ema: any;
    sma_ngan_han_cat_len_sma_dai_han: any;
    sma_ngan_han_cat_xuong_sma_dai_han: any;
    rsi_di_vao_vung_qua_mua_70: number;
    rsi_di_vao_vung_qua_mua_80: number;
    rsi_thoat_khoi_vung_qua_mua_70: number;
    rsi_thoat_khoi_vung_qua_mua_80: number;
    rsi_dang_o_vung_qua_mua_70: number;
    rsi_dang_o_vung_qua_mua_80: number;
    rsi_di_vao_vung_qua_ban_20: number;
    rsi_di_vao_vung_qua_ban_30: number;
    rsi_thoat_khoi_vung_qua_ban_20: number;
    rsi_thoat_khoi_vung_qua_ban_30: number;
    rsi_dang_o_vung_qua_ban_20: number;
    rsi_dang_o_vung_qua_ban_30: number;
    macd_cat_len_duong_tin_hieu: number;
    macd_dang_o_tren_duong_tin_hieu: number;
    macd_cat_xuong_duong_tin_hieu: number;
    macd_dang_o_duoi_duong_tin_hieu: number;
    macd_cat_len_duong_0: number;
    macd_dang_o_tren_duong_0: number;
    macd_cat_xuong_duong_0: number;
    macd_dang_o_duoi_duong_0: number;
    avg_totalVal_5d: number;
    avg_totalVal_20d: number;

    constructor(data?: SignalWarningResponse) {
        this.code = data?.code || '';
        this.floor = data?.floor || '';
        this.indexCode = data?.indexCode || '';
        this.closePrice = data?.closePrice || 0;
        this.marketCap = data?.marketCap ? data?.marketCap / 1000000000 : 0;
        this.gia_thoat_ra_bien_tren_bollinger_band = data?.gia_thoat_ra_bien_tren_bollinger_band || 0;
        this.gia_cat_xuong_tu_ngoai_bien_tren_bollinger_band = data?.gia_cat_xuong_tu_ngoai_bien_tren_bollinger_band || 0;
        this.gia_dang_o_ngoai_bien_tren_bollinger_band = data?.gia_dang_o_ngoai_bien_tren_bollinger_band || 0;
        this.gia_thoat_ra_bien_duoi_bollinger_band = data?.gia_thoat_ra_bien_duoi_bollinger_band || 0;
        this.gia_cat_len_tu_ngoai_bien_duoi_bollinger_band = data?.gia_cat_len_tu_ngoai_bien_duoi_bollinger_band || 0;
        this.gia_dang_o_ngoai_bien_duoi_bollinger_band = data?.gia_dang_o_ngoai_bien_duoi_bollinger_band || 0;
        this.gia_hien_tai_cat_len_ma = data?.gia_hien_tai_cat_len_ma || {};
        this.gia_hien_tai_cat_xuong_ma = data?.gia_hien_tai_cat_xuong_ma || {};
        this.gia_hien_tai_cat_len_ema = data?.gia_hien_tai_cat_len_ema || {};
        this.gia_hien_tai_cat_xuong_ema = data?.gia_hien_tai_cat_xuong_ema || {};
        this.sma_ngan_han_cat_len_sma_dai_han = data?.sma_ngan_han_cat_len_sma_dai_han || {};
        this.sma_ngan_han_cat_xuong_sma_dai_han = data?.sma_ngan_han_cat_xuong_sma_dai_han || {};
        this.rsi_di_vao_vung_qua_mua_70 = data?.rsi_di_vao_vung_qua_mua_70 || 0;
        this.rsi_di_vao_vung_qua_mua_80 = data?.rsi_di_vao_vung_qua_mua_80 || 0;
        this.rsi_thoat_khoi_vung_qua_mua_70 = data?.rsi_thoat_khoi_vung_qua_mua_70 || 0;
        this.rsi_thoat_khoi_vung_qua_mua_80 = data?.rsi_thoat_khoi_vung_qua_mua_80 || 0;
        this.rsi_dang_o_vung_qua_mua_70 = data?.rsi_dang_o_vung_qua_mua_70 || 0;
        this.rsi_dang_o_vung_qua_mua_80 = data?.rsi_dang_o_vung_qua_mua_80 || 0;
        this.rsi_di_vao_vung_qua_ban_20 = data?.rsi_di_vao_vung_qua_ban_20 || 0;
        this.rsi_di_vao_vung_qua_ban_30 = data?.rsi_di_vao_vung_qua_ban_30 || 0;
        this.rsi_thoat_khoi_vung_qua_ban_20 = data?.rsi_thoat_khoi_vung_qua_ban_20 || 0;
        this.rsi_thoat_khoi_vung_qua_ban_30 = data?.rsi_thoat_khoi_vung_qua_ban_30 || 0;
        this.rsi_dang_o_vung_qua_ban_20 = data?.rsi_dang_o_vung_qua_ban_20 || 0;
        this.rsi_dang_o_vung_qua_ban_30 = data?.rsi_dang_o_vung_qua_ban_30 || 0;
        this.macd_cat_len_duong_tin_hieu = data?.macd_cat_len_duong_tin_hieu || 0;
        this.macd_dang_o_tren_duong_tin_hieu = data?.macd_dang_o_tren_duong_tin_hieu || 0;
        this.macd_cat_xuong_duong_tin_hieu = data?.macd_cat_xuong_duong_tin_hieu || 0;
        this.macd_dang_o_duoi_duong_tin_hieu = data?.macd_dang_o_duoi_duong_tin_hieu || 0;
        this.macd_cat_len_duong_0 = data?.macd_cat_len_duong_0 || 0;
        this.macd_dang_o_tren_duong_0 = data?.macd_dang_o_tren_duong_0 || 0;
        this.macd_cat_xuong_duong_0 = data?.macd_cat_xuong_duong_0 || 0;
        this.macd_dang_o_duoi_duong_0 = data?.macd_dang_o_duoi_duong_0 || 0;
        this.avg_totalVal_5d = data?.avg_totalVal_5d / 1000000000 || 0;
        this.avg_totalVal_20d = data?.avg_totalVal_20d / 1000000000 || 0;
    }
    
    static mapToList(data: SignalWarningResponse[], data_1: any) {
        return data.map((item) => new SignalWarningResponse({
            ...item,
            ...this.calculateBollingerBands(item.closePrice, item.closePrice_pre, item.BBU, item.BBL),
            ...this.calculateMA(item.ma5, item.ma10, item.ma15, item.ma20, item.ma50, item.ma60, item.ma100, item.ema5, item.ema10, item.ema15, item.ema20, item.ema50, item.ema60, item.ema100, item.closePrice, item.closePrice_pre, item.ma5_pre, item.ma10_pre, item.ma15_pre, item.ma20_pre),
            ...this.calculateRSI(item.rsi, item.rsi_pre),
            ...this.calculateMACD(item.macd, item.macd_pre, item.macd_signal, item.macd_signal_pre),
            ...data_1.find((vol) => vol.code == item.code)
        }),
    )};

    static calculateBollingerBands(price: number, price_pre: number, bbu: number, bbl: number) {
        let gia_thoat_ra_bien_tren_bollinger_band = 0, gia_cat_xuong_tu_ngoai_bien_tren_bollinger_band = 0, gia_dang_o_ngoai_bien_tren_bollinger_band = 0, gia_thoat_ra_bien_duoi_bollinger_band = 0, gia_cat_len_tu_ngoai_bien_duoi_bollinger_band = 0, gia_dang_o_ngoai_bien_duoi_bollinger_band = 0;
        
        if (price_pre < bbu && price > bbu) {
            gia_thoat_ra_bien_tren_bollinger_band = 1;
        }

        if (price_pre > bbu && price < bbu) {
            gia_cat_xuong_tu_ngoai_bien_tren_bollinger_band = 1;
        }

        if (price > bbu) {
            gia_dang_o_ngoai_bien_tren_bollinger_band = 1;
        }

        if (price_pre > bbl && price < bbl) {
            gia_thoat_ra_bien_duoi_bollinger_band = 1;
        }

        if (price_pre < bbu && price > bbu) {
            gia_cat_len_tu_ngoai_bien_duoi_bollinger_band = 1;
        }

        if (price < bbu) {
            gia_dang_o_ngoai_bien_duoi_bollinger_band = 1;
        }

        return { gia_thoat_ra_bien_tren_bollinger_band, gia_cat_xuong_tu_ngoai_bien_tren_bollinger_band, gia_dang_o_ngoai_bien_tren_bollinger_band, gia_thoat_ra_bien_duoi_bollinger_band, gia_cat_len_tu_ngoai_bien_duoi_bollinger_band, gia_dang_o_ngoai_bien_duoi_bollinger_band };
    }

    static calculateMA(
            ma5: number, ma10: number, ma15: number, ma20: number, ma50: number, ma60: number, ma100: number, 
            ema5: number, ema10: number, ema15: number, ema20: number, ema50: number, ema60: number, ema100: number, 
            price: number, price_pre: number, ma5_pre: number, ma10_pre: number, ma15_pre: number, ma20_pre: number
        ) {
        const cat_len = (ma: number) => (price_pre < ma && price > ma ? 1 : 0);
        const cat_xuong = (ma: number) => (price_pre > ma && price < ma ? 1 : 0);

        const ngan_han_cat_len = (ma_ngan: number, ma_dai: number, ma_ngan_pre: number, ma_dai_pre: number) => (ma_ngan_pre < ma_dai_pre && ma_ngan > ma_dai ? 1 : 0);
        const ngan_han_cat_xuong = (ma_ngan: number, ma_dai: number, ma_ngan_pre: number, ma_dai_pre: number) => (ma_ngan_pre > ma_dai_pre && ma_ngan < ma_dai ? 1 : 0);

        return {
            gia_hien_tai_cat_len_ma: { ma5: cat_len(ma5), ma10: cat_len(ma10), ma15: cat_len(ma15), ma20: cat_len(ma20), ma50: cat_len(ma50), ma60: cat_len(ma60), ma100: cat_len(ma100) },
            gia_hien_tai_cat_xuong_ma: { ma5: cat_xuong(ma5), ma10: cat_xuong(ma10), ma15: cat_xuong(ma15), ma20: cat_xuong(ma20), ma50: cat_xuong(ma50), ma60: cat_xuong(ma60), ma100: cat_xuong(ma100) },
            gia_hien_tai_cat_len_ema: { ema5: cat_len(ema5), ema10: cat_len(ema10), ema15: cat_len(ema15), ema20: cat_len(ema20), ema50: cat_len(ema50), ema60: cat_len(ema60), ema100: cat_len(ema100) },
            gia_hien_tai_cat_xuong_ema: { ema5: cat_xuong(ema5), ema10: cat_xuong(ema10), ema15: cat_xuong(ema15), ema20: cat_xuong(ema20), ema50: cat_xuong(ema50), ema60: cat_xuong(ema60), ema100: cat_xuong(ema100) },
            sma_ngan_han_cat_len_sma_dai_han: { ma5_ma10: ngan_han_cat_len(ma5, ma10, ma5_pre, ma10_pre), ma5_ma15: ngan_han_cat_len(ma5, ma15, ma5_pre, ma15_pre), ma5_ma20: ngan_han_cat_len(ma5, ma20, ma5_pre, ma20_pre), ma10_ma15: ngan_han_cat_len(ma10, ma15, ma10_pre, ma15_pre), ma10_ma20: ngan_han_cat_len(ma10, ma20, ma10_pre, ma20_pre) },
            sma_ngan_han_cat_xuong_sma_dai_han: { ma5_ma10: ngan_han_cat_xuong(ma5, ma10, ma5_pre, ma10_pre), ma5_ma15: ngan_han_cat_xuong(ma10, ma15, ma10_pre, ma15_pre), ma5_ma20: ngan_han_cat_xuong(ma5, ma20, ma5_pre, ma20_pre), ma10_ma15: ngan_han_cat_xuong(ma10, ma15, ma10_pre, ma15_pre), ma10_ma20: ngan_han_cat_xuong(ma10, ma20, ma10_pre, ma20_pre) },
        };
    }
    static calculateRSI(rsi: number, rsi_pre: number) {
        const di_vao_vung_qua_mua = (rsi: number, rsi_pre: number, val: number) => rsi_pre < val && rsi > val ? 1 : 0;
        const thoat_khoi_vung_qua_mua = (rsi: number, rsi_pre: number, val: number) => (rsi_pre > val && rsi < val ? 1 : 0);
        const dang_o_vung_qua_mua = (rsi: number, val: number) => rsi > val ? 1 : 0;

        return {
            rsi_di_vao_vung_qua_mua_70: di_vao_vung_qua_mua(rsi, rsi_pre, 70),
            rsi_di_vao_vung_qua_mua_80: di_vao_vung_qua_mua(rsi, rsi_pre, 80),
            rsi_thoat_khoi_vung_qua_mua_70: thoat_khoi_vung_qua_mua(rsi, rsi_pre, 70),
            rsi_thoat_khoi_vung_qua_mua_80: thoat_khoi_vung_qua_mua(rsi, rsi_pre, 80),
            rsi_dang_o_vung_qua_mua_70: dang_o_vung_qua_mua(rsi, 70),
            rsi_dang_o_vung_qua_mua_80: dang_o_vung_qua_mua(rsi, 80),
            rsi_di_vao_vung_qua_ban_20: di_vao_vung_qua_mua(rsi, rsi_pre, 20),
            rsi_di_vao_vung_qua_ban_30: di_vao_vung_qua_mua(rsi, rsi_pre, 30),
            rsi_thoat_khoi_vung_qua_ban_20: thoat_khoi_vung_qua_mua(rsi, rsi_pre, 20),
            rsi_thoat_khoi_vung_qua_ban_30: thoat_khoi_vung_qua_mua(rsi, rsi_pre, 30),
            rsi_dang_o_vung_qua_ban_20: dang_o_vung_qua_mua(rsi, 20) == 1 ? 0 : 1,
            rsi_dang_o_vung_qua_ban_30: dang_o_vung_qua_mua(rsi, 30) == 1 ? 0 : 1,
        };
    }

    static calculateMACD(macd: number, macd_pre: number, signal: number, signal_pre: number) {
        return {
            macd_cat_len_duong_tin_hieu: macd_pre < signal_pre && macd > signal ? 1 : 0,
            macd_dang_o_tren_duong_tin_hieu: macd > signal ? 1 : 0,
            macd_cat_xuong_duong_tin_hieu: macd_pre > signal_pre && macd < signal ? 1 : 0,
            macd_dang_o_duoi_duong_tin_hieu: macd < signal ? 1 : 0,
            macd_cat_len_duong_0: macd_pre < 0 && macd > 0 ? 1 : 0,
            macd_dang_o_tren_duong_0: macd > 0 ? 1 : 0,
            macd_cat_xuong_duong_0: macd_pre > 0 && macd < 0 ? 1 : 0,
            macd_dang_o_duoi_duong_0: macd < 0 ? 1 : 0,
        };
    }
}