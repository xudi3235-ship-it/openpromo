import { Button } from "@openpromo/ui/components/button";
import { Typography } from "@openpromo/ui/components/typography";
import { BarChart3, Calendar, ChevronRight, Users } from "lucide-react";
import { Container, Grid, Section, Stack } from "../_layout";

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
    <Section spacing="lg">
      <Container size="xl">
        <Stack spacing="3xl">
          {/* Seamless Collaboration */}
          <Stack spacing="2xl">
            <Stack spacing="xl" align="center" className="text-center">
              <Stack direction="row" spacing="xs" align="center">
                <Users className="w-4 h-4 text-blue-600" />
                <Typography.FeatureTag color="blue">
                  Seamless collaboration
                </Typography.FeatureTag>
              </Stack>
              <Typography.H1 className="max-w-2xl">
                Powering teamwork to simplify workflows
              </Typography.H1>
              <Typography.BodyLg className="max-w-2xl">
                Say goodbye to version chaos and embrace a smoother workflow
                designed to help your team achieve more, together.
              </Typography.BodyLg>
            </Stack>

            <Grid cols={3} responsive="md" gap="xl">
              {collaborationFeatures.map((feature) => (
                <Stack key={feature.title} spacing="lg">
                  <img
                    src={feature.image}
                    alt={feature.alt}
                    className="w-full h-auto rounded-lg"
                  />
                  <Stack spacing="md">
                    <Typography.H3>{feature.title}</Typography.H3>
                    <Typography.BodySm>{feature.description}</Typography.BodySm>
                    <Button
                      variant="ghost"
                      className="justify-start px-0 text-sm font-semibold self-start"
                    >
                      Learn more
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </Stack>
                </Stack>
              ))}
            </Grid>
          </Stack>

          {/* Dynamic Planner */}
          <Grid
            cols={1}
            responsive="lg"
            gap="2xl"
            align="center"
            className="lg:grid-cols-2"
          >
            <Stack spacing="xl">
              <Stack direction="row" spacing="xs" align="center">
                <Calendar className="w-4 h-4 text-orange-600" />
                <Typography.FeatureTag color="orange">
                  Meaningful calendar
                </Typography.FeatureTag>
              </Stack>
              <Typography.H1>
                Dynamic planner that keeps you ahead
              </Typography.H1>
              <Typography.BodyLg>
                Stay one step ahead with a calendar that grows with your
                schedule. Adapt quickly to changes, manage priorities
                effectively, and achieve your goals with ease.
              </Typography.BodyLg>
              <Button variant="secondary" size="lg" className="self-start">
                Learn more
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Stack>
            <div className="order-first lg:order-last">
              <img
                src="https://api.builder.io/api/v1/image/assets/TEMP/2e77ca64962f468b6348ac2fe2cebad270e2b573?width=904"
                alt="Dynamic calendar interface"
                className="w-full h-auto rounded-2xl"
              />
            </div>
          </Grid>

          {/* Analytics */}
          <Grid
            cols={1}
            responsive="lg"
            gap="2xl"
            align="center"
            className="lg:grid-cols-2"
          >
            <div>
              <img
                src="https://api.builder.io/api/v1/image/assets/TEMP/27b1ce9a10c182a02edc25b8120aa962196d752e?width=904"
                alt="Analytics dashboard interface"
                className="w-full h-auto rounded-2xl"
              />
            </div>
            <Stack spacing="xl">
              <Stack direction="row" spacing="xs" align="center">
                <BarChart3 className="w-4 h-4 text-purple-600" />
                <Typography.FeatureTag color="purple">
                  Insightful analytics
                </Typography.FeatureTag>
              </Stack>
              <Typography.H1>
                Analytics that power smarter decisions
              </Typography.H1>
              <Typography.BodyLg>
                Our cutting-edge analytics deliver detailed trends, patterns,
                and actionable intelligence to help you make informed decisions
                and stay ahead of the competition.
              </Typography.BodyLg>
              <Button variant="outline" size="lg" className="self-start">
                Learn more
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Stack>
          </Grid>
        </Stack>
      </Container>
    </Section>
  );
}
