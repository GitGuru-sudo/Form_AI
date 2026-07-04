"use client"

import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import { Form, Answer } from "@/types"
import api from "@/lib/api"
import { FormRenderer, validateAnswer } from "@/components/FormRenderer"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react"

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
  const sessionIdRef = useRef<string>(
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  )
  const [form, setForm] = useState<Form | null>(null)
  const [responses, setResponses] = useState<Record<string, any>>({})
  const [personalInfo, setPersonalInfo] = useState<Record<string, any>>({})
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [closed, setClosed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleAnswerChange = (questionId: string, val: any) => {
    setResponses(prev => ({ ...prev, [questionId]: val }))
    // Clear a field's required-error as soon as the respondent answers it.
    setErrors(prev => {
      if (!prev[questionId]) return prev
      const next = { ...prev }
      delete next[questionId]
      return next
    })
  }

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

  useEffect(() => {
    if (!form || isSubmitted) return
    const answeredIds = Object.keys(responses).filter(qid => {
      const v = responses[qid]
      if (Array.isArray(v)) return v.length > 0
      return v != null && String(v).trim() !== ""
    })
    if (answeredIds.length === 0) return

    const ordered = [...form.questions].sort((a, b) => a.orderIndex - b.orderIndex)
    const lastQ = [...ordered].reverse().find(q => answeredIds.includes(q.questionId))

    const handle = window.setTimeout(() => {
      api.post(`/api/f/${token}/partial`, {
        sessionId: sessionIdRef.current,
        answeredCount: answeredIds.length,
        lastQuestionReached: lastQ?.questionId ?? "",
        lastQuestionText: lastQ?.questionText ?? "",
      }).catch(() => {})
    }, 1200)

    return () => window.clearTimeout(handle)
  }, [responses, form, isSubmitted, token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    // Required + per-question validation in one pass, preserving order so the
    // "scroll to first error" lands on the topmost problem.
    const fieldErrors: Record<string, string> = {}
    for (const q of form!.questions) {
      const v = responses[q.questionId]
      const isEmpty = Array.isArray(v) ? v.length === 0 : !v || String(v).trim() === ""
      if (q.isRequired && isEmpty) {
        fieldErrors[q.questionId] = "This question is required."
        continue
      }
      const ruleError = validateAnswer(q, v)
      if (ruleError) fieldErrors[q.questionId] = ruleError
    }
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors)
      const firstId = form!.questions.find(q => fieldErrors[q.questionId])?.questionId
      if (firstId) {
        document.getElementById(`q-${firstId}`)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        })
      }
      return
    }
    setErrors({})

    const preparedAnswers: Answer[] = form!.questions.map(q => ({
      questionId: q.questionId,
      questionText: q.questionText,
      answerText: Array.isArray(responses[q.questionId])
        ? responses[q.questionId].join(", ")
        : String(responses[q.questionId] || "")
    }))

    setSubmitting(true)
    try {
      await api.post(`/api/f/${token}/submit`, {
        ...personalInfo,
        sessionId: sessionIdRef.current,
        answers: preparedAnswers
      })
      setIsSubmitted(true)
      window.scrollTo(0, 0)
    } catch {
      setSubmitError("We couldn't submit your response. Check your connection and try again.")
    } finally {
      setSubmitting(false)
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
          <p className="text-xs text-slate-500">Built with FormAI</p>
        </div>
      </div>
    )
  }

  if (!form) return null

  const theme = form.theme || {}
  const accent = theme.accent || "#4f46e5"
  const isLight = theme.mode === "light"
  const rootClass = isLight ? "bg-white text-slate-900" : "bg-slate-950 text-white"
  const titleClass = isLight ? "text-slate-900" : "text-white"
  const descClass = isLight ? "text-slate-600" : "text-slate-400"

  return (
    <div
      className={`min-h-screen ${rootClass} py-12 px-6`}
      style={{ ["--form-accent" as any]: accent }}
    >
      <div className="max-w-2xl mx-auto space-y-8">
        {theme.coverImageUrl && (
          <img
            src={theme.coverImageUrl}
            alt=""
            className="h-40 w-full rounded-xl object-cover"
          />
        )}
        {theme.logoUrl && (
          <img src={theme.logoUrl} alt="Logo" className="h-12 w-auto" />
        )}
        <div className="space-y-2 mb-12">
          <h1 className={`text-4xl font-extrabold text-balance ${titleClass}`}>
            {form.title}
          </h1>
          {form.description && <p className={`${descClass} text-lg leading-relaxed`}>{form.description}</p>}
        </div>

        <form onSubmit={handleSubmit} className="space-y-12">
          {/* Personal Info Section */}
          {(form.collectFullName || form.collectEmail || form.collectPhone || form.collectAge || form.collectDateOfBirth || form.collectGender) && (
            <Card className="p-8 bg-slate-900 border-slate-800 space-y-6">
              <h2 className="text-xl font-bold text-indigo-400 mb-2">Participant Information</h2>
              
              {form.collectFullName && (
                <div className="space-y-2">
                  <Label htmlFor="pi-name">Full Name</Label>
                  <Input 
                    id="pi-name"
                    required 
                    onChange={(e) => setPersonalInfo(p => ({...p, respondentName: e.target.value}))}
                    className="bg-slate-950 border-slate-800"
                  />
                </div>
              )}
              {form.collectEmail && (
                <div className="space-y-2">
                  <Label htmlFor="pi-email">Email Address</Label>
                  <Input 
                    id="pi-email"
                    type="email" 
                    required 
                    onChange={(e) => setPersonalInfo(p => ({...p, respondentEmail: e.target.value}))}
                    className="bg-slate-950 border-slate-800"
                  />
                </div>
              )}
              {form.collectPhone && (
                <div className="space-y-2">
                  <Label htmlFor="pi-phone">Phone Number</Label>
                  <Input
                    id="pi-phone"
                    type="tel"
                    required
                    onChange={(e) => setPersonalInfo(p => ({...p, respondentPhone: e.target.value}))}
                    className="bg-slate-950 border-slate-800"
                  />
                </div>
              )}
              {form.collectAge && (
                <div className="space-y-2">
                  <Label htmlFor="pi-age">Age</Label>
                  <Input
                    id="pi-age"
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
                  <Label htmlFor="pi-dob">Date of Birth</Label>
                  <Input
                    id="pi-dob"
                    type="date"
                    required
                    onChange={(e) => setPersonalInfo(p => ({...p, respondentDOB: e.target.value}))}
                    className="bg-slate-950 border-slate-800"
                  />
                </div>
              )}
              {form.collectGender && (
                <div className="space-y-2">
                  <Label htmlFor="pi-gender">Gender</Label>
                  <Input
                    id="pi-gender"
                    required
                    onChange={(e) => setPersonalInfo(p => ({...p, respondentGender: e.target.value}))}
                    className="bg-slate-950 border-slate-800"
                  />
                </div>
              )}
            </Card>
          )}

          {/* Questions Section */}
          {[...form.questions].sort((a, b) => a.orderIndex - b.orderIndex).map((q) => (
            <div key={q.questionId} id={`q-${q.questionId}`} className="space-y-4 scroll-mt-24">
              <Label className="text-lg font-semibold flex items-start gap-1">
                {q.questionText}
                {q.isRequired && <span className="text-red-400 font-bold" aria-hidden="true">*</span>}
              </Label>
              <FormRenderer
                question={q}
                value={responses[q.questionId] || ""}
                onChange={(val) => handleAnswerChange(q.questionId, val)}
              />
              {errors[q.questionId] && (
                <p role="alert" className="flex items-center gap-1.5 text-sm text-red-400">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {errors[q.questionId]}
                </p>
              )}
            </div>
          ))}

          <div className="space-y-3">
            {submitError && (
              <p role="alert" className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {submitError}
              </p>
            )}
            <Button
              type="submit"
              disabled={submitting}
              style={{ backgroundColor: "var(--form-accent)" }}
              className="w-full h-14 text-lg transition-all font-bold text-white hover:brightness-110"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Submitting…
                </>
              ) : (
                "Submit Response"
              )}
            </Button>
          </div>
        </form>

        <p className="text-center text-slate-500 text-xs mt-12">
          Never submit passwords through FormAI. Created with FormAI.
        </p>
      </div>
    </div>
  )
}
