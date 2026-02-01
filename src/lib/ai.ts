import type { Transaction, Insight, Category } from '../types'
import { supabase } from './supabase'

interface ClaudeResponse {
  category: Category
  subcategory?: string
  confidence: number
}

interface AnalysisResult {
  insights: Partial<Insight>[]
  recommendations: string[]
}

// Esta función llama a una Edge Function de Supabase que tiene la API key de Claude
export async function categorizeTransaction(
  transaction: Partial<Transaction>
): Promise<ClaudeResponse> {
  const { data, error } = await supabase.functions.invoke('categorize-transaction', {
    body: {
      merchant: transaction.merchant,
      amount: transaction.amount,
      raw_content: transaction.raw_content
    }
  })
  
  if (error) {
    console.error('Error categorizing:', error)
    // Fallback to rule-based categorization
    return {
      category: categorizeByRules(transaction.merchant || ''),
      confidence: 0.5
    }
  }
  
  return data
}

// Categorización basada en reglas como fallback
function categorizeByRules(merchant: string): Category {
  const m = merchant.toLowerCase()
  
  // Mercado / Supermercados
  if (/exito|carulla|jumbo|olimpica|d1|ara|metro|alkosto|makro|surtimax/i.test(m)) {
    return 'mercado'
  }
  
  // Restaurantes
  if (/rappi|ifood|domicilios|restaurant|burguer|pizza|sushi|comida|cafe|starbucks|juan valdez|crepes|wok|frisby|kokoriko|el corral|mcdonalds|subway/i.test(m)) {
    return 'restaurantes'
  }
  
  // Transporte
  if (/uber|didi|beat|cabify|indriver|gasolina|terpel|texaco|mobil|primax|parqueadero|peaje/i.test(m)) {
    return 'transporte'
  }
  
  // Entretenimiento
  if (/netflix|spotify|disney|hbo|amazon prime|youtube|cine|cinecolombia|procinal|cinemark|teatro|concierto/i.test(m)) {
    return 'entretenimiento'
  }
  
  // Salud
  if (/farmacia|drogueria|cruz verde|colsubsidio|cafam|medico|hospital|clinica|eps|salud|optica/i.test(m)) {
    return 'salud'
  }
  
  // Hogar
  if (/homecenter|easy|falabella|ikea|tugó|muebles|decoracion|ferreteria|epm|gas natural|acueducto|energia/i.test(m)) {
    return 'hogar'
  }
  
  // Servicios / Telecomunicaciones
  if (/claro|movistar|tigo|etb|virgin|wom|internet|celular/i.test(m)) {
    return 'servicios'
  }
  
  // Ropa
  if (/zara|h&m|pull.*bear|bershka|tennis|adidas|nike|arturo calle|studio f|ela|offcorss/i.test(m)) {
    return 'ropa'
  }
  
  // Retiros
  if (/retiro|cajero|atm/i.test(m)) {
    return 'retiros'
  }
  
  // Transferencias
  if (/transferencia|nequi|daviplata|pse/i.test(m)) {
    return 'transferencias'
  }
  
  return 'otros'
}

// Análisis completo de finanzas con Claude
export async function analyzeFinances(
  transactions: Transaction[],
  monthlyIncome?: number
): Promise<AnalysisResult> {
  const { data, error } = await supabase.functions.invoke('analyze-finances', {
    body: {
      transactions,
      monthlyIncome
    }
  })
  
  if (error) {
    console.error('Error analyzing:', error)
    return generateBasicAnalysis(transactions)
  }
  
  return data
}

// Análisis básico sin IA como fallback
function generateBasicAnalysis(transactions: Transaction[]): AnalysisResult {
  const insights: Partial<Insight>[] = []
  const recommendations: string[] = []
  
  // Calcular totales por categoría
  const byCategory = transactions.reduce((acc, t) => {
    if (t.type === 'expense') {
      acc[t.category] = (acc[t.category] || 0) + t.amount
    }
    return acc
  }, {} as Record<string, number>)
  
  const totalExpenses = Object.values(byCategory).reduce((a, b) => a + b, 0)
  
  // Detectar categorías con alto gasto
  for (const [category, amount] of Object.entries(byCategory)) {
    const percentage = (amount / totalExpenses) * 100
    
    if (percentage > 30) {
      insights.push({
        type: 'alert',
        title: `Alto gasto en ${category}`,
        content: `El ${percentage.toFixed(0)}% de tus gastos van a ${category}. Considera revisar si hay oportunidades de optimización.`,
        priority: 'high',
        amount_impact: amount
      })
    }
  }
  
  // Detectar posibles suscripciones
  const merchantCounts = transactions.reduce((acc, t) => {
    acc[t.merchant] = (acc[t.merchant] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  for (const [merchant, count] of Object.entries(merchantCounts)) {
    if (count >= 2) {
      insights.push({
        type: 'leakage',
        title: `Posible suscripción: ${merchant}`,
        content: `Tienes ${count} pagos a ${merchant} este mes. ¿Es una suscripción activa que sigues usando?`,
        priority: 'medium'
      })
    }
  }
  
  // Recomendaciones básicas
  if (byCategory['restaurantes'] > byCategory['mercado']) {
    recommendations.push(
      'Estás gastando más en restaurantes que en mercado. Cocinar en casa podría ahorrarte hasta un 40%.'
    )
  }
  
  return { insights, recommendations }
}

// Función para obtener consejos de ahorro personalizados
export async function getSavingTips(
  transactions: Transaction[],
  goal?: string
): Promise<string[]> {
  const { data, error } = await supabase.functions.invoke('saving-tips', {
    body: {
      transactions,
      goal
    }
  })
  
  if (error) {
    return [
      'Revisa tus suscripciones mensuales y cancela las que no uses',
      'Establece un presupuesto semanal para gastos discrecionales',
      'Considera la regla 50/30/20: 50% necesidades, 30% deseos, 20% ahorro'
    ]
  }
  
  return data.tips
}
