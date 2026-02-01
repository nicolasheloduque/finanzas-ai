import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { 
  ShoppingCart, 
  Utensils, 
  Car, 
  Film, 
  Heart, 
  GraduationCap,
  Home,
  Shirt,
  CreditCard,
  ArrowLeftRight,
  Banknote,
  Wrench,
  MoreHorizontal
} from 'lucide-react'
import type { Transaction, Category } from '../types'
import { CATEGORY_COLORS } from '../types'

interface TransactionListProps {
  transactions: Transaction[]
  limit?: number
}

const CATEGORY_ICONS: Record<Category, React.ReactNode> = {
  mercado: <ShoppingCart className="w-4 h-4" />,
  restaurantes: <Utensils className="w-4 h-4" />,
  transporte: <Car className="w-4 h-4" />,
  entretenimiento: <Film className="w-4 h-4" />,
  salud: <Heart className="w-4 h-4" />,
  educacion: <GraduationCap className="w-4 h-4" />,
  hogar: <Home className="w-4 h-4" />,
  ropa: <Shirt className="w-4 h-4" />,
  suscripciones: <CreditCard className="w-4 h-4" />,
  transferencias: <ArrowLeftRight className="w-4 h-4" />,
  retiros: <Banknote className="w-4 h-4" />,
  servicios: <Wrench className="w-4 h-4" />,
  otros: <MoreHorizontal className="w-4 h-4" />
}

export default function TransactionList({ transactions, limit }: TransactionListProps) {
  const displayTransactions = limit ? transactions.slice(0, limit) : transactions

  if (displayTransactions.length === 0) {
    return (
      <div className="text-center py-12 text-mist">
        <p>No hay transacciones para mostrar</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {displayTransactions.map((transaction, index) => (
        <TransactionItem 
          key={transaction.id} 
          transaction={transaction}
          style={{ animationDelay: `${index * 50}ms` }}
        />
      ))}
    </div>
  )
}

function TransactionItem({ 
  transaction,
  style
}: { 
  transaction: Transaction
  style?: React.CSSProperties
}) {
  const category = transaction.category as Category
  const color = CATEGORY_COLORS[category] || CATEGORY_COLORS.otros
  const icon = CATEGORY_ICONS[category] || CATEGORY_ICONS.otros

  const formattedAmount = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(transaction.amount)

  const formattedDate = format(new Date(transaction.date), "d MMM, HH:mm", { locale: es })

  return (
    <div 
      className="flex items-center gap-4 p-4 rounded-xl bg-obsidian/50 hover:bg-obsidian transition-colors animate-fade-in opacity-0"
      style={style}
    >
      {/* Icon */}
      <div 
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: `${color}20`, color }}
      >
        {icon}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-snow truncate">{transaction.merchant}</p>
        <div className="flex items-center gap-2 text-sm text-mist">
          <span 
            className="px-2 py-0.5 rounded-full text-xs"
            style={{ backgroundColor: `${color}20`, color }}
          >
            {transaction.category}
          </span>
          <span>•</span>
          <span>{formattedDate}</span>
        </div>
      </div>

      {/* Amount */}
      <div className="text-right">
        <p className={`font-mono font-medium ${
          transaction.type === 'income' ? 'text-mint' : 'text-snow'
        }`}>
          {transaction.type === 'income' ? '+' : '-'}{formattedAmount}
        </p>
        <p className="text-xs text-mist capitalize">{transaction.bank}</p>
      </div>
    </div>
  )
}
