import { createClient } from '@/lib/supabase/server'
import { DashboardShell } from '@/components/dashboard-shell'
import { StatCard, Card } from '@/components/card'
import { ProfitChart } from './profit-chart'
import { V8_BUDGET_2026, MONTH_LABELS, DATA_CAVEATS } from '@/lib/brand'

function formatCurrency(n: number): string {
  if (Math.abs(n) >= 1000000) return `$${(n / 1000000).toFixed(1)}M`
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

export default async function ProfitabilityPage() {
  const supabase = await createClient()

  const { data: plData } = await supabase
    .from('xero_profit_and_loss')
    .select('report_date, account_class, amount, amount_for_calculation')
    .order('report_date', { ascending: true })

  const monthlyRevenue = new Array(12).fill(0)
  const monthlyExpenses = new Array(12).fill(0)

  if (plData) {
    for (const row of plData) {
      if (!row.report_date) continue
      const date = new Date(row.report_date)
      if (date.getFullYear() !== 2026) continue
      const monthIdx = date.getMonth()
      const amt = row.amount_for_calculation ?? row.amount ?? 0

      if (row.account_class === 'REVENUE') {
        monthlyRevenue[monthIdx] += amt
      } else if (row.account_class === 'EXPENSE') {
        monthlyExpenses[monthIdx] += Math.abs(amt)
      }
    }
  }

  const monthlyProfit = monthlyRevenue.map((r, i) => r - monthlyExpenses[i])
  const budgetProfit = V8_BUDGET_2026.ebitda

  const ytdRevenue = monthlyRevenue.reduce((a, b) => a + b, 0)
  const ytdExpenses = monthlyExpenses.reduce((a, b) => a + b, 0)
  const ytdProfit = ytdRevenue - ytdExpenses
  const profitMargin = ytdRevenue > 0 ? ((ytdProfit / ytdRevenue) * 100).toFixed(1) : '0'

  const chartData = MONTH_LABELS.map((month, i) => ({
    month,
    revenue: monthlyRevenue[i],
    expenses: monthlyExpenses[i],
    profit: monthlyProfit[i],
    budgetProfit: budgetProfit[i],
  }))

  return (
    <DashboardShell title="Profitability" subtitle="Revenue, expenses, and profit analysis">
      {/* Warning banners */}
      <div className="space-y-2 mb-6">
        <div className="p-3 rounded-lg bg-tmv-red/10 border border-tmv-red/20">
          <p className="font-body text-xs text-tmv-red">{DATA_CAVEATS.payrollReclassification}</p>
        </div>
        <div className="p-3 rounded-lg bg-tmv-amber/10 border border-tmv-amber/20">
          <p className="font-body text-xs text-tmv-amber">{DATA_CAVEATS.midMonthIncomplete}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="YTD Revenue" value={formatCurrency(ytdRevenue)} />
        <StatCard label="YTD Expenses" value={formatCurrency(ytdExpenses)} />
        <StatCard
          label="YTD Profit"
          value={formatCurrency(ytdProfit)}
          trend={ytdProfit >= 0 ? 'up' : 'down'}
        />
        <StatCard
          label="Profit Margin"
          value={`${profitMargin}%`}
          trend={Number(profitMargin) >= 15 ? 'up' : 'down'}
        />
      </div>

      <Card>
        <h2 className="font-display text-lg font-bold text-navy mb-4">Monthly Profitability</h2>
        <ProfitChart data={chartData} />
      </Card>
    </DashboardShell>
  )
}
