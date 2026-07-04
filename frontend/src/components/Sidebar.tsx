"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { UserButton, useUser, useClerk, useAuth } from "@clerk/nextjs"
import { Plus, LayoutDashboard, History, Menu, LogOut, Trash2, Loader2, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import api from "@/lib/api"
import { Form } from "@/types"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useToast } from "@/components/ui/toast"
import { useConfirm } from "@/components/ui/confirm"

export function Sidebar() {
  const pathname = usePathname()
  const { user } = useUser()
  const { signOut } = useClerk()
  const { getToken } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const confirm = useConfirm()
  const [recentForms, setRecentForms] = useState<Form[]>([])
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      getToken().then(token => {
        if (token) {
          return api.get("/api/forms", {
            headers: { Authorization: `Bearer ${token}` }
          });
        }
        throw new Error('No token');
      }).then((res) => {
        setRecentForms(res.data.slice(0, 5))
      }).catch(err => console.error('Failed to fetch forms:', err))
    }
  }, [user, getToken])

  const handleDelete = async (e: React.MouseEvent, form: Form) => {
    // Stop the click from bubbling up to the wrapping form link.
    e.preventDefault()
    e.stopPropagation()
    const formId = form._id
    if (deletingId || !formId) return
    const ok = await confirm({
      title: `Delete "${form.title}"?`,
      description: "This permanently removes the form and all of its responses. This can't be undone.",
      confirmLabel: "Delete form",
      destructive: true,
    })
    if (!ok) return
    setDeletingId(formId)

    // Optimistic: drop it from the list immediately, remember where it was so we
    // can splice it back at the same position if the request fails.
    const prevForms = recentForms
    const removedIndex = recentForms.findIndex(f => f._id === formId)
    setRecentForms(prev => prev.filter(f => f._id !== formId))

    try {
      const token = await getToken()
      await api.delete(`/api/forms/${formId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      toast.success("Form deleted")
      // If we're currently viewing the deleted form, bounce back to the workspace.
      if (pathname.includes(formId)) {
        router.push("/dashboard")
      }
    } catch (err) {
      // Roll back to the exact previous list on failure.
      setRecentForms(prev => {
        if (prev.some(f => f._id === formId)) return prev
        const restored = [...prev]
        const at = removedIndex >= 0 ? removedIndex : restored.length
        restored.splice(at, 0, prevForms[removedIndex])
        return restored
      })
      const message =
        (err as { userMessage?: string }).userMessage ?? "Please try again."
      toast.error("Couldn't delete form", { description: message })
    } finally {
      setDeletingId(null)
    }
  }

  const handleDuplicate = async (e: React.MouseEvent, form: Form) => {
    e.preventDefault()
    e.stopPropagation()
    const formId = form._id
    if (!formId) return
    try {
      const token = await getToken()
      const res = await api.post(`/api/forms/${formId}/duplicate`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setRecentForms(prev => [res.data, ...prev].slice(0, 5))
      toast.success("Form duplicated")
    } catch (err) {
      console.error("Failed to duplicate form:", err)
      toast.error("Couldn't duplicate form", { description: "Please try again." })
    }
  }

  const NavItems = () => (
    <div className="flex flex-col gap-2 px-2">
      <Link href="/dashboard">
        <Button
          variant="ghost"
          aria-current={pathname === "/dashboard" ? "page" : undefined}
          className={cn(
            "w-full justify-start gap-2",
            pathname === "/dashboard" && "bg-indigo-500/10 text-white"
          )}
        >
          <Plus className="h-4 w-4" />
          AI Workspace
        </Button>
      </Link>
      <Link href="/dashboard/forms">
        <Button
          variant="ghost"
          aria-current={pathname === "/dashboard/forms" ? "page" : undefined}
          className={cn(
            "w-full justify-start gap-2",
            pathname === "/dashboard/forms" && "bg-indigo-500/10 text-white"
          )}
        >
          <LayoutDashboard className="h-4 w-4" />
          All Forms
        </Button>
      </Link>
      
      <div className="mt-8 mb-2 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
        Recent Forms
      </div>
      {recentForms.length > 0 ? (
        recentForms.map((form) => (
          <div key={form._id} className="group relative flex items-center">
            <Link href={`/forms/${form._id}`} className="flex-1 min-w-0">
              <Button variant="ghost" className="w-full justify-start gap-2 text-slate-400 font-normal truncate pr-9">
                <History className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{form.title}</span>
              </Button>
            </Link>
            <button
              type="button"
              onClick={(e) => handleDuplicate(e, form)}
              aria-label={`Duplicate ${form.title}`}
              title="Duplicate form"
              className="absolute right-9 flex h-7 w-7 items-center justify-center rounded-md text-slate-500 opacity-0 transition-all hover:bg-indigo-500/10 hover:text-indigo-400 focus:opacity-100 group-hover:opacity-100"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => handleDelete(e, form)}
              disabled={deletingId === form._id}
              aria-label={`Delete ${form.title}`}
              title="Delete form"
              className="absolute right-1.5 flex h-7 w-7 items-center justify-center rounded-md text-slate-500 opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 focus:opacity-100 group-hover:opacity-100 disabled:opacity-50"
            >
              {deletingId === form._id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        ))
      ) : (
        <div className="px-4 text-sm text-slate-400">No recent forms</div>
      )}
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex h-screen w-72 flex-col border-r border-slate-900 bg-slate-950">
        <div className="flex h-16 items-center gap-2 px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-indigo-600 text-white font-bold">
            F
          </div>
          <span className="text-xl font-bold">FormAI</span>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4">
          <NavItems />
        </div>

        <div className="border-t border-slate-900 p-4 space-y-3">
          <div className="flex items-center gap-3 px-2">
            <UserButton />
            <div className="flex flex-col">
              <span className="text-sm font-medium leading-none">{user?.fullName}</span>
              <span className="text-xs text-slate-400">{user?.primaryEmailAddress?.emailAddress}</span>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10"
            onClick={() => signOut({ redirectUrl: "/" })}
          >
            <LogOut className="h-4 w-4" />
            Log out
          </Button>
        </div>
      </aside>

      {/* Mobile Header + Sheet */}
      <div className="md:hidden flex items-center justify-between h-16 px-4 bg-slate-950 border-b border-slate-900">
        <div className="flex items-center gap-2 font-bold">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-indigo-600 text-white text-xs">
            F
          </div>
          FormAI
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open navigation menu">
              <Menu className="h-6 w-6" aria-hidden="true" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 bg-slate-950 border-slate-900">
            <div className="flex h-16 items-center gap-2 px-6">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-indigo-600 text-white font-bold">
                F
              </div>
              <span className="text-xl font-bold">FormAI</span>
            </div>
            <div className="flex-1 py-4">
              <NavItems />
            </div>
            <div className="absolute bottom-0 w-full border-t border-slate-900 p-4 space-y-3">
               <div className="flex items-center gap-3 px-2 text-white">
                <UserButton />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{user?.fullName}</span>
                  <span className="text-xs text-slate-400">{user?.primaryEmailAddress?.emailAddress}</span>
                </div>
              </div>
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10"
                onClick={() => signOut({ redirectUrl: "/" })}
              >
                <LogOut className="h-4 w-4" />
                Log out
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}
