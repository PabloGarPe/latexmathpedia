import { DashboardFeed } from "@/components/dashboard-feed";
import { getAllBlogPosts } from "@/lib/content/posts";

export default function DashboardPage() {
  const posts = getAllBlogPosts();
  return <DashboardFeed posts={posts} />;
}
