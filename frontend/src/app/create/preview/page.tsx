"use client"

import { Sidebar } from "@/components/Sidebar"
import { QuestionCard } from "@/components/QuestionCard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useState, useEffect } from "react"
import { Form, Question } from "@/types"
import { ArrowLeft, Sparkles, Send, Plus, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import axios from "axios"
import api from "@/lib/api"
import { useAuth } from "@clerk/nextjs"
import { useToast } from "@/components/ui/toast"

// Minimum time the publishing overlay stays visible so the transition reads as
// a deliberate "building your form" moment rather than a flicker.
const PUBLISH_LOADER_MS = 2500

export default function PreviewPage() {
  const router = useRouter()
  const { getToken } = useAuth()
  const { toast } = useToast()
  const [form, setForm] = useState<Partial<Form> | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem("generatedForm")
    if (saved) {
      setForm(JSON.parse(saved))
    } else {
      router.push("/create")
    }
  }, [router])

  useEffect(() => {
    if (form) {
      localStorage.setItem("generatedForm", JSON.stringify(form))
    }
  }, [form])

  if (!form) return null

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setForm(prev => {
      if (!prev) return null
      const newQuestions = prev.questions?.map(q =>
        q.questionId === id ? { ...q, ...updates } : q
      )
      return { ...prev, questions: newQuestions }
    })
  }

  const deleteQuestion = (id: string) => {
    setForm(prev => {
      if (!prev) return null
      const newQuestions = prev.questions?.filter(q => q.questionId !== id)
      return { ...prev, questions: newQuestions }
    })
  }

  const addQuestion = () => {
    const newQ: Question = {
      questionId: Date.now().toString(),
      questionText: "New Question",
      questionType: "short_answer",
      isRequired: false,
      orderIndex: (form.questions?.length || 0)
    }
    setForm(prev => ({
      ...prev!,
      questions: [...(prev!.questions || []), newQ]
    }))
  }

  const handlePublish = async () => {
    setIsSaving(true)
    // Run the publish request and the loader timer in parallel, then resolve on
    // whichever finishes last so the overlay always shows for at least ~2.5s.
    const minDelay = new Promise(resolve => setTimeout(resolve, PUBLISH_LOADER_MS))
    try {
      const token = await getToken()
      const [res] = await Promise.all([
        api.post("/api/forms", form, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        minDelay
      ])
      localStorage.removeItem("generatedForm")
      router.push(`/dashboard?published=${res.data.shareToken}`)
    } catch (err) {
      console.error(err)
      const status = axios.isAxiosError(err) ? err.response?.status : undefined
      if (status === 401) {
        toast.error("Session expired", { description: "Please sign in and try again." })
      } else if (status === 400) {
        const message =
          (axios.isAxiosError(err) && err.response?.data?.message) ||
          "Check the form title and questions, then try again."
        toast.error("Invalid form data", { description: message })
      } else {
        toast.error("Couldn't publish form", { description: "Please try again." })
      }
      setIsSaving(false)
    }
  }

  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
      <Sidebar />
      <main id="main-content" className="flex flex-1 flex-col relative overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-8 py-4 bg-slate-950/80 backdrop-blur-md border-b border-slate-900">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Go back">
              <ArrowLeft size={20} aria-hidden="true" />
            </Button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                Fine-tune Questions
                <Sparkles size={16} className="text-indigo-400" />
              </h1>
              <p className="text-xs text-slate-400">Review your questions, then publish to get a shareable link.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 border-0"
              onClick={handlePublish}
              disabled={isSaving}
            >
              Publish Form
              <Send size={16} className="ml-2" />
            </Button>
          </div>
        </div>

        <div className="p-8 max-w-4xl mx-auto w-full space-y-12">
          <div className="space-y-6">
            <div className="space-y-2">
              <Input
                value={form.title}
                onChange={(e) => setForm(prev => ({ ...prev!, title: e.target.value }))}
                className="text-4xl font-extrabold bg-transparent border-0 border-b border-slate-900 rounded-none h-auto py-2 px-0 focus-visible:ring-0 focus-visible:border-indigo-600 transition-colors"
                placeholder="Form Title"
              />
              <Textarea
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev!, description: e.target.value }))}
                className="text-slate-400 bg-transparent border-0 focus-visible:ring-0 resize-none min-h-0 h-auto py-0 px-0"
                placeholder="Add a description..."
              />
            </div>

            <div className="space-y-6 mt-12">
              {form.questions?.map((q) => (
                <QuestionCard
                  key={q.questionId}
                  question={q}
                  onUpdate={updateQuestion}
                  onDelete={deleteQuestion}
                />
              ))}
              <Button
                variant="outline"
                className="w-full h-16 border-dashed border-slate-800 bg-slate-900/20 hover:bg-slate-900/40 hover:border-slate-700 text-slate-500 hover:text-slate-300"
                onClick={addQuestion}
              >
                <Plus size={18} className="mr-2" />
                Add new question
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Publishing overlay */}
      {isSaving && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="relative flex h-20 w-20 items-center justify-center">
            <span className="absolute inset-0 rounded-full border-2 border-indigo-500/20" />
            <Loader2 size={56} className="animate-spin text-indigo-500" />
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold flex items-center justify-center gap-2">
              <Sparkles size={18} className="text-indigo-400" />
              Publishing your form
            </p>
            <p className="text-sm text-slate-400 mt-1">Setting up your shareable link…</p>
          </div>
        </div>
      )}
    </div>
  )
}
