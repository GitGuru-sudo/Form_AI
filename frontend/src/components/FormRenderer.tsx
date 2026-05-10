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
import { useState } from "react"
import { cn } from "@/lib/utils"

interface FormRendererProps {
  question: Question
  value: any
  onChange: (value: any) => void
}

export function FormRenderer({ question, value, onChange }: FormRendererProps) {
  const [rating, setRating] = useState(0)

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
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star 
              key={s} 
              className={cn("h-8 w-8 cursor-pointer transition-colors", s <= (value || 0) ? "fill-yellow-400 text-yellow-400" : "text-slate-600")} 
              onClick={() => onChange(s)}
            />
          ))}
        </div>
      )

    case "date":
      return <Input type="date" value={value} onChange={(e) => onChange(e.target.value)} className="bg-white/5 border-slate-700 inv-color-scheme" />

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
            variant={value === "yes" ? "default" : "outline"}
            className={value === "yes" ? "bg-indigo-600 grow border-0" : "grow border-slate-700 bg-transparent"}
            onClick={() => onChange("yes")}
          >Yes</Button>
          <Button 
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
