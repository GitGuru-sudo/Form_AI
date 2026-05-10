"use client"

import { Sidebar } from "@/components/Sidebar"
import { QuestionCard } from "@/components/QuestionCard"
import { FieldSelector } from "@/components/FieldSelector"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useState, useEffect } from "react"
import { Form, Question } from "@/types"
import { ArrowLeft, Save, Sparkles, Send } from "lucide-react"
import { useRouter } from "next/navigation"
import api from "@/lib/api"
import { useAuth } from "@clerk/nextjs"

export default function PreviewPage() {
  const router = useRouter()
  const { getToken } = useAuth()
  const [form, setForm] = useState<Partial<Form> | null>(null)
  const [step, setStep] = useState(1) // 1: Questions, 2: Fields
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem("generatedForm")
    if (saved) {
      setForm(JSON.parse(saved))
    } else {
      router.push("/create")
    }
  }, [router])

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

  const handleFieldChange = (field: string, value: boolean) => {
    setForm(prev => ({ ...prev!, [field]: value }))
  }

  const handlePublish = async () => {
    setIsSaving(true)
    try {
      const token = await getToken()
      const res = await api.post("/api/forms", form, {
        headers: { Authorization: `Bearer ${token}` }
      })
      localStorage.removeItem("generatedForm")
      router.push(`/dashboard?published=${res.data.shareToken}`)
    } catch (err) {
      console.error(err)
      alert("Failed to publish form")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
      <Sidebar />
      <main className="flex flex-1 flex-col relative overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-8 py-4 bg-slate-950/80 backdrop-blur-md border-b border-slate-900">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft size={20} />
            </Button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                {step === 1 ? "Fine-tune Questions" : "Personal Information"}
                <Sparkles size={16} className="text-indigo-400" />
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-1.5 w-24 rounded-full bg-slate-800 mr-4 overflow-hidden">
              <div className="h-full bg-indigo-600 transition-all duration-500" style={{ width: step === 1 ? "50%" : "100%" }} />
            </div>
            {step === 1 ? (
              <Button className="bg-indigo-600 hover:bg-indigo-700 border-0" onClick={() => setStep(2)}>
                Next: Fields
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                <Button className="bg-indigo-600 hover:bg-indigo-700 border-0" onClick={handlePublish} disabled={isSaving}>
                  {isSaving ? "Publishing..." : "Publish Form"}
                  <Send size={16} className="ml-2" />
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="p-8 max-w-4xl mx-auto w-full space-y-12">
          {step === 1 ? (
            <>
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
                    Add new question
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <FieldSelector 
              config={{
                collectFullName: !!form.collectFullName,
                collectEmail: !!form.collectEmail,
                collectPhone: !!form.collectPhone,
                collectAge: !!form.collectAge,
                collectDateOfBirth: !!form.collectDateOfBirth,
                collectGender: !!form.collectGender
              }}
              onChange={handleFieldChange}
            />
          )}
        </div>
      </main>
    </div>
  )
}
