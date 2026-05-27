"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Form, Question, Answer } from "@/types"
import api from "@/lib/api"
import { FormRenderer } from "@/components/FormRenderer"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { CheckCircle2, AlertCircle } from "lucide-react"

function FormSkeleton() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="space-y-2 mb-12">
        <Skeleton className="h-10 w-3/4 bg-slate-800" />
        <Skeleton className="h-6 w-full bg-slate-800" />
      </div>
      <div className="space-y-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-6 w-1/2 bg-slate-800" />
            <Skeleton className="h-12 w-full bg-slate-800" />
          </div>
        ))}
      </div>
      <Skeleton className="h-14 w-full bg-slate-800" />
    </div>
  )
}

export default function PublicFormPage() {
  const { token } = useParams()
  const [form, setForm] = useState<Form | null>(null)
  const [responses, setResponses] = useState<Record<string, any>>({})
  const [personalInfo, setPersonalInfo] = useState<Record<string, any>>({})
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [closed, setClosed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/api/f/${token}`).then((res) => {
      if (res.data.closed) {
        setClosed(true)
      } else {
        setForm(res.data)
      }
    }).catch(err => {
      console.error(err)
    }).finally(() => {
      setLoading(false)
    })
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const preparedAnswers: Answer[] = form!.questions.map(q => ({
      questionId: q.questionId,
      questionText: q.questionText,
      answerText: String(responses[q.questionId] || "")
    }))

    try {
      await api.post(`/api/f/${token}/submit`, {
        ...personalInfo,
        answers: preparedAnswers
      })
      setIsSubmitted(true)
      window.scrollTo(0, 0)
    } catch (err) {
      alert("Submission failed. Please try again.")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white py-12 px-6">
        <FormSkeleton />
      </div>
    )
  }

  if (closed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white p-6">
        <div className="text-center space-y-6 max-w-md">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
            <AlertCircle className="h-10 w-10 text-red-400" />
          </div>
          <h1 className="text-3xl font-bold">This form is closed</h1>
          <p className="text-slate-400">The owner has deactivated this form for now. It is no longer accepting new responses.</p>
        </div>
      </div>
    )
  }

  if (isSubmitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white p-6">
        <div className="text-center space-y-6 max-w-md scale-in">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10 border border-green-500/20">
            <CheckCircle2 className="h-10 w-10 text-green-400" />
          </div>
          <h1 className="text-3xl font-bold">Thank you!</h1>
          <p className="text-slate-400">Your response has been successfully submitted to <strong>{form?.title}</strong>.</p>
          <p className="text-xs text-slate-600">Built with FormAI</p>
        </div>
      </div>
    )
  }

  if (!form) return null

  return (
    <div className="min-h-screen bg-slate-950 text-white py-12 px-6">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="space-y-2 mb-12">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
            {form.title}
          </h1>
          {form.description && <p className="text-slate-400 text-lg leading-relaxed">{form.description}</p>}
        </div>

        <form onSubmit={handleSubmit} className="space-y-12">
          {/* Personal Info Section */}
          {(form.collectFullName || form.collectEmail || form.collectPhone || form.collectAge || form.collectDateOfBirth || form.collectGender) && (
            <Card className="p-8 bg-slate-900 border-slate-800 space-y-6">
              <h2 className="text-xl font-bold text-indigo-400 mb-2">Participant Information</h2>
              
              {form.collectFullName && (
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input 
                    required 
                    onChange={(e) => setPersonalInfo(p => ({...p, respondentName: e.target.value}))}
                    className="bg-slate-950 border-slate-800"
                  />
                </div>
              )}
              {form.collectEmail && (
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input 
                    type="email" 
                    required 
                    onChange={(e) => setPersonalInfo(p => ({...p, respondentEmail: e.target.value}))}
                    className="bg-slate-950 border-slate-800"
                  />
                </div>
              )}
              {form.collectPhone && (
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input
                    type="tel"
                    required
                    onChange={(e) => setPersonalInfo(p => ({...p, respondentPhone: e.target.value}))}
                    className="bg-slate-950 border-slate-800"
                  />
                </div>
              )}
              {form.collectAge && (
                <div className="space-y-2">
                  <Label>Age</Label>
                  <Input
                    type="number"
                    min="1"
                    max="150"
                    required
                    onChange={(e) => setPersonalInfo(p => ({...p, respondentAge: Number(e.target.value)}))}
                    className="bg-slate-950 border-slate-800"
                  />
                </div>
              )}
              {form.collectDateOfBirth && (
                <div className="space-y-2">
                  <Label>Date of Birth</Label>
                  <Input
                    type="date"
                    required
                    onChange={(e) => setPersonalInfo(p => ({...p, respondentDOB: e.target.value}))}
                    className="bg-slate-950 border-slate-800"
                  />
                </div>
              )}
              {form.collectGender && (
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Input
                    required
                    onChange={(e) => setPersonalInfo(p => ({...p, respondentGender: e.target.value}))}
                    className="bg-slate-950 border-slate-800"
                  />
                </div>
              )}
            </Card>
          )}

          {/* Questions Section */}
          {form.questions.sort((a, b) => a.orderIndex - b.orderIndex).map((q) => (
            <div key={q.questionId} className="space-y-4">
              <Label className="text-lg font-semibold flex items-start gap-1">
                {q.questionText}
                {q.isRequired && <span className="text-red-500 font-bold">*</span>}
              </Label>
              <FormRenderer 
                question={q} 
                value={responses[q.questionId] || ""}
                onChange={(val) => setResponses(prev => ({ ...prev, [q.questionId]: val }))}
              />
            </div>
          ))}

          <Button type="submit" className="w-full h-14 text-lg bg-indigo-600 hover:bg-indigo-700 transition-all font-bold">
            Submit Response
          </Button>
        </form>

        <p className="text-center text-slate-600 text-xs mt-12">
          Never submit passwords through FormAI. Created with FormAI.
        </p>
      </div>
    </div>
  )
}
