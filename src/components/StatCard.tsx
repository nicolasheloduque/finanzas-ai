import type { ReactNode } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string
  subtitle?: string
  trend?: 'up' | 'down' | 'stable'
  trendValue?: string
  icon?: ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger'
}

export default function StatCard({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  icon,
  variant = 'default'
}: StatCardProps) {
  const variantStyles = {
    default: 'bg-obsidian',
    success: 'bg-gradient-to-br from-mint/20 to-mint/5',
    warning: 'bg-gradient-to-br from-gold/20 to-gold/5',
    danger: 'bg-gradient-to-br from-coral/20 to-coral/5'
  }

  const trendColors = {
    up: 'text-mint',
    down: 'text-coral',
    stable: 'text-mist'
  }

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus

  return (
    <div className={`${variantStyles[variant]} rounded-2xl p-6 card-hover border border-white/5`}>
      <div className="flex items-start justify-between mb-4">
        <span className="text-mist text-sm font-medium">{title}</span>
        {icon && (
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-mist">
            {icon}
          </div>
        )}
      </div>
      
      <div className="space-y-1">
        <p className="font-display text-3xl font-bold text-snow">{value}</p>
        
        {(trend || subtitle) && (
          <div className="flex items-center gap-2">
            {trend && (
              <div className={`flex items-center gap-1 ${trendColors[trend]}`}>
                <TrendIcon className="w-4 h-4" />
                {trendValue && <span className="text-sm font-medium">{trendValue}</span>}
              </div>
            )}
            {subtitle && (
              <span className="text-sm text-mist">{subtitle}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
