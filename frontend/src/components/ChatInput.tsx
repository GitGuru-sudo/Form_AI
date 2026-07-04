"use client"

import { SendHorizontal, Square, Sparkles } from "lucide-react"
import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"
import { useEffect, useRef, useState } from "react"

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  isBuilding?: boolean
  onStop?: () => void
  quickPrompts?: string[]
  showQuickPrompts?: boolean
}

// Strip the leading "Generate a form about:" so the chip reads as a short label.
function chipLabel(prompt: string): string {
  return prompt.replace(/^generate a form about:\s*/i, "").replace(/^i need a?n?\s*/i, "")
}

export function ChatInput({ onSend, disabled, isBuilding, onStop, quickPrompts, showQuickPrompts }: ChatInputProps) {
  const [input, setInput] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [input])

  const handleSend = () => {
    if (input.trim() && !disabled) {
      onSend(input.trim())
      setInput("")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const canShowChips = showQuickPrompts && quickPrompts && quickPrompts.length > 0 && !isBuilding

  return (
    <div className="z-10 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent pt-10 pb-6 px-4">
      {canShowChips && (
        <div className="mx-auto max-w-3xl mb-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            Try a quick start
          </div>
          <div className="flex flex-wrap gap-2">
            {quickPrompts!.map((prompt) => (
              <button
                key={prompt}
                type="button"
                disabled={disabled}
                onClick={() => onSend(prompt)}
                className="group rounded-full border border-slate-800 bg-slate-900/60 px-3.5 py-1.5 text-sm capitalize text-slate-300 transition-all hover:border-indigo-600/60 hover:bg-indigo-600/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {chipLabel(prompt)}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="mx-auto max-w-3xl relative">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe your form... (e.g. job application for a software engineer)"
          className="min-h-[56px] w-full resize-none bg-slate-900 border-slate-800 focus-visible:ring-indigo-600 pl-4 pr-24 py-4 rounded-xl shadow-2xl"
          disabled={disabled}
        />
        <div className="absolute right-2 bottom-2 flex gap-2">
          {isBuilding && onStop ? (
            <Button 
              size="icon" 
              onClick={onStop}
              className="h-10 w-16 bg-red-600 hover:bg-red-700 transition-all rounded-lg text-sm font-medium"
            >
              <Square className="h-4 w-4 mr-1" />
              Stop
            </Button>
          ) : (
            <Button 
              size="icon" 
              onClick={handleSend}
              disabled={!input.trim() || disabled}
              className="h-10 w-10 bg-indigo-600 hover:bg-indigo-700 transition-all rounded-lg"
              aria-label="Send message"
            >
              <SendHorizontal className="h-5 w-5" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-slate-500">
        AI generated forms should be reviewed for accuracy.
      </p>
    </div>
  )
}
