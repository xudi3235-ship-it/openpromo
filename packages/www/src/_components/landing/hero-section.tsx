import { Badge } from "@openpromo/ui/components/badge";
import { Button } from "@openpromo/ui/components/button";
import { Text } from "@openpromo/ui/components/typography";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { Center, Container, Section } from "../_layout";

interface HeroSectionProps {
  dashboardUrl: string;
}

export function HeroSection({ dashboardUrl }: HeroSectionProps) {
  const titleText = "The most powerful business platform.";
  const words = titleText.split(" ");

  return (
    <Section spacing="sm">
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
                <Badge variant="announcement-pill" className="bg-green-50">
                  <Text as="span" size="xs" weight="bold" transform="uppercase">
                    NEW
                  </Text>
                </Badge>
                <Text as="span" size="sm" weight="medium">
                  Announcing API 2.0
                </Text>
              </Badge>
            </motion.div>

            {/* Main Content */}
            <div className="max-w-4xl space-y-6">
              {/* Animated Title */}
              <div className="text-center">
                <Text
                  as="h1"
                  variant="heading"
                  size="4xl"
                  weight="bold"
                  className="inline tracking-tight"
                >
                  {words.map((word, index) => (
                    <motion.span
                      key={`word-${word}-${index}-${Date.now()}`}
                      initial={{ opacity: 0, filter: "blur(4px)", y: 10 }}
                      animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                      transition={{ duration: 0.5, delay: 0.3 + index * 0.08 }}
                      className="inline-block mr-3 last:mr-0"
                    >
                      {word}
                    </motion.span>
                  ))}
                </Text>
              </div>

              {/* Animated Description */}
              <motion.div
                initial={{ opacity: 0, filter: "blur(4px)", y: 10 }}
                animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                <Text
                  as="p"
                  size="lg"
                  tone="muted"
                  className="max-w-2xl mx-auto"
                >
                  Unlock the potential of your business with our next-level SaaS
                  platform. Transform your workflows and achieve new heights
                  today.
                </Text>
              </motion.div>
            </div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="flex flex-col sm:flex-row items-center gap-4"
            >
              <Button asChild variant="default" size="xl">
                <a href={dashboardUrl}>
                  Get started
                  <ChevronRight className="w-4 h-4" />
                </a>
              </Button>
              <Button variant="outline" size="xl">
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
