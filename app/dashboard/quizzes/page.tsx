"use client"

import { useMemo, useState } from "react"
import { QuizCard } from "@/components/quiz-card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { usePublicQuizzes } from "@/hooks/api/use-quizzes"
import { useSubjects } from "@/hooks/api/use-subjects"

const ALL_SUBJECTS = "__all__"

export default function QuizzesPage() {
  const [subjectFilter, setSubjectFilter] = useState<string>(ALL_SUBJECTS)
  const { data: quizzes, isLoading } = usePublicQuizzes()
  const { data: subjects } = useSubjects()

  const filteredQuizzes = useMemo(() => {
    if (!quizzes) return []
    if (subjectFilter === ALL_SUBJECTS) return quizzes
    const subjectId = Number(subjectFilter)
    return quizzes.filter((quiz) => quiz.subject?.id === subjectId)
  }, [quizzes, subjectFilter])

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Cuestionarios</h1>
        <Select value={subjectFilter} onValueChange={setSubjectFilter}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Filtrar por asignatura" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_SUBJECTS}>Todas las asignaturas</SelectItem>
            {subjects?.map((subject) => (
              <SelectItem key={subject.id} value={String(subject.id)}>
                {subject.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Cargando cuestionarios...</p>
      ) : filteredQuizzes.length > 0 ? (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredQuizzes.map((quiz) => (
            <QuizCard key={quiz.id} quiz={quiz} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">No hay cuestionarios disponibles todavía.</p>
      )}
    </div>
  )
}
