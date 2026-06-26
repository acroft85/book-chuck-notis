import type { HMRCEstimate } from '@/lib/types'
import { formatCurrency } from '@/lib/hmrc'
import { Info } from 'lucide-react'

interface Props {
  estimate: HMRCEstimate
  taxYear: number
}

interface TaxRow {
  label: string
  amount: number
  note?: string
  highlight?: boolean
}

export default function TaxEstimate({ estimate, taxYear }: Props) {
  const rows: TaxRow[] = [
    { label: 'Gross Income', amount: estimate.grossIncome },
    { label: 'Personal Allowance', amount: -estimate.personalAllowance, note: '2024/25' },
    { label: 'Taxable Income', amount: estimate.taxableIncome, highlight: true },
    { label: 'Income Tax', amount: -estimate.incomeTax, note: estimate.taxBand },
    { label: 'Class 4 NI (self-employed)', amount: -estimate.nationalInsurance, note: '6% / 2%' },
    { label: 'Estimated Take-Home', amount: estimate.takeHome, highlight: true },
  ]

  return (
    <div className="card overflow-hidden">
      <div className="bg-[#2B2B2B] px-4 py-3">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold text-sm">HMRC Tax Estimate</h3>
          <span className="text-white/60 text-xs">{taxYear}/{taxYear+1} · Self-employed</span>
        </div>
        <p className="text-white/50 text-xs mt-0.5">
          Estimate only — consult a qualified accountant for advice.
        </p>
      </div>

      <div className="divide-y divide-gray-100">
        {rows.map(row => (
          <div key={row.label} className={`flex items-center justify-between px-4 py-2.5 ${row.highlight ? 'bg-gray-50' : ''}`}>
            <div>
              <span className={`text-sm ${row.highlight ? 'font-semibold text-[#2B2B2B]' : 'text-gray-600'}`}>
                {row.label}
              </span>
              {row.note && <span className="text-xs text-gray-400 ml-2">({row.note})</span>}
            </div>
            <span className={`text-sm font-semibold tabular-nums ${
              row.highlight
                ? 'text-[#2B2B2B]'
                : row.amount < 0
                  ? 'text-red-600'
                  : 'text-gray-800'
            }`}>
              {row.amount < 0 ? `−${formatCurrency(Math.abs(row.amount))}` : formatCurrency(row.amount)}
            </span>
          </div>
        ))}
      </div>

      <div className="px-4 py-3 bg-[#FDF3E7] border-t border-[#E8820C]/20">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-[#2B2B2B]">Effective Tax Rate</span>
          <span className="text-lg font-bold text-[#E8820C]">{estimate.effectiveRate.toFixed(1)}%</span>
        </div>
      </div>

      <div className="px-4 py-3 border-t border-gray-100 flex items-start gap-2">
        <Info size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-gray-400 leading-relaxed">
          Figures assume full self-employed status, no other income, and standard 2024/25 allowances.
          NI rates: 6% on profits £12,570–£50,270; 2% above. Does not account for business expenses.
        </p>
      </div>
    </div>
  )
}
