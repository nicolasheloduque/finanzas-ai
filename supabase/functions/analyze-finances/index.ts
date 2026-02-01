import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { transactions, monthlyIncome } = await req.json()

    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY not configured')
    }

    // Prepare transaction summary
    const byCategory: Record<string, number> = {}
    const byMerchant: Record<string, { count: number; total: number }> = {}
    let totalExpenses = 0

    for (const t of transactions) {
      if (t.type === 'expense') {
        totalExpenses += t.amount
        byCategory[t.category] = (byCategory[t.category] || 0) + t.amount
        
        if (!byMerchant[t.merchant]) {
          byMerchant[t.merchant] = { count: 0, total: 0 }
        }
        byMerchant[t.merchant].count++
        byMerchant[t.merchant].total += t.amount
      }
    }

    const summary = {
      totalExpenses,
      monthlyIncome: monthlyIncome || null,
      categorySummary: byCategory,
      topMerchants: Object.entries(byMerchant)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 10)
        .map(([name, data]) => ({ name, ...data })),
      recurringPayments: Object.entries(byMerchant)
        .filter(([_, data]) => data.count >= 2)
        .map(([name, data]) => ({ name, ...data }))
    }

    const prompt = `Eres un asesor financiero personal experto en finanzas colombianas. Analiza estos datos del último mes y genera insights accionables.

DATOS DEL MES:
${JSON.stringify(summary, null, 2)}

Genera un análisis con máximo 5 insights importantes. Para cada insight incluye:
- Tipo: "leakage" (gastos innecesarios), "saving" (oportunidad de ahorro), "debt" (manejo de deuda), "recommendation" (sugerencia general), "alert" (alerta importante)
- Prioridad: "high", "medium", "low"
- Impacto estimado en pesos colombianos cuando aplique

Responde SOLO con JSON válido en este formato:
{
  "insights": [
    {
      "type": "leakage",
      "title": "Título corto",
      "content": "Descripción detallada de máximo 2 oraciones",
      "priority": "high",
      "amount_impact": 150000
    }
  ],
  "recommendations": [
    "Recomendación 1",
    "Recomendación 2"
  ]
}

Sé específico con nombres de comercios y montos reales del resumen.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Anthropic API error: ${error}`)
    }

    const data = await response.json()
    const content = data.content[0].text

    // Extract JSON from response (Claude might add markdown)
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }

    const parsed = JSON.parse(jsonMatch[0])

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error:', error)
    
    return new Response(JSON.stringify({
      insights: [],
      recommendations: [
        'Revisa tus suscripciones mensuales',
        'Considera establecer un presupuesto'
      ]
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
