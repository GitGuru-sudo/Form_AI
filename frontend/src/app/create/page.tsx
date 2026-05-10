"use client"

import { Sidebar } from "@/components/Sidebar"
import { ChatMessage } from "@/components/ChatMessage"
import { ChatInput } from "@/components/ChatInput"
import { useState, useRef, useEffect } from "react"
import { ChatMessage as MessageType } from "@/types"
import { useRouter } from "next/navigation"
import api from "@/lib/api"
import { useAuth } from "@clerk/nextjs"

type ChatState = "initial" | "waiting_for_count" | "generating"
const GENERATE_TIMEOUT_MS = 105000

function parseQuestionCount(input: string): number | null {
  const trimmed = input.trim().toLowerCase();
  
  if (trimmed === "" || trimmed === "default" || trimmed === "skip" || trimmed === "10") {
    return 10;
  }
  
  const num = parseInt(input.trim(), 10);
  if (!isNaN(num) && num >= 1 && num <= 50) {
    return num;
  }
  
  return null;
}

export default function CreateFormPage() {
  const router = useRouter()
  const { getToken } = useAuth()
  const [messages, setMessages] = useState<MessageType[]>([
    {
      id: "1",
      role: "ai",
      content: "Hi! I'm FormAI. Tell me what kind of form you want and I'll generate it instantly. Examples: 'Job application form', 'Customer feedback', 'Event registration'"
    }
  ])
  const [isTyping, setIsTyping] = useState(false)
  const [chatState, setChatState] = useState<ChatState>("initial")
  const [pendingPrompt, setPendingPrompt] = useState<string>("")
  const [isBuilding, setIsBuilding] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping])

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsBuilding(false)
    setChatState("waiting_for_count")
    setMessages(prev => [...prev, {
      id: (Date.now() + 1).toString(),
      role: "ai",
      content: "Form generation cancelled. You can try again or modify your prompt."
    }])
  }

  const handleSend = async (content: string) => {
    const userMessage: MessageType = {
      id: Date.now().toString(),
      role: "user",
      content
    }
    setMessages(prev => [...prev, userMessage])

    if (chatState === "initial") {
      setPendingPrompt(content);
      setIsTyping(true);
      
      setTimeout(() => {
        const aiMessage: MessageType = {
          id: (Date.now() + 1).toString(),
          role: "ai",
          content: "Got it! How many questions would you like in your form? You can reply with a number (1-50) or just press enter for the default of 10 questions."
        };
        setMessages(prev => [...prev, aiMessage]);
        setChatState("waiting_for_count");
        setIsTyping(false);
      }, 800);
    } 
    else if (chatState === "waiting_for_count") {
      const count = parseQuestionCount(content);
      
      if (count === null) {
        setIsTyping(true);
        
        setTimeout(() => {
          const aiMessage: MessageType = {
            id: (Date.now() + 1).toString(),
            role: "ai",
            content: "Please enter a valid number between 1 and 50. For example: '10' or just press enter for the default of 10 questions."
          };
          setMessages(prev => [...prev, aiMessage]);
          setIsTyping(false);
        }, 800);
      } else {
        setChatState("generating");
        setIsBuilding(true);
        
        const aiMessage: MessageType = {
          id: (Date.now() + 1).toString(),
          role: "ai",
          content: "",
          isTyping: true
        }
        setMessages(prev => [...prev, aiMessage])
        
        abortControllerRef.current = new AbortController()
        let didTimeout = false
        const requestStartedAt = Date.now()
        const timeoutId = window.setTimeout(() => {
          didTimeout = true
          abortControllerRef.current?.abort()
        }, GENERATE_TIMEOUT_MS)
        
        try {
          const token = await getToken();
          console.info("[FormAI] Token acquired", {
            durationMs: Date.now() - requestStartedAt,
            hasToken: Boolean(token)
          });

          const res = await api.post("/api/ml/generate", { 
            prompt: pendingPrompt, 
            questionCount: count 
          }, {
            headers: { Authorization: `Bearer ${token}` },
            signal: abortControllerRef.current.signal
          });

          console.info("[FormAI] Generate request completed", {
            durationMs: Date.now() - requestStartedAt,
            status: res.status,
            questionCount: res.data?.questions?.length
          });
          
          localStorage.setItem("generatedForm", JSON.stringify(res.data));
          router.push("/create/preview");
        } catch (err: any) {
          console.error("[FormAI] Generate request failed", {
            durationMs: Date.now() - requestStartedAt,
            didTimeout,
            name: err.name,
            status: err.response?.status,
            message: err.message
          });

          if (err.name === 'CanceledError' || err.name === 'AbortError') {
            if (didTimeout) {
              setMessages(prev => prev.filter(m => m.id !== aiMessage.id).concat([{
                id: (Date.now() + 2).toString(),
                role: "ai",
                content: "Form generation took longer than 105 seconds. Please try again with fewer questions or a shorter prompt."
              }]));
              setIsBuilding(false)
              setChatState("waiting_for_count")
            }
            return
          }
          console.error(err);
          setMessages(prev => prev.filter(m => m.id !== aiMessage.id).concat([{
            id: (Date.now() + 2).toString(),
            role: "ai",
            content: "Something went wrong while generating your form. Please try again."
          }]));
          setIsBuilding(false)
          setChatState("waiting_for_count")
        } finally {
          window.clearTimeout(timeoutId)
        }
      }
    }
  }

  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
      <Sidebar />
      <main className="flex flex-1 flex-col relative">
        <div className="flex-1 overflow-y-auto scrollbar-hide py-4">
          <div className="flex flex-col">
            {messages.map((message) => (
              <ChatMessage key={message.id} role={message.role} content={message.content} isTyping={message.isTyping} />
            ))}
            {isBuilding && (
              <div className="flex items-center gap-2 text-slate-400 px-4">
                <span>Building</span>
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
        <ChatInput onSend={handleSend} disabled={isTyping || isBuilding} isBuilding={isBuilding} onStop={handleStop} />
      </main>
    </div>
  )
}
