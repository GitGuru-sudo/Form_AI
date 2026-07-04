"use client"

import * as React from "react"
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react"
import { cn } from "@/lib/utils"

type ToastVariant = "success" | "error" | "info"

interface ToastOptions {
  description?: string
}

interface ToastItem extends ToastOptions {
  id: number
  title: string
  variant: ToastVariant
  leaving?: boolean
}

interface ToastApi {
  (title: string, opts?: ToastOptions): void
  success: (title: string, opts?: ToastOptions) => void
  error: (title: string, opts?: ToastOptions) => void
  info: (title: string, opts?: ToastOptions) => void
}

const ToastContext = React.createContext<{ toast: ToastApi } | null>(null)

let nextId = 0
const VISIBLE_MS = 4000
const EXIT_MS = 200

const variantStyles: Record<ToastVariant, { icon: typeof Info; tone: string }> = {
  success: { icon: CheckCircle2, tone: "text-green-400" },
  error: { icon: AlertCircle, tone: "text-red-400" },
  info: { icon: Info, tone: "text-indigo-400" },
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([])
  // window.setTimeout returns a number in the browser; pin the map to that so
  // the value type doesn't resolve to Node's `Timeout` via @types/node.
  const timers = React.useRef(new Map<number, number>())

  const dismiss = React.useCallback((id: number) => {
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
    // Play the exit animation, then drop the toast from the stack.
    setToasts(prev => prev.map(t => (t.id === id ? { ...t, leaving: true } : t)))
    window.setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, EXIT_MS)
  }, [])

  const push = React.useCallback(
    (variant: ToastVariant, title: string, opts?: ToastOptions) => {
      const id = ++nextId
      setToasts(prev => [...prev, { id, title, variant, ...opts }])
      timers.current.set(id, window.setTimeout(() => dismiss(id), VISIBLE_MS))
    },
    [dismiss]
  )

  React.useEffect(() => {
    const active = timers.current
    return () => active.forEach(clearTimeout)
  }, [])

  const toast = React.useMemo<ToastApi>(() => {
    const fn = ((title: string, opts?: ToastOptions) => push("info", title, opts)) as ToastApi
    fn.success = (title, opts) => push("success", title, opts)
    fn.error = (title, opts) => push("error", title, opts)
    fn.info = (title, opts) => push("info", title, opts)
    return fn
  }, [push])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        role="region"
        aria-label="Notifications"
        aria-live="polite"
        className="pointer-events-none fixed bottom-0 right-0 z-[60] flex w-full max-w-sm flex-col gap-2 p-4"
      >
        {toasts.map(t => {
          const { icon: Icon, tone } = variantStyles[t.variant]
          return (
            <div
              key={t.id}
              role="status"
              className={cn(
                "pointer-events-auto flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 shadow-2xl ring-1 ring-black/20",
                "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-300",
                t.leaving &&
                  "motion-safe:animate-out motion-safe:fade-out motion-safe:slide-out-to-right-4 motion-safe:duration-200"
              )}
            >
              <Icon className={cn("mt-0.5 h-5 w-5 flex-shrink-0", tone)} aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{t.title}</p>
                {t.description && <p className="mt-0.5 text-sm text-slate-400">{t.description}</p>}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="-mr-1 -mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used within a ToastProvider")
  return ctx
}
