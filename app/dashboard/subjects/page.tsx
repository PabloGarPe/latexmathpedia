"use client"

import Link from "next/link"
import { BookOpen } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useSubjects } from "@/hooks/api/use-subjects"

export default function SubjectsCatalogPage() {
  const { data: subjects, isLoading } = useSubjects()

  return (
    <div className="p-8 max-w-325 mx-auto">
      <h1 className="text-3xl font-bold tracking-tight mb-6">Asignaturas</h1>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="animate-pulse bg-muted rounded-lg h-32"></div>
          ))}
        </div>
      ) : subjects && subjects.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {subjects.map((subject) => (
            <Link key={subject.id} href={`/dashboard/subjects/${subject.id}`}>
              <Card className="h-full transition-all duration-200 hover:shadow-md hover:scale-102">
                <CardHeader className="flex flex-row items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary shrink-0" />
                  <CardTitle className="text-lg font-semibold">{subject.name}</CardTitle>
                </CardHeader>
                {subject.description && (
                  <CardContent>
                    <CardDescription className="line-clamp-3">
                      {subject.description}
                    </CardDescription>
                  </CardContent>
                )}
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">No hay asignaturas disponibles todavía.</p>
      )}
    </div>
  )
}
