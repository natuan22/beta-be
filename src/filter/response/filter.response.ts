export class FilterResponse {
    code: string
    floor: string
    TyleNDTNNdangnamgiu: number
    closePrice: number
    closePrice_pre: number
    min_1_week: number
    max_1_week: number
    min_1_month: number
    max_1_month: number
    min_3_month: number
    max_3_month: number
    min_6_month: number
    max_6_month: number
    min_1_year: number
    max_1_year: number
    perChange1D: number
    perChange5D: number
    perChange1M: number
    perChange3M: number
    perChange6M: number
    perChange1Y: number
    perChangeYTD: number
    beta: number
    totalVol: number
    totalVal: number
    TyLeKLMBCD: number
    KNnetVal: number
    KNnetVol: number
    ma5: number
    ma10: number
    ma20: number
    ma50: number
    ma100: number
    ma200: number
    ema5: number
    ema10: number
    ema20: number
    ema50: number
    ema100: number
    ema200: number
    ma5_pre: number
    ma10_pre: number
    ma20_pre: number
    ma50_pre: number
    ma100_pre: number
    ma200_pre: number
    ema5_pre: number
    ema10_pre: number
    ema20_pre: number
    ema50_pre: number
    ema100_pre: number
    ema200_pre: number
    rsi: number
    rsi_pre: number
    macd: number
    macd_signal: number
    macd_pre: number
    macd_signal_pre: number
    BBL: number
    BBU: number
    doanh_thu_4_quy: number
    loi_nhuan_4_quy: number
    tang_truong_doanh_thu_4_quy: number
    tang_truong_loi_nhuan_4_quy: number
    qoq_doanh_thu: number
    qoq_loi_nhuan: number
    yoy_doanh_thu: number
    yoy_loi_nhuan: number
    EPS: number
    BVPS: number
    PE: number
    PB: number
    PS: number
    marketCap: number
    LV4: string
    gia_thoat_ra_bien_tren_bollinger_band: number
    gia_cat_xuong_tu_ngoai_bien_tren_bollinger_band: number
    gia_dang_o_ngoai_bien_tren_bollinger_band: number
    gia_thoat_ra_bien_duoi_bollinger_band: number
    gia_cat_len_tu_ngoai_bien_duoi_bollinger_band: number
    gia_dang_o_ngoai_bien_duoi_bollinger_band: number
    gia_hien_tai_cat_len_ma: any
    gia_hien_tai_cat_xuong_ma: any
    gia_hien_tai_cat_len_ema: any
    gia_hien_tai_cat_xuong_ema: any
    sma_ngan_han_cat_len_sma_dai_han: any
    sma_ngan_han_cat_xuong_sma_dai_han: any
    rsi_di_vao_vung_qua_mua_70: number
    rsi_di_vao_vung_qua_mua_80: number
    rsi_thoat_khoi_vung_qua_mua_70: number
    rsi_thoat_khoi_vung_qua_mua_80: number
    rsi_dang_o_vung_qua_mua_70: number
    rsi_dang_o_vung_qua_mua_80: number
    rsi_di_vao_vung_qua_ban_20: number
    rsi_di_vao_vung_qua_ban_30: number
    rsi_thoat_khoi_vung_qua_ban_20: number
    rsi_thoat_khoi_vung_qua_ban_30: number
    rsi_dang_o_vung_qua_ban_20: number
    rsi_dang_o_vung_qua_ban_30: number
    macd_cat_len_duong_tin_hieu: number
    macd_dang_o_tren_duong_tin_hieu: number
    macd_cat_xuong_duong_tin_hieu: number
    macd_dang_o_duoi_duong_tin_hieu: number
    macd_cat_len_duong_0: number
    macd_dang_o_tren_duong_0: number
    macd_cat_xuong_duong_0: number
    macd_dang_o_duoi_duong_0: number
    avg_totalVol_5d: number
    avg_totalVol_10d: number
    avg_totalVol_20d: number
    avg_totalVol_60d: number
    grossProfitMargin: number
    grossProfitMargin4Q: number
    netProfitMargin: number
    netProfitMargin4Q: number
    EBITDAMargin: number
    EBITDAMargin4Q: number
    currentRatio: number
    quickRatio: number
    interestCoverageRatio: number
    DE: number
    totalDebtToTotalAssets: number
    ROE: number
    ROA: number
    ATR: number

    constructor(data?: FilterResponse) {
        this.code = data?.code || ''
        this.floor = data?.floor || ''
        this.TyleNDTNNdangnamgiu = data?.TyleNDTNNdangnamgiu ? data?.TyleNDTNNdangnamgiu / 0.01 : 0
        this.closePrice = data?.closePrice || 0
        this.min_1_week = data?.min_1_week || 0
        this.max_1_week = data?.max_1_week || 0
        this.min_1_month = data?.min_1_month || 0
        this.max_1_month = data?.max_1_month || 0
        this.min_3_month = data?.min_3_month || 0
        this.max_3_month = data?.max_3_month || 0
        this.min_6_month = data?.min_6_month || 0
        this.max_6_month = data?.max_6_month || 0
        this.min_1_year = data?.min_1_year || 0
        this.max_1_year = data?.max_1_year || 0
        this.perChange1D = data?.perChange1D || 0
        this.perChange5D = data?.perChange5D || 0
        this.perChange1M = data?.perChange1M || 0
        this.perChange3M = data?.perChange3M || 0
        this.perChange6M = data?.perChange6M || 0
        this.perChange1Y = data?.perChange1Y || 0
        this.perChangeYTD = data?.perChangeYTD || 0
        this.beta = data?.beta || 0
        this.totalVol = data?.totalVol || 0
        this.totalVal = data?.totalVal || 0
        this.TyLeKLMBCD = data?.TyLeKLMBCD || 0
        this.KNnetVal = data?.KNnetVal || 0
        this.KNnetVol = data?.KNnetVol || 0
        this.doanh_thu_4_quy = data?.doanh_thu_4_quy / 1000000000 || 0
        this.loi_nhuan_4_quy = data?.loi_nhuan_4_quy / 1000000000 || 0
        this.tang_truong_doanh_thu_4_quy = data?.tang_truong_doanh_thu_4_quy || 0
        this.tang_truong_loi_nhuan_4_quy = data?.tang_truong_loi_nhuan_4_quy || 0
        this.qoq_doanh_thu = data?.qoq_doanh_thu || 0
        this.qoq_loi_nhuan = data?.qoq_loi_nhuan || 0
        this.yoy_doanh_thu = data?.yoy_doanh_thu || 0
        this.yoy_loi_nhuan = data?.yoy_loi_nhuan || 0
        this.EPS = data?.EPS || 0
        this.BVPS = data?.BVPS || 0
        this.PE = data?.PE || 0
        this.PB = data?.PB || 0
        this.PS = data?.PS || 0
        this.marketCap = data?.marketCap ? data?.marketCap / 1000000000 : 0
        this.LV4 = data?.LV4 || ''
        this.gia_thoat_ra_bien_tren_bollinger_band = data?.gia_thoat_ra_bien_tren_bollinger_band || 0
        this.gia_cat_xuong_tu_ngoai_bien_tren_bollinger_band = data?.gia_cat_xuong_tu_ngoai_bien_tren_bollinger_band || 0
        this.gia_dang_o_ngoai_bien_tren_bollinger_band = data?.gia_dang_o_ngoai_bien_tren_bollinger_band || 0
        this.gia_thoat_ra_bien_duoi_bollinger_band = data?.gia_thoat_ra_bien_duoi_bollinger_band || 0
        this.gia_cat_len_tu_ngoai_bien_duoi_bollinger_band = data?.gia_cat_len_tu_ngoai_bien_duoi_bollinger_band || 0
        this.gia_dang_o_ngoai_bien_duoi_bollinger_band = data?.gia_dang_o_ngoai_bien_duoi_bollinger_band || 0
        this.gia_hien_tai_cat_len_ma = data?.gia_hien_tai_cat_len_ma || {}
        this.gia_hien_tai_cat_xuong_ma = data?.gia_hien_tai_cat_xuong_ma || {}
        this.gia_hien_tai_cat_len_ema = data?.gia_hien_tai_cat_len_ema || {}
        this.gia_hien_tai_cat_xuong_ema = data?.gia_hien_tai_cat_xuong_ema || {}
        this.sma_ngan_han_cat_len_sma_dai_han = data?.sma_ngan_han_cat_len_sma_dai_han || {}
        this.sma_ngan_han_cat_xuong_sma_dai_han = data?.sma_ngan_han_cat_xuong_sma_dai_han || {}
        this.rsi_di_vao_vung_qua_mua_70 = data?.rsi_di_vao_vung_qua_mua_70 || 0
        this.rsi_di_vao_vung_qua_mua_80 = data?.rsi_di_vao_vung_qua_mua_80 || 0
        this.rsi_thoat_khoi_vung_qua_mua_70 = data?.rsi_thoat_khoi_vung_qua_mua_70 || 0
        this.rsi_thoat_khoi_vung_qua_mua_80 = data?.rsi_thoat_khoi_vung_qua_mua_80 || 0
        this.rsi_dang_o_vung_qua_mua_70 = data?.rsi_dang_o_vung_qua_mua_70 || 0
        this.rsi_dang_o_vung_qua_mua_80 = data?.rsi_dang_o_vung_qua_mua_80 || 0
        this.rsi_di_vao_vung_qua_ban_20 = data?.rsi_di_vao_vung_qua_ban_20 || 0
        this.rsi_di_vao_vung_qua_ban_30 = data?.rsi_di_vao_vung_qua_ban_30 || 0
        this.rsi_thoat_khoi_vung_qua_ban_20 = data?.rsi_thoat_khoi_vung_qua_ban_20 || 0
        this.rsi_thoat_khoi_vung_qua_ban_30 = data?.rsi_thoat_khoi_vung_qua_ban_30 || 0
        this.rsi_dang_o_vung_qua_ban_20 = data?.rsi_dang_o_vung_qua_ban_20 || 0
        this.rsi_dang_o_vung_qua_ban_30 = data?.rsi_dang_o_vung_qua_ban_30 || 0
        this.macd_cat_len_duong_tin_hieu = data?.macd_cat_len_duong_tin_hieu || 0
        this.macd_dang_o_tren_duong_tin_hieu = data?.macd_dang_o_tren_duong_tin_hieu || 0
        this.macd_cat_xuong_duong_tin_hieu = data?.macd_cat_xuong_duong_tin_hieu || 0
        this.macd_dang_o_duoi_duong_tin_hieu = data?.macd_dang_o_duoi_duong_tin_hieu || 0
        this.macd_cat_len_duong_0 = data?.macd_cat_len_duong_0 || 0
        this.macd_dang_o_tren_duong_0 = data?.macd_dang_o_tren_duong_0 || 0
        this.macd_cat_xuong_duong_0 = data?.macd_cat_xuong_duong_0 || 0
        this.macd_dang_o_duoi_duong_0 = data?.macd_dang_o_duoi_duong_0 || 0
        this.avg_totalVol_5d = data?.avg_totalVol_5d || 0
        this.avg_totalVol_10d = data?.avg_totalVol_10d || 0
        this.avg_totalVol_20d = data?.avg_totalVol_20d || 0
        this.avg_totalVol_60d = data?.avg_totalVol_60d || 0
        this.grossProfitMargin = data?.grossProfitMargin || 0
        this.grossProfitMargin4Q = data?.grossProfitMargin4Q || 0
        this.netProfitMargin = data?.netProfitMargin || 0
        this.netProfitMargin4Q = data?.netProfitMargin4Q || 0
        this.EBITDAMargin = data?.EBITDAMargin || 0
        this.EBITDAMargin4Q = data?.EBITDAMargin4Q || 0
        this.currentRatio = data?.currentRatio || 0
        this.quickRatio = data?.quickRatio || 0
        this.interestCoverageRatio = data?.interestCoverageRatio || 0
        this.DE = data?.DE || 0
        this.totalDebtToTotalAssets = data?.totalDebtToTotalAssets || 0
        this.ROE = data?.ROE || 0
        this.ROA = data?.ROA || 0
        this.ATR = data?.ATR || 0
    }

    static mapToList(data: FilterResponse[], data_1: any, data_2: any) {
        return data.map(item => new FilterResponse(
            {
                ...item,
                ...this.calculateBollingerBands(item.closePrice, item.closePrice_pre, item.BBU, item.BBL),
                ...this.calculateMA(
                    item.ma5,
                    item.ma10,
                    item.ma20,
                    item.ma50,
                    item.ma100,
                    item.ma200,
                    item.ema5,
                    item.ema10,
                    item.ema20,
                    item.ema50,
                    item.ema100,
                    item.ema200,
                    item.closePrice,
                    item.closePrice_pre,
                    item.ma5_pre,
                    item.ma10_pre,
                    item.ma20_pre,
                    item.ma50_pre,
                ),
                ...this.calculateRSI(item.rsi, item.rsi_pre),
                ...this.calculateMACD(item.macd, item.macd_pre, item.macd_signal, item.macd_signal_pre),
                ...data_1.find(vol => vol.code == item.code),
                ...data_2.find(margin => margin.code == item.code)
            }
        ))
    }

    static calculateBollingerBands(
        price: number,
        price_pre: number,
        bbu: number,
        bbl: number,
    ) {
        let gia_thoat_ra_bien_tren_bollinger_band = 0,
            gia_cat_xuong_tu_ngoai_bien_tren_bollinger_band = 0,
            gia_dang_o_ngoai_bien_tren_bollinger_band = 0,
            gia_thoat_ra_bien_duoi_bollinger_band = 0,
            gia_cat_len_tu_ngoai_bien_duoi_bollinger_band = 0,
            gia_dang_o_ngoai_bien_duoi_bollinger_band = 0
        if (price_pre < bbu && price > bbu) {
            gia_thoat_ra_bien_tren_bollinger_band = 1
        }
        if (price_pre > bbu && price < bbu) {
            gia_cat_xuong_tu_ngoai_bien_tren_bollinger_band = 1
        }
        if (price > bbu) {
            gia_dang_o_ngoai_bien_tren_bollinger_band = 1
        }
        if (price_pre > bbl && price < bbl) {
            gia_thoat_ra_bien_duoi_bollinger_band = 1
        }
        if (price_pre < bbu && price > bbu) {
            gia_cat_len_tu_ngoai_bien_duoi_bollinger_band = 1
        }
        if (price < bbu) {
            gia_dang_o_ngoai_bien_duoi_bollinger_band = 1
        }
        return {
            gia_thoat_ra_bien_tren_bollinger_band,
            gia_cat_xuong_tu_ngoai_bien_tren_bollinger_band,
            gia_dang_o_ngoai_bien_tren_bollinger_band,
            gia_thoat_ra_bien_duoi_bollinger_band,
            gia_cat_len_tu_ngoai_bien_duoi_bollinger_band,
            gia_dang_o_ngoai_bien_duoi_bollinger_band
        }
    }

    static calculateMA(
        ma5: number, ma10: number, ma20: number, ma50: number, ma100: number, ma200: number,
        ema5: number, ema10: number, ema20: number, ema50: number, ema100: number, ema200: number,
        price: number, price_pre: number,
        ma5_pre: number, ma10_pre: number, ma20_pre: number, ma50_pre: number
    ) {
        const cat_len = (ma: number) => (price_pre < ma && price > ma) ? 1 : 0
        const cat_xuong = (ma: number) => (price_pre > ma && price < ma) ? 1 : 0
        const ngan_han_cat_len = (ma_ngan: number, ma_dai: number, ma_ngan_pre: number, ma_dai_pre: number) => (ma_ngan_pre < ma_dai_pre) && (ma_ngan > ma_dai) ? 1 : 0
        const ngan_han_cat_xuong = (ma_ngan: number, ma_dai: number, ma_ngan_pre: number, ma_dai_pre: number) => (ma_ngan_pre > ma_dai_pre) && (ma_ngan < ma_dai) ? 1 : 0

        return {
            gia_hien_tai_cat_len_ma: {
                ma5: cat_len(ma5),
                ma10: cat_len(ma10),
                ma20: cat_len(ma20),
                ma50: cat_len(ma50),
                ma100: cat_len(ma100),
                ma200: cat_len(ma200),
            },
            gia_hien_tai_cat_xuong_ma: {
                ma5: cat_xuong(ma5),
                ma10: cat_xuong(ma10),
                ma20: cat_xuong(ma20),
                ma50: cat_xuong(ma50),
                ma100: cat_xuong(ma100),
                ma200: cat_xuong(ma200),
            },
            gia_hien_tai_cat_len_ema: {
                ema5: cat_len(ema5),
                ema10: cat_len(ema10),
                ema20: cat_len(ema20),
                ema50: cat_len(ema50),
                ema100: cat_len(ema100),
                ema200: cat_len(ema200),
            },
            gia_hien_tai_cat_xuong_ema: {
                ema5: cat_xuong(ema5),
                ema10: cat_xuong(ema10),
                ema20: cat_xuong(ema20),
                ema50: cat_xuong(ema50),
                ema100: cat_xuong(ema100),
                ema200: cat_xuong(ema200),
            },
            sma_ngan_han_cat_len_sma_dai_han: {
                ma5_ma20: ngan_han_cat_len(ma5, ma20, ma5_pre, ma20_pre),
                ma10_ma50: ngan_han_cat_len(ma10, ma50, ma10_pre, ma50_pre),
            },
            sma_ngan_han_cat_xuong_sma_dai_han: {
                ma5_ma20: ngan_han_cat_xuong(ma5, ma20, ma5_pre, ma20_pre),
                ma10_ma50: ngan_han_cat_xuong(ma10, ma50, ma10_pre, ma50_pre),
            }
        }
    }

    static calculateRSI(rsi: number, rsi_pre: number) {
        const di_vao_vung_qua_mua = (rsi: number, rsi_pre: number, val: number) => rsi_pre < val && rsi > val ? 1 : 0
        const thoat_khoi_vung_qua_mua = (rsi: number, rsi_pre: number, val: number) => rsi_pre > val && rsi < val ? 1 : 0
        const dang_o_vung_qua_mua = (rsi: number, val: number) => rsi > val ? 1 : 0

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
        }
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
        }
    }
}