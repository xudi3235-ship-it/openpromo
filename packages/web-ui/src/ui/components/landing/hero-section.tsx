import { ChevronRight } from "lucide-react";
import { Badge } from "@/ui/components/badge";
import { Button } from "@/ui/components/button";
import { Center, Container, Section, Stack } from "@/ui/components/layout";
import { Typography } from "@/ui/components/typography";

interface HeroSectionProps {
  onGetStartedClick: () => void;
}

export function HeroSection({ onGetStartedClick }: HeroSectionProps) {
  return (
    <Section spacing="lg">
      <Container size="xl">
        <Center direction="both">
          <Stack spacing="3xl" align="center" className="text-center">
            {/* Announcement Pill */}
            <Badge variant="announcement">
              <Badge variant="announcement-pill">
                <Typography.AnnouncementBadge color="green">
                  NEW
                </Typography.AnnouncementBadge>
              </Badge>
              <Typography.Announcement>
                Announcing API 2.0
              </Typography.Announcement>
            </Badge>

            {/* Main Content */}
            <Stack spacing="xl" align="center" className="max-w-4xl">
              <Typography.H1>
                The most powerful business platform.
              </Typography.H1>
              <Typography.BodyLg className="max-w-2xl">
                Unlock the potential of your business with our next-level SaaS
                platform. Transform your workflows and achieve new heights
                today.
              </Typography.BodyLg>
            </Stack>

            {/* CTA Buttons */}
            <Stack
              direction="row"
              spacing="md"
              align="center"
              className="flex-col sm:flex-row"
            >
              <Button onClick={onGetStartedClick} variant="primary" size="xl">
                Get started
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button variant="secondary" size="xl">
                Learn more
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Stack>
          </Stack>
        </Center>
      </Container>
    </Section>
  );
}
