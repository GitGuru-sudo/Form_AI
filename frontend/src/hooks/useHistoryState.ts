import { useCallback, useState } from "react"

interface HistoryState<T> {
  past: T[]
  present: T
  future: T[]
}

export interface UseHistoryState<T> {
  state: T
  set: (next: T | ((prev: T) => T)) => void
  reset: (value: T) => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
}

const MAX_HISTORY = 100

export function useHistoryState<T>(initial: T): UseHistoryState<T> {
  const [history, setHistory] = useState<HistoryState<T>>({
    past: [],
    present: initial,
    future: [],
  })

  const set = useCallback((next: T | ((prev: T) => T)) => {
    setHistory(curr => {
      const resolved =
        typeof next === "function"
          ? (next as (prev: T) => T)(curr.present)
          : next
      if (Object.is(resolved, curr.present)) return curr
      const past = [...curr.past, curr.present]
      if (past.length > MAX_HISTORY) past.shift()
      return { past, present: resolved, future: [] }
    })
  }, [])

  const reset = useCallback((value: T) => {
    setHistory({ past: [], present: value, future: [] })
  }, [])

  const undo = useCallback(() => {
    setHistory(curr => {
      if (curr.past.length === 0) return curr
      const previous = curr.past[curr.past.length - 1]
      const past = curr.past.slice(0, -1)
      return { past, present: previous, future: [curr.present, ...curr.future] }
    })
  }, [])

  const redo = useCallback(() => {
    setHistory(curr => {
      if (curr.future.length === 0) return curr
      const next = curr.future[0]
      const future = curr.future.slice(1)
      return { past: [...curr.past, curr.present], present: next, future }
    })
  }, [])

  return {
    state: history.present,
    set,
    reset,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  }
}
