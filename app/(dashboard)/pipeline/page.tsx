import { createClient } from '@/lib/supabase/server'
import { DashboardShell } from '@/components/dashboard-shell'
import { StatCard, Card } from '@/components/card'
import { PipelineChart } from './pipeline-chart'
import { PIPELINE_STAGES } from '@/lib/brand'

function formatCurrency(n: number): string {
  if (Math.abs(n) >= 1000000) return `$${(n / 1000000).toFixed(1)}M`
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

export default async function PipelinePage() {
  const supabase = await createClient()

  const { data: deals } = await supabase
    .from('loxo_deals')
    .select('*')
    .eq('deleted', false)
    .neq('deal_status', 'lost')
    .order('pipeline_stage', { ascending: true })

  // Aggregate by stage
  const stageData: Record<string, { count: number; value: number; weighted: number }> = {}
  let totalPipeline = 0
  let totalWeighted = 0
  let activeDeals = 0

  if (deals) {
    for (const deal of deals) {
      const stage = deal.pipeline_stage ?? 'Unknown'
      const amount = deal.amount ?? deal.expected_amount ?? 0
      const prob = deal.stage_win_probability != null ? deal.stage_win_probability / 100 : (PIPELINE_STAGES[stage] ?? 0)

      if (!stageData[stage]) stageData[stage] = { count: 0, value: 0, weighted: 0 }
      stageData[stage].count++
      stageData[stage].value += amount
      stageData[stage].weighted += amount * prob

      totalPipeline += amount
      totalWeighted += amount * prob
      activeDeals++
    }
  }

  // Order stages by probability
  const orderedStages = Object.keys(PIPELINE_STAGES)
  const chartData = orderedStages
    .filter((stage) => stageData[stage])
    .map((stage) => ({
      stage,
      value: stageData[stage].value,
      weighted: stageData[stage].weighted,
      count: stageData[stage].count,
    }))

  return (
    <DashboardShell title="Pipeline" subtitle="Loxo CRM deal pipeline with probability-weighted values">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Pipeline" value={formatCurrency(totalPipeline)} />
        <StatCard label="Weighted Pipeline" value={formatCurrency(totalWeighted)} />
        <StatCard label="Active Deals" value={String(activeDeals)} />
        <StatCard
          label="Avg Deal Size"
          value={activeDeals > 0 ? formatCurrency(totalPipeline / activeDeals) : '$0'}
        />
      </div>

      <Card className="mb-8">
        <h2 className="font-display text-lg font-bold text-navy mb-4">Pipeline by Stage</h2>
        <PipelineChart data={chartData} />
      </Card>

      {/* Deal table */}
      <Card>
        <h2 className="font-display text-lg font-bold text-navy mb-4">Active Deals</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left font-body text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3">Deal</th>
                <th className="text-left font-body text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3">Company</th>
                <th className="text-left font-body text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3">Stage</th>
                <th className="text-left font-body text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3">Owner</th>
                <th className="text-right font-body text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3">Value</th>
                <th className="text-right font-body text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3">Probability</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(deals ?? []).slice(0, 25).map((deal) => {
                const prob = deal.stage_win_probability != null ? deal.stage_win_probability : ((PIPELINE_STAGES[deal.pipeline_stage ?? ''] ?? 0) * 100)
                return (
                  <tr key={deal.deal_id}>
                    <td className="py-3 font-body text-sm text-navy">{deal.deal_name ?? 'Untitled'}</td>
                    <td className="py-3 font-body text-sm text-gray-500">{deal.company_name ?? '-'}</td>
                    <td className="py-3">
                      <span className="inline-block px-2 py-0.5 rounded-full font-body text-xs font-medium bg-navy/5 text-navy">
                        {deal.pipeline_stage ?? 'Unknown'}
                      </span>
                    </td>
                    <td className="py-3 font-body text-sm text-gray-500">{deal.owner ?? '-'}</td>
                    <td className="py-3 font-body text-sm text-navy text-right">{formatCurrency(deal.amount ?? deal.expected_amount ?? 0)}</td>
                    <td className="py-3 font-body text-sm text-gray-500 text-right">{prob}%</td>
                  </tr>
                )
              })}
              {(!deals || deals.length === 0) && (
                <tr>
                  <td colSpan={6} className="py-8 text-center font-body text-sm text-gray-400">
                    No active deals
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
