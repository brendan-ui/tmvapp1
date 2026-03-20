'use client'

import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
} from 'recharts'

interface ChartData {
  month: string
  revenue: number
  expenses: number
  profit: number
  budgetProfit: number
}

function formatTick(value: number) {
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
  return `$${value}`
}

function formatTooltip(value: number) {
  return `$${value.toLocaleString()}`
}

export function ProfitChart({ data }: { data: ChartData[] }) {
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
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
          <Legend wrapperStyle={{ fontFamily: 'Poppins', fontSize: 12 }} />
          <Bar dataKey="revenue" name="Revenue" fill="#1A2040" radius={[4, 4, 0, 0]} />
          <Bar dataKey="expenses" name="Expenses" fill="#6B7280" radius={[4, 4, 0, 0]} />
          <Line dataKey="profit" name="Actual Profit" stroke="#C9A96E" strokeWidth={2} dot={{ r: 3 }} />
          <Line dataKey="budgetProfit" name="Budget EBITDA" stroke="#5CAA6E" strokeWidth={2} strokeDasharray="5 5" dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
