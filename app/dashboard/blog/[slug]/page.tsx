import fs from "fs"
import path from "path"
import matter from "gray-matter"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"
import { CalendarIcon, Clock } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import MDXContent from "@/components/mdx-content"
import { DemBox } from '@/components/mdx/DemBox';
import { EjBox } from '@/components/mdx/EjBox';
import { EjemBox } from '@/components/mdx/EjemBox';

// Todos los posts se conocen en el build: cualquier otro slug da 404 y nunca se construye una ruta de fichero con él
export const dynamicParams = false

export async function generateStaticParams() {
  const postsDir = path.join(process.cwd(), "content/posts")
  const filenames = fs.readdirSync(postsDir)

  return filenames.map((file) => ({
    slug: file.replace(/\.mdx?$/, ""),
  }))
}

export default async function BlogPost({ params }: { params: { slug: string } }) {
  // Asegurarse de que params sea manejado correctamente
  const { slug } = await Promise.resolve(params);

  const filePath = path.join(process.cwd(), "content/posts", `${slug}.mdx`);
  const file = fs.readFileSync(filePath, "utf-8");
  const { content, data } = matter(file);

  // Calcular tiempo estimado de lectura (promedio 200 palabras/minuto)
  const wordCount = content.split(/\s+/).length;
  const estimatedReadTime = `${Math.ceil(wordCount / 80)} min`;

  // Usar tags si están disponibles, o un valor predeterminado
  const tags = (data.tags as string[]) || ["Matemáticas"];

  return (
    <div className="container max-w-[1200px] mx-auto py-6">
      <div className="mb-6">
        <Link href="/dashboard/blog">
          <Button variant="ghost" size="sm" className="mb-4">
            ← Volver a Blog
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="pt-6">
          <article className="space-y-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{data.title}</h1>

              <div className="flex flex-wrap gap-2 mt-4">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary">{tag}</Badge>
                ))}
              </div>

              <div className="flex items-center gap-6 mt-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  <span>{data.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{estimatedReadTime} de lectura</span>
                </div>
              </div>
            </div>

            <Separator className="my-4" />

            <MDXContent source={content} components={{ DemBox, EjBox, EjemBox }} />
          </article>
        </CardContent>
      </Card>
    </div>
  );
}
