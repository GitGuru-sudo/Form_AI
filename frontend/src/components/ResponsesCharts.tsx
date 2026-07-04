"use client"

import { useMemo } from "react"
import { Form, FormResponse } from "@/types"
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts"

const CHOICE_TYPES = new Set(["multiple_choice", "checkbox", "dropdown", "yes_no"])
const NUMERIC_TYPES = new Set(["rating", "linear_scale", "number"])

const COLORS = ["#6366f1", "#818cf8", "#a5b4fc", "#4f46e5", "#7c3aed", "#22d3ee", "#34d399", "#f59e0b"]

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "of", "to", "in", "on", "for", "is", "are",
  "was", "were", "be", "i", "it", "this", "that", "with", "as", "at", "by", "my",
])

interface AggBucket { label: string; count: number }

function aggregateChoice(responses: FormResponse[], questionId: string): AggBucket[] {
  const counts = new Map<string, number>()
  for (const r of responses) {
    const ans = r.answers.find(a => a.questionId === questionId)
    if (!ans || !ans.answerText.trim()) continue
    for (const part of ans.answerText.split(", ")) {
      const label = part.trim()
      if (!label) continue
      counts.set(label, (counts.get(label) || 0) + 1)
    }
  }
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
}

function aggregateNumeric(responses: FormResponse[], questionId: string): AggBucket[] {
  const counts = new Map<string, number>()
  for (const r of responses) {
    const ans = r.answers.find(a => a.questionId === questionId)
    if (!ans || !ans.answerText.trim()) continue
    const n = Number(ans.answerText.trim())
    if (Number.isNaN(n)) continue
    const key = String(n)
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => Number(a.label) - Number(b.label))
}

function aggregateText(responses: FormResponse[], questionId: string) {
  const answers: string[] = []
  const wordCounts = new Map<string, number>()
  for (const r of responses) {
    const ans = r.answers.find(a => a.questionId === questionId)
    if (!ans || !ans.answerText.trim()) continue
    answers.push(ans.answerText.trim())
    for (const w of ans.answerText.toLowerCase().match(/[a-z0-9']+/g) || []) {
      if (w.length < 3 || STOP_WORDS.has(w)) continue
      wordCounts.set(w, (wordCounts.get(w) || 0) + 1)
    }
  }
  const topWords = Array.from(wordCounts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12)
  return { answers, topWords }
}

function ChartCard({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h3 className="font-semibold text-white">{title}</h3>
        <span className="text-xs text-slate-500">{count} answered</span>
      </div>
      {children}
    </div>
  )
}

function ChoiceChart({ data }: { data: AggBucket[] }) {
  const total = data.reduce((s, d) => s + d.count, 0)
  if (data.length <= 6) {
    return (
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <ResponsiveContainer width={200} height={200}>
          <PieChart>
            <Pie data={data} dataKey="count" nameKey="label" innerRadius={45} outerRadius={80} paddingAngle={2}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, color: "#fff" }} />
          </PieChart>
        </ResponsiveContainer>
        <ul className="flex-1 space-y-2 text-sm w-full">
          {data.map((d, i) => (
            <li key={d.label} className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
              <span className="text-slate-300 flex-1 truncate">{d.label}</span>
              <span className="text-slate-500">{d.count} ({total ? Math.round((d.count / total) * 100) : 0}%)</span>
            </li>
          ))}
        </ul>
      </div>
    )
  }
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 36)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
        <XAxis type="number" stroke="#64748b" fontSize={12} allowDecimals={false} />
        <YAxis type="category" dataKey="label" stroke="#94a3b8" fontSize={12} width={140} />
        <Tooltip cursor={{ fill: "#1e293b" }} contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, color: "#fff" }} />
        <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function HistogramChart({ data }: { data: AggBucket[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ left: 0, right: 8 }}>
        <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} />
        <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
        <Tooltip cursor={{ fill: "#1e293b" }} contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, color: "#fff" }} />
        <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function TextSummary({ topWords, answers }: { topWords: AggBucket[]; answers: string[] }) {
  const maxWord = topWords[0]?.count || 1
  return (
    <div className="space-y-4">
      {topWords.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {topWords.map(w => (
            <span
              key={w.label}
              className="rounded-full bg-indigo-600/15 text-indigo-300 px-3 py-1 border border-indigo-600/20"
              style={{ fontSize: `${0.75 + (w.count / maxWord) * 0.5}rem` }}
            >
              {w.label} <span className="text-indigo-400/60">{w.count}</span>
            </span>
          ))}
        </div>
      )}
      <ul className="space-y-2 max-h-64 overflow-y-auto text-sm">
        {answers.slice(0, 50).map((a, i) => (
          <li key={i} className="text-slate-300 border-l-2 border-slate-800 pl-3 whitespace-pre-wrap">{a}</li>
        ))}
        {answers.length > 50 && (
          <li className="text-slate-500 text-xs pl-3">+{answers.length - 50} more…</li>
        )}
      </ul>
    </div>
  )
}

export function ResponsesCharts({ form, responses }: { form: Form; responses: FormResponse[] }) {
  const sortedQuestions = useMemo(
    () => [...form.questions].sort((a, b) => a.orderIndex - b.orderIndex),
    [form.questions]
  )

  if (responses.length === 0) {
    return (
      <div className="text-center py-24 text-slate-400">
        <p className="text-lg">Nothing to summarise yet.</p>
        <p className="text-sm mt-1">Charts appear once responses come in.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {sortedQuestions.map(q => {
        if (CHOICE_TYPES.has(q.questionType)) {
          const data = aggregateChoice(responses, q.questionId)
          const answered = responses.filter(r => r.answers.some(a => a.questionId === q.questionId && a.answerText.trim())).length
          return (
            <ChartCard key={q.questionId} title={q.questionText} count={answered}>
              {data.length ? <ChoiceChart data={data} /> : <p className="text-slate-500 text-sm">No answers.</p>}
            </ChartCard>
          )
        }
        if (NUMERIC_TYPES.has(q.questionType)) {
          const data = aggregateNumeric(responses, q.questionId)
          const answered = data.reduce((s, d) => s + d.count, 0)
          return (
            <ChartCard key={q.questionId} title={q.questionText} count={answered}>
              {data.length ? <HistogramChart data={data} /> : <p className="text-slate-500 text-sm">No numeric answers.</p>}
            </ChartCard>
          )
        }
        const { topWords, answers } = aggregateText(responses, q.questionId)
        return (
          <ChartCard key={q.questionId} title={q.questionText} count={answers.length}>
            {answers.length ? <TextSummary topWords={topWords} answers={answers} /> : <p className="text-slate-500 text-sm">No answers.</p>}
          </ChartCard>
        )
      })}
    </div>
  )
}
