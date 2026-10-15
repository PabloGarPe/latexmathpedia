import BlogCard from "@/components/blog-card"
import { PageContainer, PageHeader } from "@/components/page-shell"
import { getAllBlogPosts } from "@/lib/content/posts"

export default function BlogIndex() {
  const posts = getAllBlogPosts()

  return (
    <PageContainer>
      <PageHeader title="Blog de Matemáticas" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
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
    </PageContainer>
  )
}
