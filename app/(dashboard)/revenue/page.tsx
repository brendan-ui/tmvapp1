import { createClient } from '@/lib/supabase/server'
import { DashboardShell } from '@/components/dashboard-shell'
import { StatCard, Card } from '@/components/card'
import { RevenueChart } from './revenue-chart'
import { V8_BUDGET_2026, MONTH_LABELS, DATA_CAVEATS } from '@/lib/brand'

function formatCurrency(n: number): string {
  if (Math.abs(n) >= 1000000) return `$${(n / 1000000).toFixed(1)}M`
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

export default async function RevenuePage() {
  const supabase = await createClient()

  // Fetch P&L data - revenue accounts for current year
  const { data: plData } = await supabase
    .from('xero_profit_and_loss')
    .select('report_date, account_class, account_type, account_name, amount, amount_for_calculation')
    .order('report_date', { ascending: true })

  // Aggregate revenue by month
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

  const ytdRevenue = monthlyRevenue.reduce((a, b) => a + b, 0)
  const ytdBudget = V8_BUDGET_2026.revenue.slice(0, new Date().getMonth() + 1).reduce((a, b) => a + b, 0)
  const ytdVariance = ytdRevenue - ytdBudget
  const variancePct = ytdBudget > 0 ? ((ytdVariance / ytdBudget) * 100).toFixed(1) : '0'

  const chartData = MONTH_LABELS.map((month, i) => ({
    month,
    actual: monthlyRevenue[i],
    budget: V8_BUDGET_2026.revenue[i],
  }))

  const annualTarget = V8_BUDGET_2026.revenue.reduce((a, b) => a + b, 0)

  return (
    <DashboardShell title="Revenue vs Budget" subtitle="2026 Financial Year — V8 Base Case">
      {/* Caveat banner */}
      <div className="mb-6 p-3 rounded-lg bg-tmv-amber/10 border border-tmv-amber/20">
        <p className="font-body text-xs text-tmv-amber">{DATA_CAVEATS.retainerCreditThrough}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="YTD Revenue"
          value={formatCurrency(ytdRevenue)}
          subValue={`${Number(variancePct) >= 0 ? '+' : ''}${variancePct}% vs budget`}
          trend={ytdVariance >= 0 ? 'up' : 'down'}
        />
        <StatCard
          label="YTD Budget"
          value={formatCurrency(ytdBudget)}
        />
        <StatCard
          label="Variance"
          value={formatCurrency(ytdVariance)}
          trend={ytdVariance >= 0 ? 'up' : 'down'}
        />
        <StatCard
          label="Annual Target"
          value={formatCurrency(annualTarget)}
          subValue={`${((ytdRevenue / annualTarget) * 100).toFixed(1)}% achieved`}
        />
      </div>

      <Card>
        <h2 className="font-display text-lg font-bold text-navy mb-4">Monthly Revenue vs Budget</h2>
        <RevenueChart data={chartData} />
      </Card>
    </DashboardShell>
  )
}
