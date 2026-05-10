"use client"

import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { User, Mail, Phone, Calendar, UserCircle, Hash } from "lucide-react"

interface FieldSelectorProps {
  config: {
    collectFullName: boolean
    collectEmail: boolean
    collectPhone: boolean
    collectAge: boolean
    collectDateOfBirth: boolean
    collectGender: boolean
  }
  onChange: (field: string, value: boolean) => void
}

const FIELDS = [
  { id: "collectFullName", label: "Full Name", icon: <User className="h-4 w-4" /> },
  { id: "collectEmail", label: "Email Address", icon: <Mail className="h-4 w-4" /> },
  { id: "collectPhone", label: "Phone Number", icon: <Phone className="h-4 w-4" /> },
  { id: "collectAge", label: "Age", icon: <Hash className="h-4 w-4" /> },
  { id: "collectDateOfBirth", label: "Date of Birth", icon: <Calendar className="h-4 w-4" /> },
  { id: "collectGender", label: "Gender", icon: <UserCircle className="h-4 w-4" /> },
]

export function FieldSelector({ config, onChange }: FieldSelectorProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-xl font-bold">Personal Information</h3>
        <p className="text-sm text-slate-500">Enable fields you want to collect from every respondent automatically.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {FIELDS.map((field) => (
          <Card 
            key={field.id} 
            className="flex items-center justify-between p-4 bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950 border border-slate-800 text-indigo-400">
                {field.icon}
              </div>
              <Label htmlFor={field.id} className="font-medium cursor-pointer">{field.label}</Label>
            </div>
            <Switch 
              id={field.id} 
              checked={(config as any)[field.id]} 
              onCheckedChange={(val: boolean) => onChange(field.id, val)}
              className="data-checked:bg-indigo-600"
            />
          </Card>
        ))}
      </div>
    </div>
  )
}
