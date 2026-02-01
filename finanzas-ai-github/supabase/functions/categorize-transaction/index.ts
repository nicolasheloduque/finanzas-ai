import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { merchant, amount, raw_content } = await req.json()

    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY not configured')
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 150,
        messages: [{
          role: 'user',
          content: `Categoriza esta transacción financiera colombiana:
Comercio: ${merchant}
Monto: $${amount}
${raw_content ? `Detalle: ${raw_content}` : ''}

Responde SOLO con un JSON válido con este formato exacto:
{"category": "categoria", "subcategory": "subcategoria", "confidence": 0.95}

Las categorías válidas son: mercado, restaurantes, transporte, entretenimiento, salud, educacion, hogar, ropa, suscripciones, transferencias, retiros, servicios, otros

Ejemplos:
- EXITO → mercado
- RAPPI → restaurantes
- UBER → transporte
- NETFLIX → suscripciones
- DROGUERIAS → salud`
        }]
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Anthropic API error: ${error}`)
    }

    const data = await response.json()
    const content = data.content[0].text

    // Parse the JSON response
    const parsed = JSON.parse(content)

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error:', error)
    
    // Return default categorization on error
    return new Response(JSON.stringify({
      category: 'otros',
      confidence: 0.5
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
