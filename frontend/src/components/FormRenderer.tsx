"use client"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Question } from "@/types"
import { Button } from "@/components/ui/button"
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^[+]?[\d\s()-]{7,}$/

export function validateAnswer(question: Question, value: any): string | null {
  const v = question.validation
  const isEmpty =
    value === undefined ||
    value === null ||
    (Array.isArray(value) ? value.length === 0 : String(value).trim() === "")
  if (isEmpty) return null

  const str = Array.isArray(value) ? value.join(", ") : String(value)

  if (question.questionType === "email" || v?.format === "email") {
    if (!EMAIL_RE.test(str)) return "Enter a valid email address."
  }
  if (question.questionType === "phone" || v?.format === "phone") {
    if (!PHONE_RE.test(str)) return "Enter a valid phone number."
  }

  if (!v) return null

  if (v.minLength != null && str.length < v.minLength) {
    return `Must be at least ${v.minLength} characters.`
  }
  if (v.maxLength != null && str.length > v.maxLength) {
    return `Must be at most ${v.maxLength} characters.`
  }

  if (v.min != null || v.max != null) {
    const num = Number(str)
    if (Number.isNaN(num)) return "Enter a valid number."
    if (v.min != null && num < v.min) return `Must be at least ${v.min}.`
    if (v.max != null && num > v.max) return `Must be at most ${v.max}.`
  }

  if (v.pattern) {
    try {
      if (!new RegExp(v.pattern).test(str)) {
        return v.patternMessage || "This answer is not in the expected format."
      }
    } catch {
    }
  }

  return null
}

interface FormRendererProps {
  question: Question
  value: any
  onChange: (value: any) => void
}

export function FormRenderer({ question, value, onChange }: FormRendererProps) {
  switch (question.questionType) {
    case "short_answer":
      return <Input value={value} onChange={(e) => onChange(e.target.value)} className="bg-white/5 border-slate-700" />
    
    case "long_answer":
      return <Textarea value={value} onChange={(e) => onChange(e.target.value)} className="bg-white/5 border-slate-700" />

    case "multiple_choice":
      return (
        <RadioGroup value={value} onValueChange={onChange}>
          {question.options?.map((opt, i) => (
            <div key={i} className="flex items-center space-x-2">
              <RadioGroupItem value={opt} id={`${question.questionId}-${i}`} />
              <Label htmlFor={`${question.questionId}-${i}`}>{opt}</Label>
            </div>
          ))}
        </RadioGroup>
      )

    case "checkbox":
      const currentChecks = Array.isArray(value) ? value : []
      const toggleCheck = (opt: string) => {
        if (currentChecks.includes(opt)) {
          onChange(currentChecks.filter(c => c !== opt))
        } else {
          onChange([...currentChecks, opt])
        }
      }
      return (
        <div className="space-y-2">
          {question.options?.map((opt, i) => (
            <div key={i} className="flex items-center space-x-2">
              <Checkbox id={`${question.questionId}-${i}`} checked={currentChecks.includes(opt)} onCheckedChange={() => toggleCheck(opt)} />
              <Label htmlFor={`${question.questionId}-${i}`}>{opt}</Label>
            </div>
          ))}
        </div>
      )

    case "dropdown":
      return (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="bg-white/5 border-slate-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-800 text-white">
            {question.options?.map((opt, i) => (
              <SelectItem key={i} value={opt} className="focus:bg-slate-800 focus:text-white pointer-events-auto">{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )

    case "rating":
      return (
        <div className="flex gap-2" role="radiogroup" aria-label={question.questionText}>
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={s === (value || 0)}
              aria-label={`${s} star${s === 1 ? "" : "s"}`}
              onClick={() => onChange(s)}
              className="rounded-md p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <Star
                className={cn(
                  "h-8 w-8 transition-colors",
                  s <= (value || 0) ? "fill-yellow-400 text-yellow-400" : "text-slate-600 hover:text-slate-400"
                )}
                aria-hidden="true"
              />
            </button>
          ))}
        </div>
      )

    case "date":
      return <Input type="date" value={value} onChange={(e) => onChange(e.target.value)} className="bg-white/5 border-slate-700 inv-color-scheme" />

    case "linear_scale": {
      const opts = question.options || []
      const min = Number(opts[0]) || 1
      const max = Number(opts[1]) || 10
      const current = value === "" || value == null ? min : Number(value)
      return (
        <div className="space-y-3">
          <input
            type="range"
            min={min}
            max={max}
            step={1}
            value={current}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full accent-indigo-600"
            aria-label={question.questionText}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={current}
          />
          <div className="flex items-center justify-between text-sm text-slate-400">
            <span>{min}</span>
            <span className="rounded-md bg-indigo-600/20 px-3 py-1 font-semibold text-indigo-300">
              {current}
            </span>
            <span>{max}</span>
          </div>
        </div>
      )
    }

    case "time":
      return <Input type="time" value={value} onChange={(e) => onChange(e.target.value)} className="bg-white/5 border-slate-700 inv-color-scheme" />

    case "file_upload":
      return (
        <div className="space-y-2">
          <Input
            type="file"
            onChange={(e) => onChange(e.target.files?.[0]?.name || "")}
            className="bg-white/5 border-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-600 file:px-3 file:py-1 file:text-white"
            aria-label={question.questionText}
          />
          {value && <p className="text-xs text-slate-500">Selected: {value}</p>}
          <p className="text-xs text-slate-600">
            File name is recorded with your response. Do not upload sensitive documents.
          </p>
        </div>
      )

    case "number":
      return <Input type="number" value={value} onChange={(e) => onChange(e.target.value)} className="bg-white/5 border-slate-700" />

    case "email":
      return <Input type="email" value={value} onChange={(e) => onChange(e.target.value)} className="bg-white/5 border-slate-700" />

    case "phone":
      return <Input type="tel" value={value} onChange={(e) => onChange(e.target.value)} className="bg-white/5 border-slate-700" />

    case "yes_no":
      return (
        <div className="flex gap-4">
          <Button
            type="button"
            variant={value === "yes" ? "default" : "outline"}
            className={value === "yes" ? "bg-indigo-600 grow border-0" : "grow border-slate-700 bg-transparent"}
            onClick={() => onChange("yes")}
          >Yes</Button>
          <Button
            type="button"
            variant={value === "no" ? "default" : "outline"}
            className={value === "no" ? "bg-indigo-600 grow border-0" : "grow border-slate-700 bg-transparent"}
            onClick={() => onChange("no")}
          >No</Button>
        </div>
      )

    default:
      return <Input value={value} onChange={(e) => onChange(e.target.value)} className="bg-white/5 border-slate-700" />
  }
}
