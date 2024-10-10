export interface TickerTransInterface {
    id: string
    code: string
    date: string
    time: string
    action: string
    matchPrice: number
    priceChangeReference: number
    volume: number
}