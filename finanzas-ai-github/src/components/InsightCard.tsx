import { AlertTriangle, Lightbulb, TrendingDown, PiggyBank, X } from 'lucide-react'
import type { Insight } from '../types'

interface InsightCardProps {
  insight: Partial<Insight>
  onDismiss?: () => void
}

const TYPE_CONFIG = {
  leakage: {
    icon: <TrendingDown className="w-5 h-5" />,
    color: 'coral',
    bgColor: 'bg-coral/10',
    borderColor: 'border-coral/20',
    textColor: 'text-coral'
  },
  saving: {
    icon: <PiggyBank className="w-5 h-5" />,
    color: 'mint',
    bgColor: 'bg-mint/10',
    borderColor: 'border-mint/20',
    textColor: 'text-mint'
  },
  debt: {
    icon: <AlertTriangle className="w-5 h-5" />,
    color: 'gold',
    bgColor: 'bg-gold/10',
    borderColor: 'border-gold/20',
    textColor: 'text-gold'
  },
  recommendation: {
    icon: <Lightbulb className="w-5 h-5" />,
    color: 'purple',
    bgColor: 'bg-purple/10',
    borderColor: 'border-purple/20',
    textColor: 'text-purple'
  },
  alert: {
    icon: <AlertTriangle className="w-5 h-5" />,
    color: 'coral',
    bgColor: 'bg-coral/10',
    borderColor: 'border-coral/20',
    textColor: 'text-coral'
  }
}

const PRIORITY_BADGE = {
  low: 'bg-mist/20 text-mist',
  medium: 'bg-gold/20 text-gold',
  high: 'bg-coral/20 text-coral'
}

export default function InsightCard({ insight, onDismiss }: InsightCardProps) {
  const type = insight.type || 'recommendation'
  const config = TYPE_CONFIG[type]
  const priority = insight.priority || 'medium'

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)

  return (
    <div className={`${config.bgColor} ${config.borderColor} border rounded-2xl p-5 card-hover relative`}>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/10 transition-colors text-mist hover:text-snow"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      <div className="flex items-start gap-4">
        <div className={`${config.bgColor} ${config.textColor} p-3 rounded-xl`}>
          {config.icon}
        </div>

        <div className="flex-1 min-w-0 pr-6">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-snow">{insight.title}</h3>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_BADGE[priority]}`}>
              {priority === 'high' ? 'Urgente' : priority === 'medium' ? 'Importante' : 'Info'}
            </span>
          </div>

          <p className="text-sm text-mist leading-relaxed">
            {insight.content}
          </p>

          {insight.amount_impact && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5">
              <span className="text-xs text-mist">Impacto potencial:</span>
              <span className={`font-mono font-medium ${config.textColor}`}>
                {formatCurrency(insight.amount_impact)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
