"use client"

import { Sidebar } from "@/components/Sidebar"
import { useState, useEffect } from "react"
import { Form, FormResponse } from "@/types"
import api from "@/lib/api"
import { useAuth } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Download, ArrowLeft, Edit3 } from "lucide-react"
import { useRouter, useParams } from "next/navigation"

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
  const [form, setForm] = useState<Form | null>(null)
  const [responses, setResponses] = useState<FormResponse[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await getToken()
        const [formRes, respRes] = await Promise.all([
          api.get(`/api/forms/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
          api.get(`/api/forms/${id}/responses`, { headers: { Authorization: `Bearer ${token}` } })
        ])
        setForm(formRes.data)
        setResponses(respRes.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

  const handleExport = async () => {
    try {
      const token = await getToken()
      const response = await api.get(`/api/forms/${id}/responses/export`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `responses-${form?.title?.replace(/\s+/g, '-').toLowerCase() || id}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err) {
      console.error("Export failed", err)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto">
            <ResponsesSkeleton />
          </div>
        </main>
      </div>
    )
  }
  if (!form) return <div className="p-8 text-white">Form not found</div>

  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft size={20} />
            </Button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold">{form.title}</h1>
              <p className="text-slate-500">{responses.length} response{responses.length !== 1 ? "s" : ""}</p>
            </div>
            <Button variant="outline" className="border-slate-700" onClick={() => router.push(`/forms/${id}`)}>
              <Edit3 className="mr-2 h-4 w-4" /> Edit Form
            </Button>
            <Button onClick={handleExport} className="bg-indigo-600 hover:bg-indigo-700">
              <Download className="mr-2 h-4 w-4" /> Download Excel
            </Button>
          </div>

          {responses.length === 0 ? (
            <div className="text-center py-24 text-slate-500">
              <p className="text-lg">No responses yet.</p>
              <p className="text-sm mt-1">Share the form link to start collecting responses.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {responses.map((res) => (
                <div key={res._id} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="font-semibold text-indigo-400">Personal Information</h3>
                    <span className="text-xs text-slate-500">{formatLocalTime(res.submittedAt)}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {form.collectFullName && (
                      <div>
                        <span className="text-slate-500">Full Name</span>
                        <p className="text-white">{res.respondentName || "-"}</p>
                      </div>
                    )}
                    {form.collectEmail && (
                      <div>
                        <span className="text-slate-500">Email</span>
                        <p className="text-white">{res.respondentEmail || "-"}</p>
                      </div>
                    )}
                    {form.collectPhone && (
                      <div>
                        <span className="text-slate-500">Phone</span>
                        <p className="text-white">{res.respondentPhone || "-"}</p>
                      </div>
                    )}
                    {form.collectAge && (
                      <div>
                        <span className="text-slate-500">Age</span>
                        <p className="text-white">{res.respondentAge ?? "-"}</p>
                      </div>
                    )}
                    {form.collectDateOfBirth && (
                      <div>
                        <span className="text-slate-500">Date of Birth</span>
                        <p className="text-white">{res.respondentDOB ? new Date(res.respondentDOB).toLocaleDateString() : "-"}</p>
                      </div>
                    )}
                    {form.collectGender && (
                      <div>
                        <span className="text-slate-500">Gender</span>
                        <p className="text-white">{res.respondentGender || "-"}</p>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-800 pt-4 space-y-3">
                    {form.questions.sort((a, b) => a.orderIndex - b.orderIndex).map((q) => {
                      const ans = res.answers.find(a => a.questionId === q.questionId)
                      return (
                        <div key={q.questionId}>
                          <span className="text-sm text-slate-500">{q.questionText}</span>
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
