import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import type { Transaction, Category } from '../types'
import { CATEGORY_COLORS, CATEGORY_LABELS } from '../types'

interface CategoryChartProps {
  transactions: Transaction[]
}

export default function CategoryChart({ transactions }: CategoryChartProps) {
  // Calculate totals by category
  const categoryTotals = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      const cat = t.category as Category
      acc[cat] = (acc[cat] || 0) + t.amount
      return acc
    }, {} as Record<Category, number>)

  const totalExpenses = Object.values(categoryTotals).reduce((a, b) => a + b, 0)

  const data = Object.entries(categoryTotals)
    .map(([category, amount]) => ({
      name: CATEGORY_LABELS[category as Category] || category,
      value: amount,
      percentage: ((amount / totalExpenses) * 100).toFixed(1),
      color: CATEGORY_COLORS[category as Category] || CATEGORY_COLORS.otros
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6) // Top 6 categories

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-mist">
        No hay datos suficientes
      </div>
    )
  }

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)

  return (
    <div className="flex flex-col lg:flex-row items-center gap-6">
      {/* Chart */}
      <div className="w-full lg:w-1/2 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload
                  return (
                    <div className="glass rounded-lg px-3 py-2">
                      <p className="font-medium text-snow">{data.name}</p>
                      <p className="text-sm text-mist">{formatCurrency(data.value)}</p>
                      <p className="text-xs text-mint">{data.percentage}%</p>
                    </div>
                  )
                }
                return null
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="w-full lg:w-1/2 space-y-3">
        {data.map((item, index) => (
          <div 
            key={item.name} 
            className="flex items-center gap-3 animate-fade-in opacity-0"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div 
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm text-snow truncate">{item.name}</span>
                <span className="text-sm font-mono text-mist ml-2">{item.percentage}%</span>
              </div>
              <div className="mt-1 h-1.5 bg-ash rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: `${item.percentage}%`,
                    backgroundColor: item.color
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
