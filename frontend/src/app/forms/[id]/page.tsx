"use client"

import { Sidebar } from "@/components/Sidebar"
import { FormEditor } from "@/components/FormEditor"
import { FieldSelector } from "@/components/FieldSelector"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useState, useEffect } from "react"
import { Form, Question } from "@/types"
import { ArrowLeft, Save, Copy, Check } from "lucide-react"
import { useRouter, useParams } from "next/navigation"
import api from "@/lib/api"
import { useAuth } from "@clerk/nextjs"
import { Skeleton } from "@/components/ui/skeleton"

export default function EditFormPage() {
  const router = useRouter()
  const { id } = useParams()
  const { getToken } = useAuth()
  const [form, setForm] = useState<Form | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const fetchForm = async () => {
      try {
        const token = await getToken()
        const res = await api.get(`/api/forms/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        setForm(res.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchForm()
  }, [id])

  const handleSave = async () => {
    if (!form) return
    setSaving(true)
    try {
      const token = await getToken()
      await api.patch(`/api/forms/${id}`, form, {
        headers: { Authorization: `Bearer ${token}` },
      })
      alert("Form saved successfully!")
    } catch (err) {
      console.error(err)
      alert("Failed to save form")
    } finally {
      setSaving(false)
    }
  }

  const handleFieldChange = (field: string, value: boolean) => {
    setForm((prev) => ({ ...prev!, [field]: value }))
  }

  const handleCopyLink = () => {
    if (!form) return
    const link = `${window.location.origin}/f/${form.shareToken}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-slate-950 text-white">
        <Sidebar />
        <main className="flex-1 p-8 space-y-6">
          <Skeleton className="h-12 w-1/3 bg-slate-900" />
          <Skeleton className="h-6 w-1/2 bg-slate-900" />
          <Skeleton className="h-40 w-full bg-slate-900" />
          <Skeleton className="h-40 w-full bg-slate-900" />
        </main>
      </div>
    )
  }

  if (!form) {
    return (
      <div className="flex h-screen bg-slate-950 text-white items-center justify-center">
        <p>Form not found.</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-8 py-4 bg-slate-950/80 backdrop-blur-md border-b border-slate-900">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
              <ArrowLeft size={20} />
            </Button>
            <h1 className="text-xl font-bold">Edit Form</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="border-slate-800" onClick={handleCopyLink}>
              {copied ? <Check size={16} className="mr-2 text-green-400" /> : <Copy size={16} className="mr-2" />}
              {copied ? "Copied!" : "Copy Link"}
            </Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 border-0" onClick={handleSave} disabled={saving}>
              <Save size={16} className="mr-2" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>

        <div className="p-8 max-w-4xl mx-auto w-full space-y-12">
          {/* Title & Description */}
          <div className="space-y-4">
            <Input
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev!, title: e.target.value }))}
              className="text-4xl font-extrabold bg-transparent border-0 border-b border-slate-900 rounded-none h-auto py-2 px-0 focus-visible:ring-0 focus-visible:border-indigo-600 transition-colors"
              placeholder="Form Title"
            />
            <Textarea
              value={form.description || ""}
              onChange={(e) => setForm((prev) => ({ ...prev!, description: e.target.value }))}
              className="text-slate-400 bg-transparent border-0 focus-visible:ring-0 resize-none min-h-0 h-auto py-0 px-0"
              placeholder="Add a description..."
            />
          </div>

          {/* Questions with Drag & Drop */}
          <FormEditor
            questions={form.questions}
            onChange={(questions) => setForm((prev) => ({ ...prev!, questions }))}
          />

          {/* Field selector */}
          <FieldSelector
            config={{
              collectFullName: !!form.collectFullName,
              collectEmail: !!form.collectEmail,
              collectPhone: !!form.collectPhone,
              collectAge: !!form.collectAge,
              collectDateOfBirth: !!form.collectDateOfBirth,
              collectGender: !!form.collectGender,
            }}
            onChange={handleFieldChange}
          />
        </div>
      </main>
    </div>
  )
}
