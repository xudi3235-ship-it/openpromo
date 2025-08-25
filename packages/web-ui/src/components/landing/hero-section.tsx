import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { Center, Container, Section } from "@/components/_layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";

interface HeroSectionProps {
  onGetStartedClick: () => void;
}

export function HeroSection({ onGetStartedClick }: HeroSectionProps) {
  const titleText = "The most powerful business platform.";
  const words = titleText.split(" ");

  return (
    <Section spacing="md">
      <Container size="xl">
        <Center direction="both">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              duration: 0.6,
              staggerChildren: 0.2,
              delayChildren: 0.1,
            }}
            className="flex flex-col items-center text-center space-y-8"
          >
            {/* Announcement Pill */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
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
            </motion.div>

            {/* Main Content */}
            <div className="max-w-4xl space-y-6">
              {/* Animated Title */}
              <div className="text-center">
                <Typography.H1 className="inline">
                  {words.map((word, index) => (
                    <motion.span
                      key={`word-${word}-${index}-${Date.now()}`}
                      initial={{ opacity: 0, filter: "blur(4px)", y: 10 }}
                      animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                      transition={{
                        duration: 0.5,
                        delay: 0.3 + index * 0.08,
                      }}
                      className="inline-block mr-3 last:mr-0"
                    >
                      {word}
                    </motion.span>
                  ))}
                </Typography.H1>
              </div>

              {/* Animated Description */}
              <motion.div
                initial={{ opacity: 0, filter: "blur(4px)", y: 10 }}
                animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                <Typography.BodyLg className="max-w-2xl mx-auto">
                  Unlock the potential of your business with our next-level SaaS
                  platform. Transform your workflows and achieve new heights
                  today.
                </Typography.BodyLg>
              </motion.div>
            </div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="flex flex-col sm:flex-row items-center gap-4"
            >
              <Button onClick={onGetStartedClick} variant="primary" size="xl">
                Get started
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button variant="secondary" size="xl">
                Learn more
                <ChevronRight className="w-4 h-4" />
              </Button>
            </motion.div>
          </motion.div>
        </Center>
      </Container>
    </Section>
  );
}
