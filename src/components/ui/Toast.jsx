import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react'

const ToastCtx = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((msg, type = 'info', duration = 4000) => {
    const id = Date.now()
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), duration)
  }, [])

  const remove = (id) => setToasts(t => t.filter(x => x.id !== id))

  return (
    <ToastCtx.Provider value={{ toast: addToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-xs w-full">
        {toasts.map(t => (
          <ToastItem key={t.id} {...t} onRemove={() => remove(t.id)} />
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

function ToastItem({ id, msg, type, onRemove }) {
  const cfg = {
    success: { bg: 'bg-green-600', Icon: CheckCircle },
    error:   { bg: 'bg-red-600',   Icon: XCircle },
    info:    { bg: 'bg-blue-600',  Icon: AlertCircle },
    warning: { bg: 'bg-yellow-500',Icon: AlertCircle },
  }[type] || { bg: 'bg-gray-800', Icon: AlertCircle }

  return (
    <div className={`${cfg.bg} text-white rounded-xl px-4 py-3 flex items-center gap-3 shadow-lg animate-in slide-in-from-right duration-200`}>
      <cfg.Icon size={16} className="shrink-0" />
      <p className="text-sm font-medium flex-1">{msg}</p>
      <button onClick={onRemove}><X size={14} /></button>
    </div>
  )
}

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
