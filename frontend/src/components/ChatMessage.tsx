import { cn } from "@/lib/utils"
import { Bot, User } from "lucide-react"

interface ChatMessageProps {
  role: "user" | "ai"
  content: string
  isTyping?: boolean
}

export function ChatMessage({ role, content, isTyping }: ChatMessageProps) {
  return (
    <div className={cn(
      "flex w-full gap-4 px-4 py-8 md:px-6 animate-in fade-in duration-500",
      role === "ai" ? "bg-slate-900/30" : "bg-transparent"
    )}>
      <div className="mx-auto flex w-full max-w-3xl gap-4">
        <div className={cn(
          "flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border text-white",
          role === "ai" ? "bg-indigo-600 border-indigo-500" : "bg-slate-800 border-slate-700"
        )}>
          {role === "ai" ? <Bot size={18} /> : <User size={18} />}
        </div>
        <div className="flex-1 space-y-2 overflow-hidden px-1">
          {isTyping ? (
            <div className="flex gap-1 py-2">
              <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
              <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
              <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
            </div>
          ) : (
            <p className="leading-relaxed text-slate-200">
              {content}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
