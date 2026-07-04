"use client"

import { Sidebar } from "@/components/Sidebar"
import { FormCard } from "@/components/FormCard"
import { useState, useEffect, useCallback } from "react"
import { Form } from "@/types"
import api from "@/lib/api"
import { useAuth } from "@clerk/nextjs"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/components/ui/toast"
import { useConfirm } from "@/components/ui/confirm"

export default function FormsPage() {
  const { getToken } = useAuth()
  const { toast } = useToast()
  const confirm = useConfirm()
  const [forms, setForms] = useState<Form[]>([])
  const [loading, setLoading] = useState(true)

  const fetchForms = async () => {
    try {
      const token = await getToken()
      const res = await api.get("/api/forms", {
        headers: { Authorization: `Bearer ${token}` }
      })
      setForms(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchForms()
  }, [])

  const handleToggle = async (id: string) => {
    const form = forms.find(f => f._id === id)
    try {
      const token = await getToken()
      await api.patch(`/api/forms/${id}/toggle`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success(form?.isActive ? "Form closed" : "Form reopened")
      fetchForms()
    } catch (err) {
      console.error(err)
      toast.error("Couldn't update the form", { description: "Please try again." })
    }
  }

  const handleDuplicate = useCallback(async (id: string) => {
    try {
      const token = await getToken()
      const res = await api.post(`/api/forms/${id}/duplicate`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setForms((prev) => [res.data, ...prev])
      toast.success("Form duplicated")
    } catch (err) {
      console.error(err)
      toast.error("Couldn't duplicate form", { description: "Please try again." })
    }
  }, [getToken, toast])

  const handleDelete = async (id: string) => {
    const form = forms.find(f => f._id === id)
    const ok = await confirm({
      title: form ? `Delete "${form.title}"?` : "Delete this form?",
      description: "This permanently removes the form and all of its responses. This can't be undone.",
      confirmLabel: "Delete form",
      destructive: true,
    })
    if (!ok) return
    try {
      const token = await getToken()
      await api.delete(`/api/forms/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success("Form deleted")
      fetchForms()
    } catch (err) {
      console.error(err)
      toast.error("Couldn't delete form", { description: "Please try again." })
    }
  }

  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
      <Sidebar />
      <main id="main-content" className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold">All Forms</h1>
              <p className="text-slate-400">Manage your AI-generated forms and view responses.</p>
            </div>
            <Link href="/dashboard">
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="mr-2 h-4 w-4" /> New Form
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-[200px] w-full bg-slate-900 rounded-xl" />
              ))}
            </div>
          ) : forms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="h-24 w-24 rounded-full bg-slate-900 flex items-center justify-center mb-6 border border-slate-800">
                <Plus className="h-10 w-10 text-slate-700" />
              </div>
              <h2 className="text-2xl font-bold mb-2">You haven&apos;t created any forms yet</h2>
              <p className="text-slate-400 mb-8 max-w-md">Start from the dashboard workspace to create your first AI-generated form.</p>
              <Link href="/dashboard">
                <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700">
                  Go to AI Workspace
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {forms.map(form => (
                <FormCard 
                  key={form._id} 
                  form={form} 
                  responseCount={form.responseCount || 0}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  onDuplicate={handleDuplicate}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}