"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { UserButton, useUser, useClerk, useAuth } from "@clerk/nextjs"
import { Plus, LayoutDashboard, History, Menu, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import api from "@/lib/api"
import { Form } from "@/types"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

export function Sidebar() {
  const pathname = usePathname()
  const { user } = useUser()
  const { signOut } = useClerk()
  const { getToken } = useAuth()
  const [recentForms, setRecentForms] = useState<Form[]>([])

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

  const NavItems = () => (
    <div className="flex flex-col gap-2 px-2">
      <Link href="/dashboard">
        <Button 
          variant={pathname === "/dashboard" ? "secondary" : "ghost"} 
          className="w-full justify-start gap-2"
        >
          <Plus className="h-4 w-4" />
          AI Workspace
        </Button>
      </Link>
      <Link href="/dashboard/forms">
        <Button 
          variant={pathname === "/dashboard/forms" ? "secondary" : "ghost"} 
          className="w-full justify-start gap-2"
        >
          <LayoutDashboard className="h-4 w-4" />
          All Forms
        </Button>
      </Link>
      
      <div className="mt-8 mb-2 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
        Recent Forms
      </div>
      {recentForms.length > 0 ? (
        recentForms.map((form) => (
          <Link key={form._id} href={`/forms/${form._id}`}>
            <Button variant="ghost" className="w-full justify-start gap-2 text-slate-400 font-normal truncate">
              <History className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{form.title}</span>
            </Button>
          </Link>
        ))
      ) : (
        <div className="px-4 text-sm text-slate-600">No recent forms</div>
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
              <span className="text-xs text-slate-500">{user?.primaryEmailAddress?.emailAddress}</span>
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
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
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
                  <span className="text-xs text-slate-500">{user?.primaryEmailAddress?.emailAddress}</span>
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
