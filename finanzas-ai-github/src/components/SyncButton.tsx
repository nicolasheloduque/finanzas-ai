import { useState } from 'react'
import { RefreshCw, Check, AlertCircle } from 'lucide-react'

interface SyncButtonProps {
  onSync: () => Promise<void>
  lastSync?: Date | null
}

export default function SyncButton({ onSync, lastSync }: SyncButtonProps) {
  const [status, setStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const handleSync = async () => {
    setStatus('syncing')
    setError(null)

    try {
      await onSync()
      setStatus('success')
      setTimeout(() => setStatus('idle'), 2000)
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Error al sincronizar')
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  const formatLastSync = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)

    if (minutes < 1) return 'Hace un momento'
    if (minutes < 60) return `Hace ${minutes} min`
    if (hours < 24) return `Hace ${hours}h`
    return date.toLocaleDateString('es-CO')
  }

  return (
    <div className="flex items-center gap-3">
      {lastSync && (
        <span className="text-sm text-mist">
          Última sync: {formatLastSync(lastSync)}
        </span>
      )}

      <button
        onClick={handleSync}
        disabled={status === 'syncing'}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200
          ${status === 'syncing' 
            ? 'bg-mint/20 text-mint cursor-wait' 
            : status === 'success'
            ? 'bg-mint/20 text-mint'
            : status === 'error'
            ? 'bg-coral/20 text-coral'
            : 'bg-mint text-midnight hover:bg-mint-dark'
          }
        `}
      >
        {status === 'syncing' ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            Sincronizando...
          </>
        ) : status === 'success' ? (
          <>
            <Check className="w-4 h-4" />
            ¡Listo!
          </>
        ) : status === 'error' ? (
          <>
            <AlertCircle className="w-4 h-4" />
            Error
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4" />
            Sincronizar
          </>
        )}
      </button>

      {error && (
        <span className="text-sm text-coral">{error}</span>
      )}
    </div>
  )
}
