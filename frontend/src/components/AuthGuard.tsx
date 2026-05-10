"use client"

import { useAuth } from "@clerk/nextjs"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

const SESSION_KEY = "formai:last-auth-at"
const HOUR_MS = 24 * 60 * 60 * 1000

export function setSessionTimestamp() {
  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_KEY, Date.now().toString())
  }
}

export function getSessionTimestamp(): number | null {
  if (typeof window === "undefined") return null
  const stored = localStorage.getItem(SESSION_KEY)
  return stored ? parseInt(stored, 10) : null
}

export function isWithinSessionWindow(): boolean {
  const lastAuth = getSessionTimestamp()
  if (!lastAuth) return false
  return Date.now() - lastAuth < HOUR_MS
}

interface HomeAuthHandlerProps {
  redirectTo?: string
}

export function HomeAuthHandler({ redirectTo = "/dashboard" }: HomeAuthHandlerProps) {
  const { isSignedIn, isLoaded } = useAuth()
  const router = useRouter()
  const [showNotice, setShowNotice] = useState(false)

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      setSessionTimestamp()
      if (isWithinSessionWindow()) {
        setShowNotice(true)
        const timer = setTimeout(() => {
          router.replace(redirectTo)
        }, 2500)
        return () => clearTimeout(timer)
      } else {
        router.replace(redirectTo)
      }
    }
  }, [isLoaded, isSignedIn, router, redirectTo])

  if (!isLoaded || !isSignedIn || !showNotice) {
    return null
  }

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2">
      <div className="bg-indigo-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-3">
        <span>Welcome back. Redirecting to dashboard...</span>
        <div className="flex gap-1">
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  )
}