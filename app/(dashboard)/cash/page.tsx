import { createClient } from '@/lib/supabase/server'
import { DashboardShell } from '@/components/dashboard-shell'
import { StatCard, Card } from '@/components/card'
import { ArAgingChart } from './ar-aging-chart'
import { ALWAYS_FLAGGED_CUSTOMERS, DATA_CAVEATS } from '@/lib/brand'

function formatCurrency(n: number): string {
  if (Math.abs(n) >= 1000000) return `$${(n / 1000000).toFixed(1)}M`
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

function daysBetween(date1: string, date2: Date): number {
  const d1 = new Date(date1)
  return Math.floor((date2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24))
}

export default async function CashPage() {
  const supabase = await createClient()
  const now = new Date()

  // Get cash from balance sheet (bank accounts)
  const { data: bsData } = await supabase
    .from('xero_balance_sheet')
    .select('account_name, account_type, amount')
    .in('account_type', ['BANK', 'CURRENT'])

  let cashOnHand = 0
  if (bsData) {
    for (const row of bsData) {
      if (row.account_type === 'BANK') {
        cashOnHand += row.amount ?? 0
      }
    }
  }

  // Get outstanding invoices for AR aging
  const { data: invoiceData } = await supabase
    .from('xero_invoices')
    .select('invoice_number, contact_customer, invoice_date, invoice_due_date, amount_due_in_home_currency, invoice_status, total_amount_in_home_currency')
    .in('invoice_status', ['AUTHORISED', 'SENT'])
    .gt('amount_due_in_home_currency', 0)
    .order('invoice_due_date', { ascending: true })

  // Bucket AR by aging
  const buckets = { current: 0, aging: 0, atRisk: 0, critical: 0 }
  const invoiceRows: { customer: string; invoice: string; amount: number; daysOverdue: number; bucket: string; flagged: boolean }[] = []

  if (invoiceData) {
    for (const inv of invoiceData) {
      const amountDue = inv.amount_due_in_home_currency ?? 0
      const dueDate = inv.invoice_due_date
      if (!dueDate) continue

      const daysOverdue = daysBetween(dueDate, now)

      let bucket: string
      if (daysOverdue <= 0) {
        bucket = 'current'
        buckets.current += amountDue
      } else if (daysOverdue <= 30) {
        bucket = 'current'
        buckets.current += amountDue
      } else if (daysOverdue <= 60) {
        bucket = 'aging'
        buckets.aging += amountDue
      } else if (daysOverdue <= 90) {
        bucket = 'atRisk'
        buckets.atRisk += amountDue
      } else {
        bucket = 'critical'
        buckets.critical += amountDue
      }

      const customerName = inv.contact_customer ?? 'Unknown'
      const flagged = ALWAYS_FLAGGED_CUSTOMERS.some((f) => customerName.toLowerCase().includes(f.toLowerCase()))

      invoiceRows.push({
        customer: customerName,
        invoice: inv.invoice_number ?? '',
        amount: amountDue,
        daysOverdue: Math.max(0, daysOverdue),
        bucket,
        flagged,
      })
    }
  }

  const totalAR = Object.values(buckets).reduce((a, b) => a + b, 0)

  const agingChartData = [
    { name: 'Current', value: buckets.current, color: '#5CAA6E' },
    { name: '31-60 Days', value: buckets.aging, color: '#D4A017' },
    { name: '61-90 Days', value: buckets.atRisk, color: '#C75050' },
    { name: '90+ Days', value: buckets.critical, color: '#991B1B' },
  ]

  return (
    <DashboardShell title="Cash & AR Aging" subtitle="Accounts receivable and cash position">
      {/* Caveat banner */}
      <div className="mb-6 p-3 rounded-lg bg-tmv-amber/10 border border-tmv-amber/20">
        <p className="font-body text-xs text-tmv-amber">{DATA_CAVEATS.balanceSheetPointInTime}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Cash on Hand" value={formatCurrency(cashOnHand)} />
        <StatCard label="Total AR" value={formatCurrency(totalAR)} />
        <StatCard
          label="AR at Risk (60+)"
          value={formatCurrency(buckets.atRisk + buckets.critical)}
          trend={buckets.atRisk + buckets.critical > 0 ? 'down' : 'up'}
        />
        <StatCard
          label="Cash + AR"
          value={formatCurrency(cashOnHand + totalAR)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <h2 className="font-display text-lg font-bold text-navy mb-4">AR Aging Breakdown</h2>
          <ArAgingChart data={agingChartData} />
        </Card>

        <Card>
          <h2 className="font-display text-lg font-bold text-navy mb-4">Aging Summary</h2>
          <div className="space-y-3">
            {agingChartData.map((bucket) => (
              <div key={bucket.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: bucket.color }} />
                  <span className="font-body text-sm text-gray-600">{bucket.name}</span>
                </div>
                <span className="font-body text-sm font-semibold text-navy">{formatCurrency(bucket.value)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Outstanding invoices table */}
      <Card>
        <h2 className="font-display text-lg font-bold text-navy mb-4">Outstanding Invoices</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left font-body text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3">Customer</th>
                <th className="text-left font-body text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3">Invoice</th>
                <th className="text-right font-body text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3">Amount Due</th>
                <th className="text-right font-body text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3">Days Overdue</th>
                <th className="text-right font-body text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {invoiceRows.slice(0, 20).map((row, i) => {
                const statusColor = row.bucket === 'current' ? 'bg-tmv-green/10 text-tmv-green'
                  : row.bucket === 'aging' ? 'bg-tmv-amber/10 text-tmv-amber'
                  : row.bucket === 'atRisk' ? 'bg-tmv-red/10 text-tmv-red'
                  : 'bg-red-900/10 text-red-900'
                const statusLabel = row.bucket === 'current' ? 'Current'
                  : row.bucket === 'aging' ? 'Aging'
                  : row.bucket === 'atRisk' ? 'At Risk'
                  : 'Critical'
                return (
                  <tr key={i}>
                    <td className="py-3 font-body text-sm text-navy">
                      {row.customer}
                      {row.flagged && (
                        <span className="ml-2 inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-tmv-red/10 text-tmv-red">FLAGGED</span>
                      )}
                    </td>
                    <td className="py-3 font-body text-sm text-gray-500">{row.invoice}</td>
                    <td className="py-3 font-body text-sm text-navy text-right">{formatCurrency(row.amount)}</td>
                    <td className="py-3 font-body text-sm text-gray-500 text-right">{row.daysOverdue}</td>
                    <td className="py-3 text-right">
                      <span className={`inline-block px-2 py-0.5 rounded-full font-body text-xs font-medium ${statusColor}`}>
                        {statusLabel}
                      </span>
                    </td>
                  </tr>
                )
              })}
              {invoiceRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center font-body text-sm text-gray-400">
                    No outstanding invoices
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </DashboardShell>
  )
}
