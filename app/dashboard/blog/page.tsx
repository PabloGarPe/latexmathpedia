import BlogCard from "@/components/blog-card"
import { getAllBlogPosts } from "@/lib/content/posts"

export default function BlogIndex() {
  const posts = getAllBlogPosts()

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Blog de Matemáticas</h1>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
        {posts.map((post) => (
          <BlogCard
            key={post.slug}
            title={post.title}
            description={post.description}
            date={post.date}
            estimatedReadTime={post.estimatedReadTime}
            tags={post.tags}
            link={post.slug}
          />
        ))}
      </div>
    </div>
  )
}
