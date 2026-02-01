import type { BankEmail, Transaction } from '../types'

const GMAIL_API_BASE = 'https://www.googleapis.com/gmail/v1/users/me'

// Email addresses de los bancos colombianos
const BANK_SENDERS = {
  bancolombia: [
    'alertasynotificaciones@an.notificacionesbancolombia.com',
    'alertasynotificaciones@bancolombia.com.co',
    'notificaciones@bancolombia.com.co',
    'notificacionesbancolombia.com'
  ],
  nubank: [
    'todomundopuede@nu.com.co',
    'nu@nu.com.co',
    'alertas@nu.com.co'
  ]
}

export async function fetchBankEmails(
  accessToken: string,
  maxResults: number = 250
): Promise<BankEmail[]> {
  // Build query for bank emails
  const senderQuery = [
    ...BANK_SENDERS.bancolombia,
    ...BANK_SENDERS.nubank
  ].map(email => `from:${email}`).join(' OR ')
  
  const query = `(${senderQuery}) newer_than:90d`
  
  const response = await fetch(
    `${GMAIL_API_BASE}/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  )
  
  if (!response.ok) {
    throw new Error(`Gmail API error: ${response.status}`)
  }
  
  const data = await response.json()
  
  if (!data.messages || data.messages.length === 0) {
    return []
  }
  
  console.log(`Found ${data.messages.length} bank emails to process`)
  
  // Fetch full details for each message WITH RATE LIMITING
  // Process in batches of 5 with delay between batches to avoid 429
  const emails: BankEmail[] = []
  const batchSize = 5
  const delayMs = 500 // 500ms between batches
  
  for (let i = 0; i < data.messages.length; i += batchSize) {
    const batch = data.messages.slice(i, i + batchSize)
    
    console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(data.messages.length/batchSize)}`)
    
    const batchResults = await Promise.all(
      batch.map(async (msg: { id: string }) => {
        try {
          const msgResponse = await fetch(
            `${GMAIL_API_BASE}/messages/${msg.id}?format=full`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`
              }
            }
          )
          
          if (!msgResponse.ok) {
            console.log(`Failed to fetch message ${msg.id}: ${msgResponse.status}`)
            return null
          }
          
          const msgData = await msgResponse.json()
          return parseGmailMessage(msgData)
        } catch (err) {
          console.log(`Error fetching message ${msg.id}:`, err)
          return null
        }
      })
    )
    
    emails.push(...batchResults.filter((e): e is BankEmail => e !== null))
    
    // Wait before next batch (except for last batch)
    if (i + batchSize < data.messages.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }
  
  console.log(`Successfully fetched ${emails.length} emails`)
  return emails
}

function parseGmailMessage(message: any): BankEmail {
  const headers = message.payload.headers
  const getHeader = (name: string) => 
    headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || ''
  
  let body = ''
  
  // Extract body from message parts
  if (message.payload.body?.data) {
    body = decodeBase64(message.payload.body.data)
  } else if (message.payload.parts) {
    const textPart = message.payload.parts.find(
      (p: any) => p.mimeType === 'text/plain'
    )
    if (textPart?.body?.data) {
      body = decodeBase64(textPart.body.data)
    }
  }
  
  return {
    id: message.id,
    from: getHeader('From'),
    subject: getHeader('Subject'),
    date: getHeader('Date'),
    snippet: message.snippet,
    body
  }
}

function decodeBase64(data: string): string {
  try {
    const decoded = atob(data.replace(/-/g, '+').replace(/_/g, '/'))
    return decodeURIComponent(
      decoded.split('').map(c => 
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      ).join('')
    )
  } catch {
    return data
  }
}

// Parsers específicos para cada banco
export function parseBancolombiaEmail(email: BankEmail): Partial<Transaction> | null {
  const body = email.body || email.snippet
  
  // ===================
  // 1. TRANSFERENCIAS SALIENTES (tu envías dinero)
  // ===================
  // Formato 1: "Transferiste $92,900.00 por Boton Bancolombia a EMPRESA DE TELECOMUNICACIONES"
  // Formato 2: "NICOLAS, transferiste $520,000.00 a la llave @xxx ... a Juana Uribe Henao"
  const transferenciaMatch = body.match(/transferiste\s*\$\s*([\d.,]+)/i)
  
  if (transferenciaMatch) {
    const amount = parseColombianAmount(transferenciaMatch[1])
    if (isNaN(amount) || amount <= 0) return null
    
    // Buscar destinatario - varios formatos posibles
    let merchant = 'Transferencia'
    
    // Formato: "a EMPRESA DE..." o "a Juana Uribe Henao"
    const destMatch = body.match(/(?:a\s+la\s+llave\s+@\w+[^a]*a\s+|a\s+)([A-Z][A-Za-z\s]+?)(?:\s+desde|\s+el\s+\d|,|\.|$)/i)
    if (destMatch) {
      merchant = destMatch[1].trim()
    }
    
    // Formato: "por Boton Bancolombia a EMPRESA"
    const botonMatch = body.match(/por\s+Boton\s+Bancolombia\s+a\s+([A-Z][A-Z\s]+?)(?:\s+desde|\s+el\s+\d|,|\.|$)/i)
    if (botonMatch) {
      merchant = botonMatch[1].trim()
    }
    
    return {
      amount,
      merchant,
      bank: 'bancolombia',
      type: 'transfer',
      raw_email_id: email.id,
      raw_content: body.substring(0, 500),
      date: new Date(email.date).toISOString()
    }
  }
  
  // ===================
  // 2. INGRESOS (recibes dinero)
  // ===================
  // Formato 1: "Recibiste un pago de Nomina de BAVARIA & CIA S por $9,652,805.00"
  // Formato 2: "Recibiste una transferencia por $3,000,000 de VERONICA JIMENO"
  const esIngreso = /Recibiste|Te transfirieron|Te enviaron|Te consignaron/i.test(body)
  
  if (esIngreso) {
    const montoMatch = body.match(/\$\s*([\d.,]+)/i)
    if (!montoMatch) return null
    
    const amount = parseColombianAmount(montoMatch[1])
    if (isNaN(amount) || amount <= 0) return null
    
    let merchant = 'Ingreso'
    
    // Formato: "de NOMBRE" o "de Nomina de NOMBRE"
    const origenMatch = body.match(/(?:de\s+(?:Nomina\s+de\s+)?|de\s+parte\s+de\s+)([A-Z][A-Z0-9\s\&\.\-]+?)(?:\s+en\s+tu|\s+por\s+\$|\s+el\s+\d|,|$)/i)
    if (origenMatch) {
      merchant = origenMatch[1].trim()
    }
    
    return {
      amount,
      merchant,
      bank: 'bancolombia',
      type: 'income',
      raw_email_id: email.id,
      raw_content: body.substring(0, 500),
      date: new Date(email.date).toISOString()
    }
  }
  
  // ===================
  // 3. GASTOS (compras, pagos, retiros)
  // ===================
  // Formato: "Compraste $51.850,00 en RAPPI COLOMBIA*DL con tu T.Deb *0970"
  const compraMatch = body.match(
    /(?:Compraste|Compra por|Pagaste|Pago por|Retiraste|Retiro por)[^\$]*\$\s*([\d.,]+)/i
  )
  
  if (!compraMatch) return null
  
  const amount = parseColombianAmount(compraMatch[1])
  
  if (isNaN(amount) || amount <= 0) return null
  
  // Extract merchant - buscar después de "en "
  const merchantMatch = body.match(/\s+en\s+([A-Z0-9][A-Z0-9\s\*\-\.]+?)(?:\s+con|\s+el\s+\d|,|\.|$)/i)
  const merchant = merchantMatch 
    ? merchantMatch[1].trim().replace(/\*+$/, '').trim() 
    : 'Desconocido'
  
  // Determine transaction type
  let type: 'expense' | 'income' | 'transfer' = 'expense'
  if (/retir/i.test(body)) type = 'expense'
  
  return {
    amount,
    merchant,
    bank: 'bancolombia',
    type,
    raw_email_id: email.id,
    raw_content: body.substring(0, 500),
    date: new Date(email.date).toISOString()
  }
}

// Función para parsear montos en formato colombiano o americano
function parseColombianAmount(amountStr: string): number {
  // Ejemplos de formatos:
  // Colombiano: 51.850,00 (punto = miles, coma = decimal)
  // Americano: 9,652,805.00 (coma = miles, punto = decimal)
  // Simple: 50000
  
  // Contar puntos y comas
  const dots = (amountStr.match(/\./g) || []).length
  const commas = (amountStr.match(/,/g) || []).length
  
  // Si tiene punto y coma, determinar cuál es el decimal
  if (dots > 0 && commas > 0) {
    const lastDot = amountStr.lastIndexOf('.')
    const lastComma = amountStr.lastIndexOf(',')
    
    if (lastDot > lastComma) {
      // Formato americano: 9,652,805.00 - el punto es decimal
      return parseFloat(amountStr.replace(/,/g, ''))
    } else {
      // Formato colombiano: 51.850,00 - la coma es decimal
      return parseFloat(amountStr.replace(/\./g, '').replace(',', '.'))
    }
  }
  
  // Solo comas (ej: 9,652,805 o 1000,00)
  if (commas > 0 && dots === 0) {
    // Si hay múltiples comas, son separadores de miles
    if (commas > 1) {
      return parseFloat(amountStr.replace(/,/g, ''))
    }
    // Si solo hay una coma, ver si los decimales tienen 2 dígitos
    const parts = amountStr.split(',')
    if (parts[1] && parts[1].length === 2) {
      // Es decimal colombiano
      return parseFloat(amountStr.replace(',', '.'))
    } else {
      // Es separador de miles
      return parseFloat(amountStr.replace(/,/g, ''))
    }
  }
  
  // Solo puntos (ej: 51.850 o 1000.00)
  if (dots > 0 && commas === 0) {
    // Si hay múltiples puntos, son separadores de miles
    if (dots > 1) {
      return parseFloat(amountStr.replace(/\./g, ''))
    }
    // Si solo hay un punto, ver si los decimales tienen 2 dígitos
    const parts = amountStr.split('.')
    if (parts[1] && parts[1].length === 2) {
      // Es decimal americano
      return parseFloat(amountStr)
    } else {
      // Es separador de miles colombiano
      return parseFloat(amountStr.replace(/\./g, ''))
    }
  }
  
  // Sin puntos ni comas
  return parseFloat(amountStr)
}

export function parseNubankEmail(email: BankEmail): Partial<Transaction> | null {
  const body = email.body || email.snippet
  
  // Patrón para notificaciones de Nubank
  // Ejemplo: "Compra aprobada por $50.000 en RAPPI"
  const compraMatch = body.match(
    /(?:compra|pago|retiro)[^\$]*\$\s*([\d.,]+)/i
  )
  
  if (!compraMatch) return null
  
  const amountStr = compraMatch[1].replace(/\./g, '').replace(',', '.')
  const amount = parseFloat(amountStr)
  
  // Extract merchant
  const merchantMatch = body.match(/(?:en|a)\s+([A-Z][A-Z\s\d\*]+?)(?:\s+el|\s+por|\.|$)/i)
  const merchant = merchantMatch ? merchantMatch[1].trim() : 'Desconocido'
  
  return {
    amount,
    merchant,
    bank: 'nubank',
    type: 'expense',
    raw_email_id: email.id,
    raw_content: body.substring(0, 500),
    date: new Date(email.date).toISOString()
  }
}

export function parseEmailToTransaction(email: BankEmail): Partial<Transaction> | null {
  const fromLower = email.from.toLowerCase()
  
  if (fromLower.includes('bancolombia') || fromLower.includes('notificacionesbancolombia')) {
    return parseBancolombiaEmail(email)
  }
  
  if (fromLower.includes('nu.com')) {
    return parseNubankEmail(email)
  }
  
  return null
}
