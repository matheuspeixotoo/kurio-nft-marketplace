import Decimal from 'decimal.js'

/**
 * ETH amounts travel through the API as decimal strings (never floats).
 * All arithmetic goes through decimal.js to keep precision; presentation trims
 * trailing zeros but keeps at least 2 decimals ("1.19 ETH", "0.016 ETH", "26.846 ETH").
 */
Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP })

export type EthString = string

export const eth = {
  of: (v: EthString | number | Decimal) => new Decimal(v),
  add: (a: EthString, b: EthString): EthString => new Decimal(a).plus(b).toString(),
  sub: (a: EthString, b: EthString): EthString => new Decimal(a).minus(b).toString(),
  mul: (a: EthString, b: EthString | number): EthString => new Decimal(a).times(b).toString(),
  sum: (values: EthString[]): EthString => values.reduce((acc, v) => acc.plus(v), new Decimal(0)).toString(),
  percentOf: (value: EthString, percent: number): EthString => new Decimal(value).times(percent).div(100).toDecimalPlaces(6).toString(),
  cmp: (a: EthString, b: EthString) => new Decimal(a).comparedTo(b),
  isZero: (a: EthString) => new Decimal(a).isZero(),
  normalize: (a: EthString): EthString => new Decimal(a).toString(),
  isValid: (a: unknown): a is EthString => {
    if (typeof a !== 'string' || !/^\d+(\.\d+)?$/.test(a)) return false
    try {
      new Decimal(a)
      return true
    } catch {
      return false
    }
  },
}

export function formatEth(value: EthString | null | undefined, { withUnit = true, minDecimals = 2 }: { withUnit?: boolean; minDecimals?: number } = {}) {
  if (value === null || value === undefined || value === '') return withUnit ? '— ETH' : '—'
  const d = new Decimal(value)
  let s = d.toFixed(Math.max(minDecimals, Math.min(6, d.decimalPlaces())))
  if (s.includes('.')) {
    const [int, frac = ''] = s.split('.')
    const trimmed = frac.replace(/0+$/, '')
    s = `${int}.${trimmed.padEnd(minDecimals, '0')}`
  }
  return withUnit ? `${s} ETH` : s
}

/** Discount line as the layout shows it: "(-) 0.12 ETH" or "(-) 00.00" when there is none. */
export function formatDiscount(value: EthString) {
  if (eth.isZero(value)) return '(-) 00.00'
  return `(-) ${formatEth(value)}`
}
