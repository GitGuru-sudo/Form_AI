"use client"

import { Question } from "@/types"
import { QuestionCard } from "./QuestionCard"
import { Button } from "@/components/ui/button"
import { Plus, GripVertical } from "lucide-react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

interface FormEditorProps {
  questions: Question[]
  onChange: (questions: Question[]) => void
}

function SortableQuestionCard({
  question,
  onUpdate,
  onDelete,
}: {
  question: Question
  onUpdate: (id: string, updates: Partial<Question>) => void
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: question.questionId,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-2">
      <div 
        className="mt-6 cursor-grab active:cursor-grabbing text-slate-700 hover:text-slate-500" 
        {...attributes} 
        {...listeners}
      >
        <GripVertical size={20} />
      </div>
      <div className="flex-1">
        <QuestionCard question={question} onUpdate={onUpdate} onDelete={onDelete} />
      </div>
    </div>
  )
}

export function FormEditor({ questions, onChange }: FormEditorProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = questions.findIndex((q) => q.questionId === active.id)
    const newIndex = questions.findIndex((q) => q.questionId === over.id)

    const reordered = arrayMove(questions, oldIndex, newIndex).map((q, i) => ({
      ...q,
      orderIndex: i,
    }))

    onChange(reordered)
  }

  const handleUpdate = (id: string, updates: Partial<Question>) => {
    onChange(questions.map((q) => (q.questionId === id ? { ...q, ...updates } : q)))
  }

  const handleDelete = (id: string) => {
    onChange(questions.filter((q) => q.questionId !== id))
  }

  const addQuestion = () => {
    const newQ: Question = {
      questionId: `q_${Date.now()}`,
      questionText: "New Question",
      questionType: "short_answer",
      isRequired: false,
      orderIndex: questions.length,
    }
    onChange([...questions, newQ])
  }

  return (
    <div className="space-y-6">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={questions.map((q) => q.questionId)} strategy={verticalListSortingStrategy}>
          {questions.map((q) => (
            <SortableQuestionCard
              key={q.questionId}
              question={q}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}
        </SortableContext>
      </DndContext>

      <Button
        variant="outline"
        className="w-full h-16 border-dashed border-slate-800 bg-slate-900/20 hover:bg-slate-900/40 hover:border-slate-700 text-slate-500 hover:text-slate-300"
        onClick={addQuestion}
      >
        <Plus size={18} className="mr-2" />
        Add new question
      </Button>
    </div>
  )
}
