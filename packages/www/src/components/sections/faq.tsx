import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@openpromo/ui/components/accordion";
import { MessageCircleQuestion } from "lucide-react";
import SectionHeader from "../elements/section-header";

const faqData = [
  {
    question: "Is there a free version?",
    answer:
      "Yes! We offer a Free Plan with essential features. You can upgrade anytime for advanced tools and integrations.",
  },
  {
    question: "What apps can I integrate?",
    answer:
      "Our platform supports integration with various popular apps and services. The specific integrations available depend on your plan level.",
  },
  {
    question: "How does the AI work?",
    answer:
      "Our AI technology uses advanced machine learning algorithms to analyze and process your data, providing intelligent insights and automation capabilities.",
  },
  {
    question: "Can I use this with a team?",
    answer:
      "Absolutely! Our platform is designed for both individual and team use. You can easily collaborate and share resources with team members.",
  },
  {
    question: "Is my data safe?",
    answer:
      "We take data security seriously. All data is encrypted and stored securely following industry best practices and compliance standards.",
  },
  {
    question: "How do I manage my subscription?",
    answer:
      "You can manage your subscription easily through your account dashboard, where you can upgrade, downgrade, or modify your plan settings.",
  },
];

const Faq = ({ withBorders = true }: { withBorders?: boolean }) => {
  return (
    <section className="">
      <div className="">
        <SectionHeader
          className={
            withBorders
              ? ""
              : "!max-w-[480px] !border-none lg:items-center lg:text-center"
          }
          iconTitle="FAQ"
          title="Everything You Need to Know"
          icon={MessageCircleQuestion}
          description={
            <>
              Looking for quick answers? Check out our{" "}
              <span className="underline">FAQ section</span>.
            </>
          }
        />
      </div>

      <div className={withBorders ? "container border-x" : "container"}>
        <div className="mx-auto max-w-3xl pb-4 pt-8 md:pb-8 lg:pb-[50px] lg:pt-[3.75rem]">
          <Accordion type="single" collapsible className="space-y-4">
            {faqData.map((item, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="text-primary rounded-[7px] border px-6 data-[state=open]:pb-2 last:border-b"
              >
                <AccordionTrigger className="py-5 text-base tracking-[-0.32px]">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-base tracking-[-0.32px]">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
      {withBorders && (
        <div className="h-8 w-full border-y md:h-12 lg:h-[112px]">
          <div className="container h-full w-full border-x"></div>
        </div>
      )}
    </section>
  );
};

export default Faq;
