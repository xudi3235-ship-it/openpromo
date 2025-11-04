import { Button } from "@openpromo/ui/components/button";
import { Text } from "@openpromo/ui/components/typography";
import { MessageCircleHeart, Plus } from "lucide-react";
import { Container, Section, Stack } from "../_layout";

const testimonials = [
  {
    id: 1,
    quote:
      "Using this product has been such a smooth experience. It's clear that a lot of thought went into making it user-friendly.",
    name: "Diana Mounter",
    role: "Head of Product, Cloud",
    avatar:
      "https://api.builder.io/api/v1/image/assets/TEMP/0995b377d0fb3d6e5f90ec6608f2d5007d765b4b?width=64",
  },
  {
    id: 2,
    quote:
      "I didn't realize how much I needed this product until I started using it. It's so well-made and easy to use, and it saves me so much time and effort.",
    name: "Paul Smith",
    role: "Creative Director, Luminous",
    avatar:
      "https://api.builder.io/api/v1/image/assets/TEMP/8092b9ca5b7c1ff0e1a278c2bfe7a974e522cbe7?width=64",
  },
  {
    id: 3,
    quote:
      "This product does everything I hoped for and more. The design is so intuitive, and it fits seamlessly into my routine.",
    name: "Tim Williams",
    role: "Founder, Orbitc",
    avatar:
      "https://api.builder.io/api/v1/image/assets/TEMP/41633a093617490553468af1de812f325f5d4c04?width=64",
  },
  {
    id: 4,
    quote:
      "I've tried countless products over the years, but nothing comes close to this. The design is incredibly user-friendly, and it works flawlessly every time.",
    name: "James Anderson",
    role: "Founder, Aura",
    avatar:
      "https://api.builder.io/api/v1/image/assets/TEMP/02b99b273927f870819a5e48119a79cd8bc9c8a0?width=64",
  },
  {
    id: 5,
    quote:
      "It's rare to find a product that's both simple and powerful, but this one nails it. It's become an essential tool for me, and I can't imagine being without it.",
    name: "David Mitchell",
    role: "VP of Sales, ProLine",
    avatar:
      "https://api.builder.io/api/v1/image/assets/TEMP/a848e09a18fc74e0b9c30e4c413d40cc7815577e?width=64",
  },
  {
    id: 6,
    quote:
      "I'm genuinely impressed with how well this works. It's easy to integrate into my routine, and the results are consistently amazing.",
    name: "Benjamin Miller",
    role: "Product Manager, Hamilton",
    avatar:
      "https://api.builder.io/api/v1/image/assets/TEMP/32ce969409874917a42c77fd7ca5b211e1b3c9de?width=64",
  },
  {
    id: 7,
    quote:
      "I was surprised at how easy this was to set up and use. It's clearly made with the user in mind, and it performs beautifully.",
    name: "Matthew Brooks",
    role: "Co-Founder, Amsterdam",
    avatar:
      "https://api.builder.io/api/v1/image/assets/TEMP/9e168ea9ac632ced88754f200d6c77fe6a1e1aed?width=64",
  },
  {
    id: 8,
    quote:
      "This is exactly what I was looking for. It's straightforward, efficient, and beautifully designed. Highly recommend it to anyone!",
    name: "William Scott",
    role: "Head of Product, Atlantic",
    avatar:
      "https://api.builder.io/api/v1/image/assets/TEMP/76c570a3d5f2e9c879f7cbc52b82ebacea36bd8b?width=64",
  },
  {
    id: 9,
    quote:
      "This has exceeded all my expectations. It's incredibly simple to use, yet so effective, it's made my life so much easier.",
    name: "John Parker",
    role: "Marketing Director, Manila",
    avatar:
      "https://api.builder.io/api/v1/image/assets/TEMP/4672b934d99314aae802130ec53cf30b10ad9eb7?width=64",
  },
];

export function TestimonialsSection() {
  return (
    <Section className="bg-[#F6F6F8] relative overflow-hidden">
      <Container size="xl" className="relative z-10">
        <Stack spacing="xl" align="center">
          {/* Title Section */}
          <div className="text-center max-w-[600px] mx-auto">
            <Stack spacing="md" align="center">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 text-green-600 text-sm font-semibold">
                <MessageCircleHeart className="w-4 h-4" />
                <span>Testimonials</span>
              </div>

              {/* Main Heading */}
              <Text
                as="h2"
                variant="heading"
                size="3xl"
                weight="semibold"
                className="text-gray-900"
              >
                Trusted by the best in your industry
              </Text>

              {/* Subtitle */}
              <Text as="p" size="lg" tone="muted" className="text-gray-600">
                Find out why our solution is the top choice for fast-growing
                startups.
              </Text>
            </Stack>
          </div>

          {/* Testimonials Grid */}
          <div className="w-full max-w-[1081px] mx-auto relative">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {testimonials.map((testimonial) => (
                <TestimonialCard key={testimonial.id} {...testimonial} />
              ))}
            </div>

            {/* Fade Overlay */}
            <div className="absolute inset-x-0 bottom-0 h-[300px] bg-gradient-to-t from-white via-white/50 to-transparent pointer-events-none" />
          </div>

          {/* Show More Button */}
          <Button variant="outline" size="xl">
            Show more
            <Plus className="w-4 h-4" />
          </Button>
        </Stack>
      </Container>
    </Section>
  );
}

interface TestimonialCardProps {
  quote: string;
  name: string;
  role: string;
  avatar: string;
}

function TestimonialCard({ quote, name, role, avatar }: TestimonialCardProps) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-fit">
      <Stack spacing="md">
        {/* Quote */}
        <p className="text-gray-700 text-sm leading-relaxed">"{quote}"</p>

        {/* Profile */}
        <div className="flex items-center gap-3">
          <img
            src={avatar}
            alt={name}
            className="w-8 h-8 rounded-full object-cover"
          />
          <div>
            <p className="text-gray-900 text-sm font-medium">{name}</p>
            <p className="text-gray-600 text-xs">{role}</p>
          </div>
        </div>
      </Stack>
    </div>
  );
}
