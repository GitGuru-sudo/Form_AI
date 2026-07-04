"use client"

import { Sidebar } from "@/components/Sidebar"
import { FormEditor } from "@/components/FormEditor"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useState, useEffect, useRef, useCallback } from "react"
import { Form } from "@/types"
import { ArrowLeft, Save, Copy, Check, Download, Loader2, Cloud, CloudOff, Bell, Palette, Undo2, Redo2 } from "lucide-react"
import { useHistoryState } from "@/hooks/useHistoryState"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { useRouter, useParams } from "next/navigation"
import api from "@/lib/api"
import { useAuth } from "@clerk/nextjs"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/toast"

export default function EditFormPage() {
  const router = useRouter()
  const { id } = useParams()
  const { getToken } = useAuth()
  const { toast } = useToast()
  const {
    state: form,
    set: setFormHistory,
    reset: resetForm,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useHistoryState<Form | null>(null)

  const setForm = useCallback(
    (next: Form | null | ((prev: Form | null) => Form | null)) => {
      setFormHistory(next as any)
    },
    [setFormHistory]
  )

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [autosaveState, setAutosaveState] = useState<"idle" | "saving" | "saved" | "error">("idle")

  const skipNextAutosave = useRef(true)
  const debouncedForm = useDebouncedValue(form, 1500)

  useEffect(() => {
    const fetchForm = async () => {
      try {
        const token = await getToken()
        const res = await api.get(`/api/forms/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        resetForm(res.data)
        skipNextAutosave.current = true
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchForm()
  }, [id, resetForm])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const tag = target?.tagName
      const isTextField =
        tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable
      if (isTextField) return
      const mod = e.ctrlKey || e.metaKey
      if (!mod) return
      const key = e.key.toLowerCase()
      if (key === "z" && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if ((key === "z" && e.shiftKey) || key === "y") {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [undo, redo])

  const handleSave = async () => {
    if (!form) return
    setSaving(true)
    try {
      const token = await getToken()
      await api.patch(`/api/forms/${id}`, form, {
        headers: { Authorization: `Bearer ${token}` },
      })
      toast.success("Changes saved")
    } catch (err) {
      console.error(err)
      toast.error("Couldn't save changes", { description: "Please try again." })
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (!debouncedForm) return
    if (skipNextAutosave.current) {
      skipNextAutosave.current = false
      return
    }
    let cancelled = false
    const save = async () => {
      setAutosaveState("saving")
      try {
        const token = await getToken()
        await api.patch(`/api/forms/${id}`, debouncedForm, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!cancelled) setAutosaveState("saved")
      } catch (err) {
        console.error("Autosave failed", err)
        if (!cancelled) setAutosaveState("error")
      }
    }
    save()
    return () => {
      cancelled = true
    }
  }, [debouncedForm, id, getToken])

  const handleDownload = async () => {
    if (!form) return
    setDownloading(true)
    try {
      const token = await getToken()
      const response = await api.get(`/api/forms/${id}/responses/export`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement("a")
      link.href = url
      link.setAttribute(
        "download",
        `responses-${form.title?.replace(/\s+/g, "-").toLowerCase() || id}.xlsx`
      )
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error("Download failed", err)
      toast.error("Couldn't download responses", { description: "Please try again." })
    } finally {
      setDownloading(false)
    }
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
        <main id="main-content" className="flex-1 p-8 space-y-6">
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
      <div className="flex h-screen bg-slate-950 text-white">
        <Sidebar />
        <main id="main-content" className="flex flex-1 items-center justify-center p-6">
          <div className="max-w-md space-y-4 text-center">
            <h1 className="text-2xl font-bold">Form not found</h1>
            <p className="text-slate-400">
              This form may have been deleted, or you don&apos;t have access to it.
            </p>
            <Button className="bg-indigo-600 hover:bg-indigo-700 border-0" onClick={() => router.push("/dashboard")}>
              Back to workspace
            </Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
      <Sidebar />
      <main id="main-content" className="flex flex-1 flex-col overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-8 py-4 bg-slate-950/80 backdrop-blur-md border-b border-slate-900">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")} aria-label="Go back">
              <ArrowLeft size={20} aria-hidden="true" />
            </Button>
            <h1 className="text-xl font-bold">Edit Form</h1>
          </div>
          <div className="flex items-center gap-3">
            {autosaveState !== "idle" && (
              <span
                className="flex items-center gap-1.5 text-xs text-slate-400"
                role="status"
                aria-live="polite"
              >
                {autosaveState === "saving" && (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    Saving…
                  </>
                )}
                {autosaveState === "saved" && (
                  <>
                    <Cloud size={13} className="text-green-400" />
                    Saved
                  </>
                )}
                {autosaveState === "error" && (
                  <>
                    <CloudOff size={13} className="text-red-400" />
                    Couldn&apos;t save
                  </>
                )}
              </span>
            )}
            <div className="flex items-center gap-1 mr-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={undo}
                disabled={!canUndo}
                aria-label="Undo"
                title="Undo (Ctrl+Z)"
                className="text-slate-400 hover:text-white disabled:opacity-30"
              >
                <Undo2 size={18} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={redo}
                disabled={!canRedo}
                aria-label="Redo"
                title="Redo (Ctrl+Shift+Z)"
                className="text-slate-400 hover:text-white disabled:opacity-30"
              >
                <Redo2 size={18} />
              </Button>
            </div>
            <Button
              variant="outline"
              className="border-slate-800 hover:border-slate-700 hover:bg-slate-900"
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? (
                <Loader2 size={16} className="mr-2 animate-spin" />
              ) : (
                <Download size={16} className="mr-2" />
              )}
              {downloading ? "Preparing…" : "Download Response"}
            </Button>
            <Button variant="outline" className="border-slate-800 hover:border-slate-700 hover:bg-slate-900" onClick={handleCopyLink}>
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

          {/* Email notifications */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <Bell className="h-5 w-5 text-indigo-400 mt-0.5" />
                <div>
                  <h3 className="font-semibold">Email me on new responses</h3>
                  <p className="text-sm text-slate-400">Get an email each time someone submits this form.</p>
                </div>
              </div>
              <Switch
                checked={!!form.notifyOnResponse}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev!, notifyOnResponse: checked }))}
              />
            </div>
            {form.notifyOnResponse && (
              <div className="space-y-2 pl-8">
                <Label htmlFor="notify-email" className="text-slate-300">Send notifications to</Label>
                <Input
                  id="notify-email"
                  type="email"
                  value={form.notifyEmail || ""}
                  onChange={(e) => setForm((prev) => ({ ...prev!, notifyEmail: e.target.value }))}
                  placeholder="you@example.com"
                  className="bg-slate-950 border-slate-800 max-w-sm"
                />
              </div>
            )}
          </div>

          {/* Theming panel */}
          <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/40 p-6">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
              <Palette size={15} className="text-indigo-400" />
              Branding & Theme
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Accent color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.theme?.accent || "#4f46e5"}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev!, theme: { ...prev!.theme, accent: e.target.value } }))
                    }
                    className="h-9 w-12 cursor-pointer rounded border border-slate-800 bg-slate-950 p-0.5"
                    aria-label="Accent color"
                  />
                  <Input
                    value={form.theme?.accent || ""}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev!, theme: { ...prev!.theme, accent: e.target.value } }))
                    }
                    placeholder="#4f46e5"
                    className="bg-slate-950 border-slate-800 font-mono text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Mode</Label>
                <select
                  value={form.theme?.mode || "dark"}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev!, theme: { ...prev!.theme, mode: e.target.value as "light" | "dark" } }))
                  }
                  className="h-9 w-full rounded-md border border-slate-800 bg-slate-950 px-3 text-sm"
                >
                  <option value="dark">Dark (default)</option>
                  <option value="light">Light</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Cover image URL</Label>
                <Input
                  value={form.theme?.coverImageUrl || ""}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev!, theme: { ...prev!.theme, coverImageUrl: e.target.value } }))
                  }
                  placeholder="https://…/cover.jpg"
                  className="bg-slate-950 border-slate-800 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Logo URL</Label>
                <Input
                  value={form.theme?.logoUrl || ""}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev!, theme: { ...prev!.theme, logoUrl: e.target.value } }))
                  }
                  placeholder="https://…/logo.png"
                  className="bg-slate-950 border-slate-800 text-sm"
                />
              </div>
            </div>
          </div>


          {/* Questions with Drag & Drop */}
          <FormEditor
            questions={form.questions}
            onChange={(questions) => setForm((prev) => ({ ...prev!, questions }))}
          />
        </div>
      </main>
    </div>
  )
}
