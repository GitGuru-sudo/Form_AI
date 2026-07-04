"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface ConfirmOptions {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  /** Style the confirm action as destructive (red). */
  destructive?: boolean
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = React.createContext<ConfirmFn | null>(null)

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = React.useState<ConfirmOptions | null>(null)
  const resolverRef = React.useRef<((value: boolean) => void) | null>(null)

  const confirm = React.useCallback<ConfirmFn>(options => {
    setOptions(options)
    return new Promise<boolean>(resolve => {
      resolverRef.current = resolve
    })
  }, [])

  const settle = React.useCallback((result: boolean) => {
    resolverRef.current?.(result)
    resolverRef.current = null
    setOptions(null)
  }, [])

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog
        open={options !== null}
        onOpenChange={open => {
          // Backdrop click / Escape resolves as "cancelled".
          if (!open) settle(false)
        }}
      >
        {options && (
          <DialogContent showCloseButton={false} className="bg-slate-900 border border-slate-800 ring-slate-800">
            <DialogHeader>
              <DialogTitle className="text-white">{options.title}</DialogTitle>
              {options.description && (
                <DialogDescription className="text-slate-400">{options.description}</DialogDescription>
              )}
            </DialogHeader>
            <DialogFooter className="border-slate-800 bg-slate-950/40">
              <Button
                variant="outline"
                className="border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800 hover:text-white"
                onClick={() => settle(false)}
              >
                {options.cancelLabel ?? "Cancel"}
              </Button>
              <Button
                autoFocus
                className={
                  options.destructive
                    ? "border-0 bg-red-600 text-white hover:bg-red-700"
                    : "border-0 bg-indigo-600 text-white hover:bg-indigo-700"
                }
                onClick={() => settle(true)}
              >
                {options.confirmLabel ?? "Confirm"}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = React.useContext(ConfirmContext)
  if (!ctx) throw new Error("useConfirm must be used within a ConfirmProvider")
  return ctx
}
