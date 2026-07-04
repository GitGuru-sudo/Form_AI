"use client"

import { Sidebar } from "@/components/Sidebar"
import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { Form, FormResponse } from "@/types"
import api from "@/lib/api"
import { useAuth } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Download, ArrowLeft, Edit3, ChevronDown, FileSpreadsheet, FileText, FileType, Search, X, List, BarChart3 } from "lucide-react"
import { useRouter, useParams } from "next/navigation"
import { useToast } from "@/components/ui/toast"
import { ResponsesCharts } from "@/components/ResponsesCharts"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"

function ResponsesSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <Skeleton className="h-10 w-64 bg-slate-800" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24 bg-slate-800" />
          <Skeleton className="h-10 w-40 bg-slate-800" />
        </div>
      </div>
      {[1, 2, 3].map(i => (
        <Skeleton key={i} className="h-40 w-full bg-slate-800 rounded-xl" />
      ))}
    </div>
  )
}

function formatLocalTime(iso: string): string {
  const d = new Date(iso)
  const hours = d.getHours()
  const minutes = d.getMinutes().toString().padStart(2, "0")
  const ampm = hours >= 12 ? "PM" : "AM"
  const h12 = (hours % 12 || 12).toString().padStart(2, "0")
  const day = d.getDate().toString().padStart(2, "0")
  const month = (d.getMonth() + 1).toString().padStart(2, "0")
  const year = d.getFullYear()
  return `${h12}:${minutes} ${ampm}, ${day}/${month}/${year}`
}

export default function ResponsesPage() {
  const router = useRouter()
  const { id } = useParams()
  const { getToken } = useAuth()
  const { toast } = useToast()
  const [form, setForm] = useState<Form | null>(null)
  const [responses, setResponses] = useState<FormResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [newCount, setNewCount] = useState(0)
  const knownCount = useRef(0)
  const [view, setView] = useState<"individual" | "summary">("individual")
  const [partialStats, setPartialStats] = useState<{ total: number; dropoff: { questionId: string; questionText: string; count: number }[] } | null>(null)

  const refreshResponses = useCallback(async () => {
    try {
      const token = await getToken()
      const respRes = await api.get(`/api/forms/${id}/responses`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data: FormResponse[] = respRes.data
      if (knownCount.current && data.length > knownCount.current) {
        setNewCount(prev => prev + (data.length - knownCount.current))
      }
      knownCount.current = data.length
      setResponses(data)
    } catch (err) {
      console.error(err)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await getToken()
        const [formRes, respRes, partRes] = await Promise.all([
          api.get(`/api/forms/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
          api.get(`/api/forms/${id}/responses`, { headers: { Authorization: `Bearer ${token}` } }),
          api.get(`/api/forms/${id}/responses/partials`, { headers: { Authorization: `Bearer ${token}` } }),
        ])
        setForm(formRes.data)
        setResponses(respRes.data)
        knownCount.current = respRes.data.length
        setPartialStats(partRes.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

  useEffect(() => {
    const POLL_MS = 15000
    const tick = () => {
      if (document.visibilityState === "visible") refreshResponses()
    }
    const interval = window.setInterval(tick, POLL_MS)
    const onVisible = () => { if (document.visibilityState === "visible") refreshResponses() }
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [refreshResponses])

  const [query, setQuery] = useState("")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")

  const filteredResponses = useMemo(() => {
    const q = query.trim().toLowerCase()
    const fromTs = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null
    const toTs = toDate ? new Date(`${toDate}T23:59:59.999`).getTime() : null

    return responses.filter(r => {
      const ts = new Date(r.submittedAt).getTime()
      if (fromTs !== null && ts < fromTs) return false
      if (toTs !== null && ts > toTs) return false
      if (!q) return true

      const haystack = [
        r.respondentName, r.respondentEmail, r.respondentPhone,
        r.respondentGender,
        r.respondentAge != null ? String(r.respondentAge) : "",
        ...r.answers.map(a => a.answerText),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [responses, query, fromDate, toDate])

  const filtersActive = query.trim() !== "" || fromDate !== "" || toDate !== ""

  const handleExport = async (format: "xlsx" | "csv" | "pdf") => {
    const path =
      format === "xlsx"
        ? `/api/forms/${id}/responses/export`
        : `/api/forms/${id}/responses/export/${format}`
    try {
      const token = await getToken()
      const response = await api.get(path, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement("a")
      link.href = url
      const base = form?.title?.replace(/\s+/g, "-").toLowerCase() || id
      link.setAttribute("download", `responses-${base}.${format}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error("Export failed", err)
      toast.error("Couldn't export responses", { description: "Please try again." })
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
        <Sidebar />
        <main id="main-content" className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto">
            <ResponsesSkeleton />
          </div>
        </main>
      </div>
    )
  }
  if (!form) {
    return (
      <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
        <Sidebar />
        <main id="main-content" className="flex flex-1 items-center justify-center p-6">
          <div className="max-w-md space-y-4 text-center">
            <h1 className="text-2xl font-bold">Form not found</h1>
            <p className="text-slate-400">
              This form may have been deleted, or you don&apos;t have access to it.
            </p>
            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => router.push("/dashboard")}>
              Back to workspace
            </Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
      <Sidebar />
      <main id="main-content" className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Go back">
              <ArrowLeft size={20} aria-hidden="true" />
            </Button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold">{form.title}</h1>
              <div className="flex items-center gap-3">
                <p className="text-slate-400">{responses.length} response{responses.length !== 1 ? "s" : ""}</p>
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                  </span>
                  Live
                </span>
                {newCount > 0 && (
                  <button
                    onClick={() => setNewCount(0)}
                    className="text-xs rounded-full bg-indigo-600/20 text-indigo-300 border border-indigo-600/30 px-2 py-0.5 hover:bg-indigo-600/30 transition-colors"
                  >
                    {newCount} new — dismiss
                  </button>
                )}
              </div>
            </div>
            <Button variant="outline" className="border-slate-700" onClick={() => router.push(`/forms/${id}`)}>
              <Edit3 className="mr-2 h-4 w-4" /> Edit Form
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                disabled={responses.length === 0}
                className="inline-flex items-center justify-center rounded-md bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:pointer-events-none px-4 py-2 text-sm font-medium text-white transition-colors"
              >
                <Download className="mr-2 h-4 w-4" /> Export
                <ChevronDown className="ml-2 h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-slate-900 border border-slate-800 text-white min-w-40">
                <DropdownMenuItem onClick={() => handleExport("xlsx")} className="focus:bg-slate-800">
                  <FileSpreadsheet className="h-4 w-4 text-green-400" /> Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("csv")} className="focus:bg-slate-800">
                  <FileText className="h-4 w-4 text-sky-400" /> CSV (.csv)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("pdf")} className="focus:bg-slate-800">
                  <FileType className="h-4 w-4 text-red-400" /> PDF (.pdf)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="inline-flex rounded-lg border border-slate-800 bg-slate-900 p-1">
              <button
                onClick={() => setView("individual")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${view === "individual" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
              >
                <List className="h-4 w-4" /> Individual
              </button>
              <button
                onClick={() => setView("summary")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${view === "summary" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
              >
                <BarChart3 className="h-4 w-4" /> Summary
              </button>
            </div>
          </div>

          {partialStats && partialStats.total > 0 && (
            <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-6">
              <div className="flex items-center justify-between border-b border-amber-500/10 pb-3 mb-3">
                <h3 className="font-semibold text-amber-300">Started but didn&apos;t submit</h3>
                <span className="text-2xl font-bold text-amber-300">{partialStats.total}</span>
              </div>
              <ul className="space-y-2 text-sm">
                {partialStats.dropoff.map(d => (
                  <li key={d.questionId} className="flex items-center justify-between">
                    <span className="text-slate-300 truncate">Last reached: {d.questionText}</span>
                    <span className="text-slate-500">{d.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {responses.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search answers, name, email…"
                  className="w-full rounded-lg bg-slate-900 border border-slate-800 pl-9 pr-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-600 transition-colors"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-600 transition-colors [color-scheme:dark]"
                />
                <span className="text-slate-500 text-sm">to</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-600 transition-colors [color-scheme:dark]"
                />
              </div>
              {filtersActive && (
                <button
                  onClick={() => { setQuery(""); setFromDate(""); setToDate("") }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 px-3 py-2 text-sm text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
                >
                  <X className="h-4 w-4" /> Clear
                </button>
              )}
            </div>
          )}

          {filtersActive && (
            <p className="text-sm text-slate-400 mb-4">
              Showing {filteredResponses.length} of {responses.length} responses
            </p>
          )}

          {responses.length === 0 ? (
            <div className="text-center py-24 text-slate-400">
              <p className="text-lg">No responses yet.</p>
              <p className="text-sm mt-1">Share the form link to start collecting responses.</p>
            </div>
          ) : view === "summary" ? (
            <ResponsesCharts form={form} responses={responses} />
          ) : filteredResponses.length === 0 ? (
            <div className="text-center py-24 text-slate-400">
              <p className="text-lg">No responses match your filters.</p>
              <p className="text-sm mt-1">Try a different search term or date range.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredResponses.map((res) => (
                <div key={res._id} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="font-semibold text-indigo-400">Personal Information</h3>
                    <span className="text-xs text-slate-500">{formatLocalTime(res.submittedAt)}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {form.collectFullName && (
                      <div>
                        <span className="text-slate-400">Full Name</span>
                        <p className="text-white">{res.respondentName || "-"}</p>
                      </div>
                    )}
                    {form.collectEmail && (
                      <div>
                        <span className="text-slate-400">Email</span>
                        <p className="text-white">{res.respondentEmail || "-"}</p>
                      </div>
                    )}
                    {form.collectPhone && (
                      <div>
                        <span className="text-slate-400">Phone</span>
                        <p className="text-white">{res.respondentPhone || "-"}</p>
                      </div>
                    )}
                    {form.collectAge && (
                      <div>
                        <span className="text-slate-400">Age</span>
                        <p className="text-white">{res.respondentAge ?? "-"}</p>
                      </div>
                    )}
                    {form.collectDateOfBirth && (
                      <div>
                        <span className="text-slate-400">Date of Birth</span>
                        <p className="text-white">{res.respondentDOB ? new Date(res.respondentDOB).toLocaleDateString() : "-"}</p>
                      </div>
                    )}
                    {form.collectGender && (
                      <div>
                        <span className="text-slate-400">Gender</span>
                        <p className="text-white">{res.respondentGender || "-"}</p>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-800 pt-4 space-y-3">
                    {[...form.questions].sort((a, b) => a.orderIndex - b.orderIndex).map((q) => {
                      const ans = res.answers.find(a => a.questionId === q.questionId)
                      return (
                        <div key={q.questionId}>
                          <span className="text-sm text-slate-400">{q.questionText}</span>
                          <p className="text-white whitespace-pre-wrap">{ans?.answerText || "-"}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
