"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Form } from "@/types"
import { MessageSquare, Edit2, Play, Square, Trash2, Copy } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"

interface FormCardProps {
  form: Form
  responseCount: number
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
}

export function FormCard({ form, responseCount, onToggle, onDelete, onDuplicate }: FormCardProps) {
  return (
    <Card className="group overflow-hidden bg-slate-900 border-slate-800 hover:border-slate-700 transition-all shadow-xl hover:shadow-indigo-500/10">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <Badge variant={form.isActive ? "default" : "secondary"} className={form.isActive ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}>
            {form.isActive ? "Active" : "Closed"}
          </Badge>
          <div className="flex gap-2">
            <Link href={`/forms/${form._id}`}>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white" aria-label="Edit form">
                <Edit2 size={16} aria-hidden="true" />
              </Button>
            </Link>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-400" onClick={() => onDuplicate(form._id!)} aria-label="Duplicate form">
              <Copy size={16} />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-400" onClick={() => onDelete(form._id!)} aria-label="Delete form">
              <Trash2 size={16} aria-hidden="true" />
            </Button>
          </div>
        </div>

        <h3 className="text-xl font-bold mb-1 truncate group-hover:text-indigo-400 transition-colors">{form.title}</h3>
        <p className="text-slate-500 text-sm mb-6 line-clamp-2 min-h-[40px]">{form.description || "No description provided."}</p>

        <div className="flex items-center justify-between text-sm text-slate-400">
          <div className="flex items-center gap-1.5">
            <MessageSquare size={16} className="text-indigo-400" />
            <span className="font-medium text-slate-200">{responseCount}</span>
            <span>responses</span>
          </div>
          <span>{form.createdAt ? format(new Date(form.createdAt), 'MMM d, yyyy') : ''}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 border-t border-slate-800">
        <Link href={`/forms/${form._id}/responses`} className="w-full">
          <Button variant="ghost" className="w-full rounded-none h-12 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-white hover:bg-slate-800">
            View Responses
          </Button>
        </Link>
        <Button 
          variant="ghost" 
          onClick={() => onToggle(form._id!)}
          className="w-full rounded-none h-12 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-white hover:bg-slate-800 border-l border-slate-800"
        >
          {form.isActive ? (
            <>
              <Square size={14} className="mr-2" /> Stop Form
            </>
          ) : (
            <>
              <Play size={14} className="mr-2" /> Reopen
            </>
          )}
        </Button>
      </div>
    </Card>
  )
}
