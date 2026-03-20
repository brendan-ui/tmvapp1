'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts'

interface ChartData {
  month: string
  actual: number
  budget: number
}

function formatTick(value: number) {
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
  return `$${value}`
}

function formatTooltip(value: number) {
  return `$${value.toLocaleString()}`
}

export function RevenueChart({ data }: { data: ChartData[] }) {
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12, fontFamily: 'Poppins', fill: '#6B7280' }}
          />
          <YAxis
            tickFormatter={formatTick}
            tick={{ fontSize: 12, fontFamily: 'Poppins', fill: '#6B7280' }}
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
          <Legend
            wrapperStyle={{ fontFamily: 'Poppins', fontSize: 12 }}
          />
          <Bar dataKey="actual" name="Actual" fill="#1A2040" radius={[4, 4, 0, 0]} />
          <Bar dataKey="budget" name="Budget" fill="#C9A96E" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
