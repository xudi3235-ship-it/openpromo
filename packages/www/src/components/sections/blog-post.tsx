import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@openpromo/ui/components/avatar";
import { Separator } from "@openpromo/ui/components/separator";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import DiagonalPattern from "../elements/diagonal-pattern";

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

const BlogPost = ({
  post,
  children,
}: {
  post: BlogPostType;
  children: React.ReactNode;
}) => {
  const { title, authorName, image, pubDate, description, authorImage } =
    post.data;
  return (
    <section className="pb-16 text-center lg:pb-0">
      <div className="flex">
        <BorderedSection className="2xl:flex-1">
          <DiagonalPattern />
        </BorderedSection>
        <div className="container mx-auto pb-6 pt-16 text-center md:pt-20 lg:pt-28">
          <div className="mx-auto flex max-w-3xl flex-col items-center">
            <div className="mb-6 flex w-full items-center justify-center gap-3 text-sm md:text-base">
              {authorImage && (
                <Avatar className="h-12 w-12 border">
                  <AvatarImage src={authorImage} />
                  <AvatarFallback>
                    {authorName?.charAt(0) || "A"}
                  </AvatarFallback>
                </Avatar>
              )}
              <span>
                {authorName && (
                  <span className="font-semibold">{authorName}</span>
                )}
                <span className="ml-1">
                  on {format(pubDate, "MMMM d, yyyy")}
                </span>
              </span>
            </div>
            <Separator className="mb-8 w-full" />
          </div>
          <h1 className="mx-auto max-w-[800px] text-balance text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
            {title}
          </h1>
          <p className="text-muted-foreground mx-auto mt-5 max-w-[700px] leading-[1.5] tracking-[-0.32px] md:mt-6">
            {description}
          </p>
        </div>
        <BorderedSection className="border-l border-r-0 2xl:flex-1">
          <DiagonalPattern />
        </BorderedSection>
      </div>
      <div className="flex h-8 gap-1 max-lg:hidden">
        <div className="flex-1 border" />
        <DiagonalPattern className="w-52" />
        <div className="w-24 border" />
        <DiagonalPattern className="w-52" />
        <div className="w-24 border" />
        <DiagonalPattern className="w-52" />
        <div className="flex-1 border" />
      </div>
      <div className="flex">
        <BorderedSection className="2xl:flex-1" />
        <div className="container !pt-0 lg:!p-1.5">
          {image && (
            <img
              src={image}
              alt={title}
              className="mx-auto aspect-video border object-cover p-1 2xl:max-w-[1092px]"
              width={1000}
              height={600}
            />
          )}
        </div>
        <BorderedSection className="border-l border-r-0 2xl:flex-1" />
      </div>
      <div className="flex max-lg:hidden">
        <div className="h-8 flex-1 border" />
        <div className="h-[96px] w-[min(753px,55vw)] -translate-y-1.5">
          <DiagonalPattern />
        </div>
        <div className="h-8 flex-1 border" />
      </div>
      <div className="container mt-12 pb-12">
        <div className="prose prose-lg dark:prose-invert mx-auto max-w-3xl text-left">
          {children}
        </div>
      </div>
    </section>
  );
};

const BorderedSection = ({
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

export { BlogPost };
