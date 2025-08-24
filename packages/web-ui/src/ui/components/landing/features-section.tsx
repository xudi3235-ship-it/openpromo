import { BarChart3, Calendar, ChevronRight, Users } from "lucide-react";
import { Button } from "@/ui/components/button";
import { Typography } from "@/ui/components/typography";

const collaborationFeatures = [
  {
    title: "Invite members",
    description:
      "Share, edit, and manage projects in real-time, ensuring everyone stays aligned and productive.",
    image:
      "https://api.builder.io/api/v1/image/assets/TEMP/fd893d743b25a9824fea46056b0eb407789abf97?width=746",
    alt: "Invite members interface",
  },
  {
    title: "Edit together",
    description:
      "Work smarter with collaborative editing tools that keep everyone on the same page.",
    image:
      "https://api.builder.io/api/v1/image/assets/TEMP/435171801a0b7d07de9896fd7f65334feaf9c86b?width=746",
    alt: "Edit together interface",
  },
  {
    title: "Instant feedback",
    description:
      "Easily share thoughts, ask questions, and provide feedback directly within your files.",
    image:
      "https://api.builder.io/api/v1/image/assets/TEMP/006fb1fa2d434bfa9a17f426bc58bf1553c9c5ef?width=746",
    alt: "Instant feedback interface",
  },
];

export function FeaturesSection() {
  return (
    <section className="py-20 lg:py-32">
      {/* Seamless Collaboration */}
      <div className="mb-20 lg:mb-32">
        <div className="flex flex-col items-center text-center mb-16">
          <div className="flex items-center gap-1 mb-6">
            <Users className="w-4 h-4 text-blue-600" />
            <Typography.FeatureTag color="blue">
              Seamless collaboration
            </Typography.FeatureTag>
          </div>
          <Typography.H2 className="mb-6 max-w-2xl">
            Powering teamwork to simplify workflows
          </Typography.H2>
          <Typography.BodyLg className="max-w-2xl">
            Say goodbye to version chaos and embrace a smoother workflow
            designed to help your team achieve more, together.
          </Typography.BodyLg>
        </div>

        <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
          {collaborationFeatures.map((feature) => (
            <div key={feature.title} className="flex flex-col">
              <img
                src={feature.image}
                alt={feature.alt}
                className="w-full h-auto rounded-lg mb-6"
              />
              <Typography.H3 className="mb-2">{feature.title}</Typography.H3>
              <Typography.BodySm className="mb-4">
                {feature.description}
              </Typography.BodySm>
              <Button
                variant="ghost"
                className="justify-start px-0 text-sm font-semibold"
              >
                Learn more
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Dynamic Planner */}
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center mb-20 lg:mb-32">
        <div>
          <div className="flex items-center gap-1 mb-4">
            <Calendar className="w-4 h-4 text-orange-600" />
            <Typography.FeatureTag color="orange">
              Meaningful calendar
            </Typography.FeatureTag>
          </div>
          <Typography.H2 className="mb-6">
            Dynamic planner that keeps you ahead
          </Typography.H2>
          <Typography.BodyLg className="mb-10">
            Stay one step ahead with a calendar that grows with your schedule.
            Adapt quickly to changes, manage priorities effectively, and achieve
            your goals with ease.
          </Typography.BodyLg>
          <Button variant="secondary" size="lg">
            Learn more
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="order-first lg:order-last">
          <img
            src="https://api.builder.io/api/v1/image/assets/TEMP/2e77ca64962f468b6348ac2fe2cebad270e2b573?width=904"
            alt="Dynamic calendar interface"
            className="w-full h-auto rounded-2xl"
          />
        </div>
      </div>

      {/* Analytics */}
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <div>
          <img
            src="https://api.builder.io/api/v1/image/assets/TEMP/27b1ce9a10c182a02edc25b8120aa962196d752e?width=904"
            alt="Analytics dashboard interface"
            className="w-full h-auto rounded-2xl"
          />
        </div>
        <div>
          <div className="flex items-center gap-1 mb-4">
            <BarChart3 className="w-4 h-4 text-purple-600" />
            <Typography.FeatureTag color="purple">
              Insightful analytics
            </Typography.FeatureTag>
          </div>
          <Typography.H2 className="mb-6">
            Analytics that power smarter decisions
          </Typography.H2>
          <Typography.BodyLg className="mb-10">
            Our cutting-edge analytics deliver detailed trends, patterns, and
            actionable intelligence to help you make informed decisions and stay
            ahead of the competition.
          </Typography.BodyLg>
          <Button variant="secondary" size="lg">
            Learn more
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
