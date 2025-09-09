import { ChevronRight, HelpCircle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/accordion";
import { Button } from "@/components/button";
import { Typography } from "@/components/typography";
import { Container, Section, Stack } from "../_layout";

const faqItems = [
  {
    id: "data-safety",
    question: "Is my data safe with your platform?",
    answer:
      "Yes, your data is completely secure with us. We use industry-standard encryption, secure data centers, and follow strict privacy protocols to protect your information.",
  },
  {
    id: "customer-support",
    question: "What kind of customer support do you offer?",
    answer:
      "We provide 24/7 customer support through multiple channels including live chat, email, and phone. Our dedicated support team is always ready to help you with any questions or issues.",
  },
  {
    id: "pricing-model",
    question: "How does the pricing for your web solution work?",
    answer:
      "Our pricing is transparent and scalable. We offer various plans based on your usage needs, from starter plans for small teams to enterprise solutions for large organizations.",
  },
  {
    id: "subscription-cancellation",
    question: "Can I cancel my subscription at any time?",
    answer:
      "Absolutely! You can cancel your subscription at any time without any hidden fees or penalties. Your account will remain active until the end of your current billing period.",
  },
  {
    id: "plan-changes",
    question: "Can I upgrade or downgrade my subscription plan?",
    answer:
      "Yes, you can easily upgrade or downgrade your plan at any time from your account settings. Changes take effect immediately, and billing is prorated accordingly.",
  },
];

export function FaqSection() {
  return (
    <Section spacing="xl" className="bg-white">
      <Container size="md" className="max-w-[667px]">
        <Stack spacing="xl" align="center">
          {/* Title Section */}
          <div className="text-center max-w-[385px] mx-auto">
            <Stack spacing="lg" align="center">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 text-green-600 text-sm font-semibold">
                <HelpCircle className="w-4 h-4" />
                <span>FAQ</span>
              </div>

              {/* Main Heading */}
              <Typography.Hero className="max-w-[385px]">
                In case you missed anything
              </Typography.Hero>

              {/* Subtitle */}
              <Typography.BodyLg className="leading-6">
                We're here to answer all your questions.
              </Typography.BodyLg>
            </Stack>

            {/* Contact Support Button */}
            <div className="mt-12">
              <Button variant="outline" size="xl">
                Contact support
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* FAQ Accordion */}
          <div className="w-full">
            <Accordion type="single" collapsible className="w-full">
              {/* Top border */}
              <div className="border-t border-gray-200" />

              {faqItems.map((item, _) => (
                <AccordionItem
                  key={item.id}
                  value={item.id}
                  className="border-b border-gray-200 last:border-b"
                >
                  <AccordionTrigger className="flex justify-between items-center w-full py-6 hover:no-underline group [&>svg]:hidden">
                    <span className="text-gray-900 text-[15px] font-medium text-left flex-1">
                      {item.question}
                    </span>
                    <div className="ml-4 relative w-[15px] h-[15px] flex-shrink-0">
                      {/* Custom Plus Icon matching Figma */}
                      <div className="absolute inset-0 transition-transform duration-200 group-data-[state=open]:rotate-45">
                        <div className="absolute left-[7px] top-[2px] w-[2px] h-[11px] bg-[#B5BDC5] rounded-full" />
                        <div className="absolute left-[2px] top-[7px] w-[11px] h-[2px] bg-[#B5BDC5] rounded-full" />
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-0 pb-6">
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {item.answer}
                    </p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </Stack>
      </Container>
    </Section>
  );
}
