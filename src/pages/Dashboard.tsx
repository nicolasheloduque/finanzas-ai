import { useState, useEffect } from 'react'
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  LogOut,
  BarChart3,
  Sparkles,
  Mail,
  ChevronLeft,
  ChevronRight,
  Calendar,
  RefreshCw
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { fetchBankEmails, parseEmailToTransaction } from '../lib/gmail'
import type { Transaction, Insight } from '../types'
import StatCard from '../components/StatCard'
import TransactionList from '../components/TransactionList'
import CategoryChart from '../components/CategoryChart'
import InsightCard from '../components/InsightCard'
import SyncButton from '../components/SyncButton'

export default function Dashboard() {
  const { user, signOut, googleAccessToken } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [insights, setInsights] = useState<Partial<Insight>[]>([])
  const [loading, setLoading] = useState(true)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'insights'>('overview')
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return { month: now.getMonth(), year: now.getFullYear() }
  })
  const [generatingInsights, setGeneratingInsights] = useState(false)

  // Generate AI insights
  const generateAIInsights = async () => {
    setGeneratingInsights(true)
    try {
      const response = await fetch('https://cbxbolkkimnctfqerwrn.supabase.co/functions/v1/generate-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const { insights: aiInsights, error } = await response.json()
      
      if (error) {
        console.error('Error generating insights:', error)
        return
      }
      
      if (aiInsights && aiInsights.length > 0) {
        // Transform to match our format
        const formattedInsights = aiInsights.map((i: any) => ({
          type: i.type === 'warning' ? 'alert' : i.type === 'tip' ? 'recommendation' : 'saving',
          title: i.title,
          content: i.description,
          priority: i.type === 'warning' ? 'high' : 'medium'
        }))
        setInsights(formattedInsights)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setGeneratingInsights(false)
    }
  }

  // Load existing transactions on mount
  useEffect(() => {
    loadTransactions()
  }, [user])

  const loadTransactions = async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })

      if (error) {
        console.error('Error loading transactions:', error)
      }
      setTransactions(data || [])

      // Load insights - don't fail if table doesn't exist or any error
      const { data: insightsData } = await supabase
        .from('insights')
        .select('*')
        .eq('user_id', user.id)
        .eq('dismissed', false)
        .order('created_at', { ascending: false })

      setInsights(insightsData || [])
    } catch (error) {
      console.error('Error loading data:', error)
      // Still set empty arrays on error
      setTransactions([])
      setInsights([])
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    if (!googleAccessToken || !user) {
      throw new Error('No hay conexión con Google. Intenta cerrar sesión y volver a entrar.')
    }

    // Fetch emails from Gmail
    const emails = await fetchBankEmails(googleAccessToken)
    
    if (emails.length === 0) {
      throw new Error('No se encontraron emails de bancos en los últimos 90 días')
    }

    // Parse emails to transactions
    const newTransactions: Partial<Transaction>[] = []
    
    for (const email of emails) {
      const parsed = parseEmailToTransaction(email)
      if (parsed) {
        // Check if we already have this transaction
        const exists = transactions.some(t => t.raw_email_id === email.id)
        if (!exists) {
          newTransactions.push({
            ...parsed,
            user_id: user.id,
            category: parsed.type === 'income' ? 'transferencias' : 'otros',
            ai_categorized: false
          })
        }
      }
    }

    if (newTransactions.length === 0) {
      setLastSync(new Date())
      return // No hay transacciones nuevas
    }

    // Save new transactions
    const { data: inserted, error } = await supabase
      .from('transactions')
      .insert(newTransactions)
      .select()

    if (error) {
      console.error('Error saving transactions:', error)
      throw new Error('Error guardando transacciones: ' + error.message)
    }

    // Update state
    setTransactions(prev => [...(inserted || []), ...prev])

    // Categorize with AI - process in batches of 20
    try {
      const BATCH_SIZE = 20
      for (let i = 0; i < inserted.length; i += BATCH_SIZE) {
        const batch = inserted.slice(i, i + BATCH_SIZE)
        console.log(`Categorizando batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(inserted.length/BATCH_SIZE)}...`)
        
        const response = await fetch('https://cbxbolkkimnctfqerwrn.supabase.co/functions/v1/categorize-transaction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transactions: batch.map(t => ({ description: t.merchant, amount: t.amount }))
          })
        })
        
        const { categories, error } = await response.json()
        
        if (error) {
          console.error('Error categorizando:', error)
          continue
        }
        
        // Update each transaction with its category
        for (const cat of categories) {
          const txn = batch[cat.index]
          if (txn) {
            await supabase
              .from('transactions')
              .update({ category: cat.category, ai_categorized: true })
              .eq('id', txn.id)
          }
        }
      }
      
      // Reload to show updated categories
      await loadTransactions()
    } catch (catError) {
      console.error('AI categorization error:', catError)
    }

    // Generate insights with AI
    try {
      const allTransactions = [...(inserted || []), ...transactions]
      
      const response = await fetch('https://cbxbolkkimnctfqerwrn.supabase.co/functions/v1/analyze-finances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: allTransactions })
      })
      
      const { insights: aiInsights, error } = await response.json()
      
      if (error) {
        console.error('Error generando insights:', error)
      } else if (aiInsights && aiInsights.length > 0) {
        // Clear old insights and add new ones
        await supabase.from('insights').delete().eq('user_id', user.id)
        
        const { data: newInsights } = await supabase
          .from('insights')
          .insert(aiInsights.map((i: any) => ({
            type: i.type === 'warning' ? 'alert' : i.type === 'tip' ? 'recommendation' : 'saving',
            title: i.title,
            content: i.description,
            priority: 'medium',
            user_id: user.id,
            dismissed: false
          })))
          .select()

        setInsights(newInsights || [])
      }
    } catch (aiError) {
      console.error('AI analysis error:', aiError)
    }

    setLastSync(new Date())
  }

  // Calculate stats based on selected month
  const monthlyTransactions = transactions.filter(t => {
    const d = new Date(t.date)
    return d.getMonth() === selectedMonth.month && d.getFullYear() === selectedMonth.year
  })

  const totalExpenses = monthlyTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const totalIncome = monthlyTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const totalTransfers = monthlyTransactions
    .filter(t => t.type === 'transfer')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const balance = totalIncome - totalExpenses - totalTransfers

  // Get available months from transactions
  const availableMonths = [...new Set(transactions.map(t => {
    const d = new Date(t.date)
    return `${d.getFullYear()}-${d.getMonth()}`
  }))].map(key => {
    const [year, month] = key.split('-').map(Number)
    return { year, month }
  }).sort((a, b) => b.year - a.year || b.month - a.month)

  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

  const goToPreviousMonth = () => {
    const currentIndex = availableMonths.findIndex(
      m => m.month === selectedMonth.month && m.year === selectedMonth.year
    )
    if (currentIndex < availableMonths.length - 1) {
      setSelectedMonth(availableMonths[currentIndex + 1])
    }
  }

  const goToNextMonth = () => {
    const currentIndex = availableMonths.findIndex(
      m => m.month === selectedMonth.month && m.year === selectedMonth.year
    )
    if (currentIndex > 0) {
      setSelectedMonth(availableMonths[currentIndex - 1])
    }
  }

  const canGoPrevious = availableMonths.findIndex(
    m => m.month === selectedMonth.month && m.year === selectedMonth.year
  ) < availableMonths.length - 1

  const canGoNext = availableMonths.findIndex(
    m => m.month === selectedMonth.month && m.year === selectedMonth.year
  ) > 0

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)

  if (loading) {
    return (
      <div className="min-h-screen bg-midnight flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-mint/20 border-t-mint rounded-full animate-spin mx-auto mb-4" />
          <p className="text-mist">Cargando tus finanzas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-midnight">
      {/* Header */}
      <header className="border-b border-white/5 bg-obsidian/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-mint to-mint-dark flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-midnight" />
              </div>
              <span className="font-display text-xl font-bold text-snow">
                Finanzas<span className="gradient-text">AI</span>
              </span>
            </div>

            <div className="flex items-center gap-4">
              <SyncButton onSync={handleSync} lastSync={lastSync} />
              
              <div className="flex items-center gap-3 pl-4 border-l border-white/10">
                <img 
                  src={user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${user?.email}`}
                  alt="Avatar"
                  className="w-8 h-8 rounded-full"
                />
                <button
                  onClick={signOut}
                  className="p-2 rounded-lg hover:bg-white/5 text-mist hover:text-snow transition-colors"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome message and Month selector */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4 animate-fade-in">
          <div>
            <h1 className="font-display text-2xl font-bold text-snow mb-1">
              Hola, {user?.user_metadata?.full_name?.split(' ')[0] || 'ahí'} 👋
            </h1>
            <p className="text-mist">
              {transactions.length === 0 
                ? 'Sincroniza tu correo para empezar a ver tus gastos'
                : `${monthlyTransactions.length} transacciones en ${monthNames[selectedMonth.month]}`
              }
            </p>
          </div>

          {/* Month Selector */}
          {availableMonths.length > 0 && (
            <div className="flex items-center gap-2 bg-obsidian rounded-xl p-1 border border-white/5">
              <button
                onClick={goToPreviousMonth}
                disabled={!canGoPrevious}
                className={`p-2 rounded-lg transition-colors ${
                  canGoPrevious 
                    ? 'hover:bg-white/10 text-mist hover:text-snow' 
                    : 'text-white/20 cursor-not-allowed'
                }`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-2 px-3 min-w-[160px] justify-center">
                <Calendar className="w-4 h-4 text-mint" />
                <span className="font-medium text-snow">
                  {monthNames[selectedMonth.month]} {selectedMonth.year}
                </span>
              </div>
              
              <button
                onClick={goToNextMonth}
                disabled={!canGoNext}
                className={`p-2 rounded-lg transition-colors ${
                  canGoNext 
                    ? 'hover:bg-white/10 text-mist hover:text-snow' 
                    : 'text-white/20 cursor-not-allowed'
                }`}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          <TabButton 
            active={activeTab === 'overview'} 
            onClick={() => setActiveTab('overview')}
            icon={<BarChart3 className="w-4 h-4" />}
          >
            Resumen
          </TabButton>
          <TabButton 
            active={activeTab === 'transactions'} 
            onClick={() => setActiveTab('transactions')}
            icon={<Wallet className="w-4 h-4" />}
          >
            Transacciones
          </TabButton>
          <TabButton 
            active={activeTab === 'insights'} 
            onClick={() => setActiveTab('insights')}
            icon={<Sparkles className="w-4 h-4" />}
            badge={insights.length > 0 ? insights.length : undefined}
          >
            Insights
          </TabButton>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="animate-slide-up stagger-1 opacity-0">
                <StatCard
                  title="Gastos del mes"
                  value={formatCurrency(totalExpenses)}
                  icon={<TrendingDown className="w-5 h-5" />}
                  variant="danger"
                />
              </div>
              <div className="animate-slide-up stagger-2 opacity-0">
                <StatCard
                  title="Ingresos del mes"
                  value={formatCurrency(totalIncome)}
                  icon={<TrendingUp className="w-5 h-5" />}
                  variant="success"
                />
              </div>
              <div className="animate-slide-up stagger-3 opacity-0">
                <StatCard
                  title="Balance"
                  value={formatCurrency(balance)}
                  icon={<Wallet className="w-5 h-5" />}
                  variant={balance >= 0 ? 'success' : 'danger'}
                />
              </div>
              <div className="animate-slide-up stagger-4 opacity-0">
                <StatCard
                  title="Transacciones"
                  value={monthlyTransactions.length.toString()}
                  subtitle="este mes"
                  icon={<Mail className="w-5 h-5" />}
                />
              </div>
            </div>

            {/* Charts and recent transactions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Category breakdown */}
              <div className="bg-obsidian rounded-2xl p-6 border border-white/5 animate-slide-up stagger-3 opacity-0">
                <h2 className="font-display text-lg font-semibold text-snow mb-4">
                  Gastos por categoría
                </h2>
                <CategoryChart transactions={monthlyTransactions} />
              </div>

              {/* Recent transactions */}
              <div className="bg-obsidian rounded-2xl p-6 border border-white/5 animate-slide-up stagger-4 opacity-0">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-lg font-semibold text-snow">
                    Últimas transacciones
                  </h2>
                  <button 
                    onClick={() => setActiveTab('transactions')}
                    className="text-sm text-mint hover:text-mint-dark transition-colors"
                  >
                    Ver todas →
                  </button>
                </div>
                <TransactionList transactions={transactions} limit={5} />
              </div>
            </div>

            {/* Top insights */}
            {insights.length > 0 && (
              <div className="animate-slide-up stagger-5 opacity-0">
                <h2 className="font-display text-lg font-semibold text-snow mb-4">
                  Insights destacados
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {insights.slice(0, 2).map((insight, i) => (
                    <InsightCard key={i} insight={insight} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="bg-obsidian rounded-2xl p-6 border border-white/5 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold text-snow">
                Transacciones de {monthNames[selectedMonth.month]} {selectedMonth.year}
              </h2>
              <span className="text-sm text-mist">
                {monthlyTransactions.length} transacciones
              </span>
            </div>
            <TransactionList transactions={monthlyTransactions} />
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-snow">
                Insights y recomendaciones
              </h2>
              <button
                onClick={generateAIInsights}
                disabled={generatingInsights}
                className="flex items-center gap-2 px-4 py-2 bg-mint text-midnight rounded-xl font-medium hover:bg-mint-dark transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${generatingInsights ? 'animate-spin' : ''}`} />
                {generatingInsights ? 'Analizando...' : 'Analizar con IA'}
              </button>
            </div>
            {insights.length === 0 ? (
              <div className="bg-obsidian rounded-2xl p-12 border border-white/5 text-center">
                <Sparkles className="w-12 h-12 text-mint/50 mx-auto mb-4" />
                <p className="text-mist mb-4">
                  Genera insights personalizados con inteligencia artificial
                </p>
                <button
                  onClick={generateAIInsights}
                  disabled={generatingInsights}
                  className="px-6 py-3 bg-mint text-midnight rounded-xl font-medium hover:bg-mint-dark transition-colors disabled:opacity-50"
                >
                  {generatingInsights ? 'Analizando...' : 'Generar Insights con IA'}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {insights.map((insight, i) => (
                  <InsightCard 
                    key={i} 
                    insight={insight}
                    onDismiss={() => {
                      setInsights(prev => prev.filter((_, idx) => idx !== i))
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function TabButton({ 
  children, 
  active, 
  onClick, 
  icon,
  badge
}: { 
  children: React.ReactNode
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  badge?: number
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 whitespace-nowrap
        ${active 
          ? 'bg-mint text-midnight' 
          : 'bg-white/5 text-mist hover:bg-white/10 hover:text-snow'
        }
      `}
    >
      {icon}
      {children}
      {badge !== undefined && (
        <span className={`
          px-1.5 py-0.5 rounded-full text-xs font-bold
          ${active ? 'bg-midnight/20 text-midnight' : 'bg-mint text-midnight'}
        `}>
          {badge}
        </span>
      )}
    </button>
  )
}
