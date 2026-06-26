import type { HMRCEstimate } from './types'

// UK 2024/25 tax year
const PERSONAL_ALLOWANCE = 12570
const BASIC_RATE_UPPER = 50270
const HIGHER_RATE_UPPER = 125140

// Class 4 NI for self-employed (2024/25 rates)
const NI_LOWER_LIMIT = 12570
const NI_UPPER_LIMIT = 50270
const NI_LOWER_RATE = 0.06
const NI_UPPER_RATE = 0.02

export function calculateHMRC(grossIncome: number): HMRCEstimate {
  // Income tax
  let incomeTax = 0
  const taxable = Math.max(0, grossIncome - PERSONAL_ALLOWANCE)

  if (taxable > 0) {
    const basicBand = Math.min(taxable, BASIC_RATE_UPPER - PERSONAL_ALLOWANCE)
    incomeTax += basicBand * 0.20

    if (taxable > BASIC_RATE_UPPER - PERSONAL_ALLOWANCE) {
      const higherBand = Math.min(
        taxable - (BASIC_RATE_UPPER - PERSONAL_ALLOWANCE),
        HIGHER_RATE_UPPER - BASIC_RATE_UPPER
      )
      incomeTax += higherBand * 0.40

      if (taxable > HIGHER_RATE_UPPER - PERSONAL_ALLOWANCE) {
        incomeTax += (taxable - (HIGHER_RATE_UPPER - PERSONAL_ALLOWANCE)) * 0.45
      }
    }
  }

  // Class 4 National Insurance
  let ni = 0
  if (grossIncome > NI_LOWER_LIMIT) {
    const lowerBand = Math.min(grossIncome - NI_LOWER_LIMIT, NI_UPPER_LIMIT - NI_LOWER_LIMIT)
    ni += lowerBand * NI_LOWER_RATE
    if (grossIncome > NI_UPPER_LIMIT) {
      ni += (grossIncome - NI_UPPER_LIMIT) * NI_UPPER_RATE
    }
  }

  const totalDeductions = incomeTax + ni
  const takeHome = grossIncome - totalDeductions

  let taxBand = 'Tax-Free (below Personal Allowance)'
  if (grossIncome > PERSONAL_ALLOWANCE && grossIncome <= BASIC_RATE_UPPER) taxBand = 'Basic Rate (20%)'
  if (grossIncome > BASIC_RATE_UPPER && grossIncome <= HIGHER_RATE_UPPER) taxBand = 'Higher Rate (40%)'
  if (grossIncome > HIGHER_RATE_UPPER) taxBand = 'Additional Rate (45%)'

  return {
    grossIncome,
    personalAllowance: Math.min(grossIncome, PERSONAL_ALLOWANCE),
    taxableIncome: taxable,
    incomeTax,
    nationalInsurance: ni,
    totalDeductions,
    takeHome,
    effectiveRate: grossIncome > 0 ? (totalDeductions / grossIncome) * 100 : 0,
    taxBand,
  }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount)
}
