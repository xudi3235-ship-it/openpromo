import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import dashboardPreview from "@/assets/dashboard.svg";
import { Container, Section } from "@/components/_layout";
import { CompaniesMarquee } from "@/components/animations/companies-marquee";
import { Typography } from "@/components/ui/typography";

export function DashboardPreviewSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <Section spacing="lg">
      <Container size="xl">
        <motion.div
          ref={ref}
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.6, staggerChildren: 0.3 }}
          className="space-y-12"
        >
          {/* Dashboard Image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={
              isInView
                ? { opacity: 1, scale: 1, y: 0 }
                : { opacity: 0, scale: 0.9, y: 40 }
            }
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative"
          >
            <div className="relative overflow-hidden rounded-lg  ">
              <img
                src={dashboardPreview}
                alt="Dashboard Preview"
                className="w-full h-auto aspect-[1000/726]"
              />
            </div>
          </motion.div>

          {/* Companies Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="space-y-8"
          >
            {/* Trusted by text */}
            <div className="text-center">
              <Typography.BodySm className="text-gray-500">
                Trusted by the world leaders
              </Typography.BodySm>
            </div>

            {/* Companies Marquee */}
            <div className="py-4">
              <CompaniesMarquee />
            </div>
          </motion.div>
        </motion.div>
      </Container>
    </Section>
  );
}
