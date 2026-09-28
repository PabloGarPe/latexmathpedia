import fs from "fs";
import path from "path";
import matter from "gray-matter";

// Server-only: usa `fs`/`path`, así que solo se puede importar desde Server Components
// (p.ej. app/dashboard/blog/page.tsx, app/dashboard/page.tsx), nunca desde un "use client".

export type BlogPostMeta = {
  slug: string;
  title: string;
  description: string;
  date: string;
  estimatedReadTime: string;
  tags: string[];
};

export function getAllBlogPosts(): BlogPostMeta[] {
  const postsDir = path.join(process.cwd(), "content/posts");
  const filenames = fs.readdirSync(postsDir);

  const posts = filenames.map((file) => {
    const slug = file.replace(/\.mdx?$/, "");
    const filePath = path.join(postsDir, file);
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const { data, content } = matter(fileContent);

    // Calcular tiempo estimado de lectura (promedio 200 palabras/minuto)
    const wordCount = content.split(/\s+/).length;
    const estimatedReadTime = `${Math.ceil(wordCount / 80)} min`;

    return {
      slug,
      title: data.title as string,
      description: (data.description as string) || "",
      date: data.date as string,
      estimatedReadTime,
      tags: (data.tags as string[]) || ["Matemáticas"], // Tags por defecto si no están definidos
    };
  });

  return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
