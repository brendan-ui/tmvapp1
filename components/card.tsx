export function Card({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${className}`}>
      {children}
    </div>
  )
}

export function StatCard({
  label,
  value,
  subValue,
  trend,
}: {
  label: string
  value: string
  subValue?: string
  trend?: 'up' | 'down' | 'neutral'
}) {
  const trendColor = trend === 'up' ? 'text-tmv-green' : trend === 'down' ? 'text-tmv-red' : 'text-gray-500'

  return (
    <Card>
      <p className="font-body text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="font-display text-2xl font-bold text-navy mt-1">{value}</p>
      {subValue && (
        <p className={`font-body text-xs mt-1 ${trendColor}`}>{subValue}</p>
      )}
    </Card>
  )
}
