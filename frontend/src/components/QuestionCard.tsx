"use client"

import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Trash2, GripVertical, Plus } from "lucide-react"
import { Question, QuestionType } from "@/types"

interface QuestionCardProps {
  question: Question
  onUpdate: (id: string, updates: Partial<Question>) => void
  onDelete: (id: string) => void
}

const QUESTION_TYPES: { value: QuestionType, label: string }[] = [
  { value: "short_answer", label: "Short Answer" },
  { value: "long_answer", label: "Long Answer" },
  { value: "multiple_choice", label: "Multiple Choice" },
  { value: "checkbox", label: "Checkbox" },
  { value: "dropdown", label: "Dropdown" },
  { value: "rating", label: "Rating (Stars)" },
  { value: "linear_scale", label: "Linear Scale (Slider)" },
  { value: "date", label: "Date" },
  { value: "time", label: "Time" },
  { value: "number", label: "Number" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "yes_no", label: "Yes/No Buttons" },
  { value: "file_upload", label: "File Upload" },
]

export function QuestionCard({ question, onUpdate, onDelete }: QuestionCardProps) {
  const handleTypeChange = (value: string | null) => {
    if (value) {
      onUpdate(question.questionId, { questionType: value as QuestionType })
    }
  }

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...(question.options || [])]
    newOptions[index] = value
    onUpdate(question.questionId, { options: newOptions })
  }

  const addOption = () => {
    onUpdate(question.questionId, { options: [...(question.options || []), `Option ${(question.options?.length || 0) + 1}`] })
  }

  const removeOption = (index: number) => {
    const newOptions = (question.options || []).filter((_, i) => i !== index)
    onUpdate(question.questionId, { options: newOptions })
  }

  const showOptions = ["multiple_choice", "checkbox", "dropdown"].includes(question.questionType)

  return (
    <Card className="p-6 bg-slate-900 border-slate-800 shadow-lg relative group">
      <div className="absolute left-2 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing text-slate-700 hover:text-slate-500 hidden md:block">
        <GripVertical size={20} />
      </div>

      <div className="flex flex-col gap-4 md:pl-4">
        <div className="flex flex-col md:flex-row gap-4 items-start">
          <Input 
            value={question.questionText} 
            onChange={(e) => onUpdate(question.questionId, { questionText: e.target.value })}
            placeholder="Question Text"
            className="flex-1 bg-slate-950 border-slate-800 text-lg font-medium"
          />
          <Select value={question.questionType} onValueChange={handleTypeChange}>
            <SelectTrigger className="w-full md:w-[200px] bg-slate-950 border-slate-800 transition-all">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800 text-white">
              {QUESTION_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value} className="focus:bg-slate-800 focus:text-white pointer-events-auto">
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {showOptions && (
          <div className="space-y-3 mt-2 pl-2">
            <Label className="text-xs text-slate-500 uppercase tracking-wider">Options</Label>
            {question.options?.map((option, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <div className="h-2 w-2 rounded-full border border-slate-700" />
                <Input 
                  value={option} 
                  onChange={(e) => handleOptionChange(idx, e.target.value)}
                  className="bg-transparent border-b border-t-0 border-r-0 border-l-0 border-slate-800 focus-visible:ring-0 rounded-none h-8 px-0"
                />
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:text-red-400" onClick={() => removeOption(idx)}>
                  <Trash2 size={14} />
                </Button>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="text-indigo-400 hover:text-indigo-300 hover:bg-slate-800/50 -ml-2" onClick={addOption}>
              <Plus size={14} className="mr-1" />
              Add Option
            </Button>
          </div>
        )}

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-800/50">
          <Button variant="ghost" size="icon" className="text-slate-600 hover:text-red-400" onClick={() => onDelete(question.questionId)}>
            <Trash2 size={18} />
          </Button>
          <div className="flex items-center space-x-2">
            <Label htmlFor={`required-${question.questionId}`} className="text-slate-400 text-sm">Required</Label>
            <Switch 
              id={`required-${question.questionId}`} 
              checked={question.isRequired} 
              onCheckedChange={(checked: boolean) => onUpdate(question.questionId, { isRequired: checked })}
              className="data-[state=checked]:bg-indigo-600"
            />
          </div>
        </div>
      </div>
    </Card>
  )
}
