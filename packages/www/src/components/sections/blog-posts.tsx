import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@openpromo/ui/components/avatar";
import { BadgeDollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import SectionHeader from "../elements/section-header";

// Define the post type to match the schema
type BlogPostType = {
  id: string;
  data: {
    title: string;
    description: string;
    pubDate: Date;
    updatedDate?: Date;
    image?: string;
    authorImage?: string;
    authorName?: string;
  };
};

const BlogPosts = ({
  posts,
  withBorders = false,
}: {
  posts: BlogPostType[];
  withBorders?: boolean;
}) => {
  return (
    <>
      <SectionHeader
        className={
          withBorders ? "" : "border-none lg:items-center lg:text-center"
        }
        iconTitle="Blog"
        title="Latest Articles"
        icon={BadgeDollarSign}
        description="Explore our blog for insightful articles, personal reflections and more."
      />
      <section className="container mx-auto max-w-7xl py-12">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <a
              key={post.id}
              className="group overflow-hidden border transition-all"
              href={`/blog/${post.id}/`}
            >
              <div className="">
                {post.data.image && (
                  <img
                    src={post.data.image}
                    alt={post.data.title}
                    className="aspect-video w-full object-cover"
                  />
                )}
              </div>
              <div className="p-4">
                <h2 className="group-hover:text-primary mb-2 text-xl font-semibold tracking-tight transition-colors">
                  {post.data.title}
                </h2>

                <div className="mb-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="ring-input size-6 ring-1">
                      <AvatarImage
                        src={post.data.authorImage}
                        alt={post.data.authorName || "Author"}
                      />
                      <AvatarFallback>
                        {post.data.authorName?.charAt(0) || "A"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">
                      {post.data.authorName || "Author"}
                    </span>
                    <span className="text-sm font-medium">
                      {new Date(post.data.pubDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                <p className="text-muted-foreground line-clamp-2 text-sm">
                  {post.data.description}
                </p>
              </div>
            </a>
          ))}
        </div>
      </section>
    </>
  );
};

const _BorderedSection = ({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) => (
  <div
    className={cn("relative w-[159px] border-r p-1 max-lg:hidden", className)}
  >
    {children}
  </div>
);

export { BlogPosts };
