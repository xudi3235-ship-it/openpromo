import { ChevronRight } from "lucide-react";
import { Badge } from "@/ui/components/badge";
import { Button } from "@/ui/components/button";
import { Typography } from "@/ui/components/typography";

interface HeroSectionProps {
  onGetStartedClick: () => void;
}

export function HeroSection({ onGetStartedClick }: HeroSectionProps) {
  return (
    <section className="flex flex-col items-center text-center pt-16 pb-20 lg:pt-24 lg:pb-32">
      {/* Announcement Pill */}
      <Badge variant="announcement" className="mb-14">
        <Badge variant="announcement-pill">
          <Typography.AnnouncementBadge color="green">
            NEW
          </Typography.AnnouncementBadge>
        </Badge>
        <Typography.Announcement>Announcing API 2.0</Typography.Announcement>
      </Badge>

      {/* Main Content */}
      <div className="max-w-4xl mb-11">
        <Typography.H1 className="mb-6">
          The most powerful business platform.
        </Typography.H1>
        <Typography.BodyLg className="max-w-2xl mx-auto">
          Unlock the potential of your business with our next-level SaaS
          platform. Transform your workflows and achieve new heights today.
        </Typography.BodyLg>
      </div>

      {/* CTA Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <Button onClick={onGetStartedClick} variant="primary" size="xl">
          Get started
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button variant="secondary" size="xl">
          Learn more
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </section>
  );
}
