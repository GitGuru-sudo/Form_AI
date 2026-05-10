"use client"

import { SendHorizontal, Square } from "lucide-react"
import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"
import { useEffect, useRef, useState } from "react"

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  isBuilding?: boolean
  onStop?: () => void
}

export function ChatInput({ onSend, disabled, isBuilding, onStop }: ChatInputProps) {
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

  return (
    <div className="z-10 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent pt-10 pb-6 px-4">
      <div className="mx-auto max-w-3xl relative">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe your form... (e.g. job application for a software engineer)"
          className="min-h-[56px] w-full resize-none bg-slate-900 border-slate-800 focus-visible:ring-indigo-600 pl-4 pr-24 py-4 rounded-xl shadow-2xl glass"
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
            >
              <SendHorizontal className="h-5 w-5" />
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
