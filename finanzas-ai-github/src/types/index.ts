export interface User {
  id: string
  email: string
  name?: string
  avatar_url?: string
  google_access_token?: string
  google_refresh_token?: string
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  amount: number
  merchant: string
  category: string
  subcategory?: string
  date: string
  bank: 'bancolombia' | 'nubank' | 'other'
  type: 'expense' | 'income' | 'transfer'
  raw_email_id?: string
  raw_content?: string
  ai_categorized: boolean
  created_at: string
}

export interface Insight {
  id: string
  user_id: string
  type: 'leakage' | 'saving' | 'debt' | 'recommendation' | 'alert'
  title: string
  content: string
  priority: 'low' | 'medium' | 'high'
  amount_impact?: number
  action_url?: string
  dismissed: boolean
  created_at: string
}

export interface MonthlyStats {
  month: string
  total_income: number
  total_expenses: number
  savings: number
  savings_rate: number
  top_categories: CategoryStat[]
}

export interface CategoryStat {
  category: string
  amount: number
  percentage: number
  trend: 'up' | 'down' | 'stable'
}

export interface BankEmail {
  id: string
  from: string
  subject: string
  date: string
  snippet: string
  body?: string
}

export type Category = 
  | 'mercado'
  | 'restaurantes'
  | 'transporte'
  | 'entretenimiento'
  | 'salud'
  | 'educacion'
  | 'hogar'
  | 'ropa'
  | 'suscripciones'
  | 'transferencias'
  | 'retiros'
  | 'servicios'
  | 'otros'

export const CATEGORY_COLORS: Record<Category, string> = {
  mercado: '#00d4aa',
  restaurantes: '#ff6b6b',
  transporte: '#ffd93d',
  entretenimiento: '#a855f7',
  salud: '#3b82f6',
  educacion: '#14b8a6',
  hogar: '#f97316',
  ropa: '#ec4899',
  suscripciones: '#8b5cf6',
  transferencias: '#6366f1',
  retiros: '#64748b',
  servicios: '#22c55e',
  otros: '#94a3b8'
}

export const CATEGORY_LABELS: Record<Category, string> = {
  mercado: 'Mercado',
  restaurantes: 'Restaurantes',
  transporte: 'Transporte',
  entretenimiento: 'Entretenimiento',
  salud: 'Salud',
  educacion: 'Educación',
  hogar: 'Hogar',
  ropa: 'Ropa y Accesorios',
  suscripciones: 'Suscripciones',
  transferencias: 'Transferencias',
  retiros: 'Retiros',
  servicios: 'Servicios',
  otros: 'Otros'
}
