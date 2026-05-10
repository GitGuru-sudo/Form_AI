"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Form, FormResponse } from "@/types"
import { format } from "date-fns"

interface ResponseTableProps {
  form: Form
  responses: FormResponse[]
}

export function ResponseTable({ form, responses }: ResponseTableProps) {
  const getDynamicValue = (res: FormResponse, qId: string) => {
    const ans = res.answers.find((a) => a.questionId === qId)
    return ans ? ans.answerText : "-"
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-950">
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="w-[180px] text-slate-400 font-semibold">Submitted At</TableHead>
              {form.collectFullName && <TableHead className="text-slate-400 font-semibold">Name</TableHead>}
              {form.collectEmail && <TableHead className="text-slate-400 font-semibold">Email</TableHead>}
              {form.collectPhone && <TableHead className="text-slate-400 font-semibold">Phone</TableHead>}
              {form.collectAge && <TableHead className="text-slate-400 font-semibold">Age</TableHead>}
              {form.collectGender && <TableHead className="text-slate-400 font-semibold">Gender</TableHead>}
              {form.questions.map((q) => (
                <TableHead key={q.questionId} className="min-w-[150px] text-slate-400 font-semibold">
                  {q.questionText}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {responses.map((res, index) => (
              <TableRow
                key={res._id}
                className={`border-slate-800 hover:bg-slate-800/50 transition-colors ${
                  index % 2 === 0 ? "bg-slate-900/50" : "bg-slate-900"
                }`}
              >
                <TableCell className="text-slate-400 font-mono text-xs">
                  {format(new Date(res.submittedAt), "MMM d, yyyy HH:mm")}
                </TableCell>
                {form.collectFullName && (
                  <TableCell className="font-medium">{res.respondentName || "-"}</TableCell>
                )}
                {form.collectEmail && <TableCell>{res.respondentEmail || "-"}</TableCell>}
                {form.collectPhone && <TableCell>{res.respondentPhone || "-"}</TableCell>}
                {form.collectAge && <TableCell>{res.respondentAge || "-"}</TableCell>}
                {form.collectGender && <TableCell>{res.respondentGender || "-"}</TableCell>}
                {form.questions.map((q) => (
                  <TableCell key={q.questionId} className="text-slate-300">
                    {getDynamicValue(res, q.questionId)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {responses.length === 0 && (
              <TableRow>
                <TableCell colSpan={100} className="h-48 text-center text-slate-500">
                  No responses yet. Share your form to start collecting data.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
