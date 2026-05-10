"use client"

import { Sidebar } from "@/components/Sidebar"
import { useState, useEffect } from "react"
import { Form, FormResponse } from "@/types"
import api from "@/lib/api"
import { useAuth } from "@clerk/nextjs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Download, ArrowLeft } from "lucide-react"
import { useRouter, useParams } from "next/navigation"
import { format } from "date-fns"

function ResponsesSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <Skeleton className="h-10 w-64 bg-slate-800" />
        <Skeleton className="h-10 w-32 bg-slate-800" />
      </div>
      <Skeleton className="h-96 w-full bg-slate-800 rounded-xl" />
    </div>
  )
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
      link.setAttribute('download', `responses-${form?.title?.replace(/\s+/g, '-').toLowerCase() || id}.csv`)
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
          <div className="max-w-6xl mx-auto">
            <ResponsesSkeleton />
          </div>
        </main>
      </div>
    )
  }
  if (!form) return <div className="p-8 text-white">Form not found</div>

  // Determine dynamic columns
  const getDynamicValue = (res: FormResponse, qId: string) => {
    const ans = res.answers.find(a => a.questionId === qId)
    return ans ? ans.answerText : "-"
  }

  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft size={20} />
            </Button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold">{form.title}</h1>
              <p className="text-slate-500">Viewing {responses.length} responses</p>
            </div>
            <Button onClick={handleExport} className="bg-indigo-600 hover:bg-indigo-700">
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
            <Table>
              <TableHeader className="bg-slate-950">
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="w-[200px]">Submitted At</TableHead>
                  {form.collectFullName && <TableHead>Name</TableHead>}
                  {form.collectEmail && <TableHead>Email</TableHead>}
                  {form.questions.map(q => (
                    <TableHead key={q.questionId} className="min-w-[150px]">{q.questionText}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {responses.map((res) => (
                  <TableRow key={res._id} className="border-slate-800 hover:bg-slate-800/50 transition-colors">
                    <TableCell className="text-slate-400 font-mono text-xs">
                      {format(new Date(res.submittedAt), 'MMM d, HH:mm')}
                    </TableCell>
                    {form.collectFullName && <TableCell className="font-medium">{res.respondentName || "-"}</TableCell>}
                    {form.collectEmail && <TableCell>{res.respondentEmail || "-"}</TableCell>}
                    {form.questions.map(q => (
                      <TableCell key={q.questionId} className="text-slate-300">
                        {getDynamicValue(res, q.questionId)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                {responses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={100} className="h-48 text-center text-slate-500">
                      No responses yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>
    </div>
  )
}
