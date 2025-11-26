import { Card } from "@openpromo/ui/components/card";
import { Handshake } from "lucide-react";
import SectionHeader from "../elements/section-header";

const testimonials: TestimonialProps[] = [
  {
    logo: {
      src: "/images/logos/zerostatic.png",
      alt: "Zerostatic logo",
      width: 155,
      height: 36,
    },
    quote:
      "Our team at Zerostatic relies heavily on automation, and this app takes it to another level. It&apos;s like having a virtual assistant built right into my workflow.",
    author: {
      name: "Abdulsalam Abdulsalam",
      role: "Product Designer, Zerostatic",
      image: "/images/testimonials/1.png",
    },
  },
  {
    logo: {
      src: "/images/logos/notion.svg",
      alt: "Notion logo",
      width: 96.75,
      height: 36,
    },
    quote:
      "I especially love the seamless calendar integrations and advanced task management features keep everyone aligned and organized.",
    author: {
      name: "Emma Lee",
      role: "Product Manager, Notion",
      image: "/images/testimonials/2.png",
    },
  },
  {
    logo: {
      src: "/images/logos/slack.svg",
      alt: "Slack logo",
      width: 90.75,
      height: 36,
    },
    quote:
      "We needed a productivity app that could grow with our team&apos;s evolving needs, this has been the perfect fit. The automation tools have saved us hours.",
    author: {
      name: "Ryan Chen",
      role: "Operations Lead, Slack",
      image: "/images/testimonials/3.png",
    },
  },
  {
    logo: {
      src: "/images/logos/github.svg",
      alt: "GitHub logo",
      width: 101.25,
      height: 36,
    },
    quote:
      "This platform has been invaluable for managing projects across distributed teams. Its integration with our existing tools makes setup easy.",
    author: {
      name: "Ryan Patel",
      role: "Engineering Manager, GitHub",
      image: "/images/testimonials/4.png",
    },
  },
  {
    logo: {
      src: "/images/logos/figma.svg",
      alt: "Figma logo",
      width: 81.75,
      height: 36,
    },
    quote:
      "As a designer, I appreciate how intuitive and visually appealing this app is. It simplifies task management without sacrificing powerful features.",
    author: {
      name: "Carlos Diaz",
      role: "Design Lead, Figma",
      image: "/images/testimonials/5.png",
    },
  },
  {
    logo: {
      src: "/images/logos/loom.svg",
      alt: "Loom logo",
      width: 87.75,
      height: 36,
    },
    quote:
      "The smart reminders and automated scheduling keep our team focused and on track. We&apos;ve also found the collaborative features to be very helpful.",
    author: {
      name: "Matthew Kim",
      role: "Content Strategist, Loom",
      image: "/images/testimonials/6.png",
    },
  },
];

const Testimonials = ({ withBorders = true }: { withBorders?: boolean }) => {
  return (
    <section className="">
      <div className={withBorders ? "border-b" : ""}>
        <SectionHeader
          iconTitle="lovin' it"
          title="What industry experts are saying"
          icon={Handshake}
          description="Trusted by Professionals from Leading Tech Companies"
          className={withBorders ? "" : "border-none"}
        />
      </div>

      <div className="container mt-10 grid gap-8 sm:grid-cols-2 md:mt-14 lg:grid-cols-3">
        {testimonials.map((testimonial, index) => (
          <TestimonialCard key={index} {...testimonial} />
        ))}
      </div>

      {withBorders && (
        <div className="mt-12 h-8 w-full border-y md:h-12 lg:h-[112px]">
          <div className="container h-full w-full border-x"></div>
        </div>
      )}
    </section>
  );
};

export default Testimonials;

interface TestimonialProps {
  logo: {
    src: string;
    alt: string;
    width: number;
    height: number;
  };
  quote: string;
  author: {
    name: string;
    role: string;
    image: string;
  };
}
function TestimonialCard({ logo, quote, author }: TestimonialProps) {
  return (
    <Card className="bg-background flex flex-col gap-6 rounded-md p-6 shadow-sm">
      <img
        src={logo.src}
        alt={logo.alt}
        width={logo.width}
        height={logo.height}
        className="object-contain dark:invert"
      />

      <blockquote className="text-muted-foreground-subtle text-lg font-normal italic">{`“${quote}”`}</blockquote>

      <div className="mt-auto flex items-center gap-4">
        <img
          src={author.image}
          alt={`${author.name}'s profile picture`}
          width={48}
          height={48}
          className="rounded-full object-cover"
        />
        <div>
          <p className="text-lg tracking-[-0.36px]">{author.name}</p>
          <p className="text-muted-foreground">{author.role}</p>
        </div>
      </div>
    </Card>
  );
}
