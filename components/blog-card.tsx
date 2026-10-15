"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";

interface BlogCardProps {
  title: string;
  description: string;
  date: string;
  estimatedReadTime: string;
  tags: string[];
  link: string;
}

export default function BlogCard({
  title,
  description,
  date,
  estimatedReadTime,
  tags,
  link,
}: BlogCardProps) {

  const { isAdmin } = useAuth();
  
  return (
    <Link href={`/dashboard/blog/${link}`} className="group block h-full">
      <Card className="flex flex-col h-full transition-all duration-200 hover:shadow-md hover:scale-102">
        <CardHeader className="p-4 pb-0">
            <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors duration-200">
              {title}
            </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2 grow">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {description}
          </p>
        </CardContent>
        <CardFooter className="p-4 pt-0 flex flex-col items-start gap-2">
          <div className="flex flex-wrap gap-1">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="font-normal text-xs">
                {tag}
              </Badge>
            ))}
          </div>
          <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
            <span>{date}</span>
            <span>{estimatedReadTime} de lectura</span>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
