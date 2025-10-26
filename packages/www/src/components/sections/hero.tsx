import { Button } from "@openpromo/ui/components/button";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import DiagonalPattern from "../elements/diagonal-pattern";

export default function Hero({ dashboardUrl }: { dashboardUrl: string }) {
  return (
    <section className="pb-16 text-center lg:pb-0">
      <div className="flex">
        <BorderedSection className="2xl:flex-1">
          <DiagonalPattern />
        </BorderedSection>
        <div className="container mx-auto pb-12 pt-16 text-center md:pt-20 lg:pt-28">
          <h1 className="mx-auto max-w-[500px] text-balance text-[2.5rem] leading-[1.2] tracking-[-1.6px] md:text-[4rem] md:!leading-[1.15] md:tracking-[-4.32px] lg:text-7xl">
            Make better ads, faster
          </h1>
          <p className="text-muted-foreground mx-auto mt-5 max-w-[500px] leading-[1.5] tracking-[-0.32px] md:mt-6">
            Create social-ready content, launch campaigns, and grow with
            AI-powered workflows for small teams and creators.
          </p>
          <Button asChild className="mt-6 gap-1 md:mt-8 lg:mt-10">
            <a href={dashboardUrl}>
              Try demo
              <ChevronRight className="size-4" />
            </a>
          </Button>
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
        <div className={`container !pt-0 lg:!p-1.5`}>
          <img
            src="/images/homepage/hero.png"
            alt="Hero"
            className="mx-auto rounded-xl border object-contain p-1 shadow-lg 2xl:max-w-[1092px] bg-muted"
            width={1000}
            height={600}
            style={{
              aspectRatio: "1000 / 600",
              backgroundColor: "#f6f6f7",
              transition: "opacity 160ms ease",
            }}
            loading="eager"
            decoding="async"
            fetchPriority="high"
          />
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
    </section>
  );
}

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
