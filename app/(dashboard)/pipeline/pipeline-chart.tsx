'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts'

interface StageData {
  stage: string
  value: number
  weighted: number
  count: number
}

function formatTick(value: number) {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
  return `$${value}`
}

function formatTooltip(value: number) {
  return `$${value.toLocaleString()}`
}

export function PipelineChart({ data }: { data: StageData[] }) {
  if (data.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center">
        <p className="font-body text-sm text-gray-400">No pipeline data available</p>
      </div>
    )
  }

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 100 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            type="number"
            tickFormatter={formatTick}
            tick={{ fontSize: 12, fontFamily: 'Poppins', fill: '#6B7280' }}
          />
          <YAxis
            type="category"
            dataKey="stage"
            tick={{ fontSize: 11, fontFamily: 'Poppins', fill: '#6B7280' }}
            width={90}
          />
          <Tooltip
            formatter={formatTooltip}
            contentStyle={{
              fontFamily: 'Poppins',
              fontSize: 12,
              borderRadius: 8,
              border: '1px solid #E5E7EB',
            }}
          />
          <Legend wrapperStyle={{ fontFamily: 'Poppins', fontSize: 12 }} />
          <Bar dataKey="value" name="Total Value" fill="#1A2040" radius={[0, 4, 4, 0]} />
          <Bar dataKey="weighted" name="Weighted" fill="#C9A96E" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
