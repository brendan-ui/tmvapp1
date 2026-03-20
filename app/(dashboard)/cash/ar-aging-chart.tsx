'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

interface AgingData {
  name: string
  value: number
  color: string
}

function formatTooltip(value: number) {
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
  return `$${value.toFixed(0)}`
}

export function ArAgingChart({ data }: { data: AgingData[] }) {
  const nonZero = data.filter((d) => d.value > 0)

  if (nonZero.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <p className="font-body text-sm text-gray-400">No AR data available</p>
      </div>
    )
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={nonZero}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
          >
            {nonZero.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
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
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
