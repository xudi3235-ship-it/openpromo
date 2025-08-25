import { Check, ChevronRight } from "lucide-react";
import { Container, Section, Stack } from "@/components/_layout";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import { login } from "@/lib/auth";

const comparisonData = {
  plans: [
    {
      name: "Free",
      price: "$0",
      period: "/mo",
      buttonText: "Get started",
      buttonVariant: "outline" as const,
    },
    {
      name: "Basic",
      price: "$19",
      period: "/mo",
      buttonText: "Get started",
      buttonVariant: "primary" as const,
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      buttonText: "Talk to sales",
      buttonVariant: "outline" as const,
    },
  ],
  sections: [
    {
      title: "Core features",
      features: [
        {
          name: "Advanced analytics",
          free: true,
          basic: true,
          enterprise: true,
        },
        {
          name: "Custom branding",
          free: true,
          basic: true,
          enterprise: true,
        },
        {
          name: "Storage integrations",
          free: true,
          basic: true,
          enterprise: true,
        },
        {
          name: "AI assistant",
          free: false,
          basic: true,
          enterprise: true,
        },
        {
          name: "Automated reports",
          free: false,
          basic: false,
          enterprise: true,
        },
      ],
    },
    {
      title: "Collaboration",
      features: [
        {
          name: "Team members",
          free: "1 user",
          basic: "5 users",
          enterprise: "Unlimited",
        },
        {
          name: "User roles and permissions",
          free: false,
          basic: true,
          enterprise: true,
        },
        {
          name: "Guest accounts",
          free: false,
          basic: false,
          enterprise: true,
        },
      ],
    },
    {
      title: "Support",
      features: [
        {
          name: "Advanced analytics",
          free: true,
          basic: true,
          enterprise: true,
        },
        {
          name: "Onboarding support",
          free: false,
          basic: true,
          enterprise: true,
        },
        {
          name: "Dedicated account manager",
          free: false,
          basic: false,
          enterprise: true,
        },
      ],
    },
  ],
};

export function ComparisonSection() {
  const handleGetStarted = () => {
    login("/workspaces");
  };

  return (
    <Section className="py-16 bg-white">
      <Container size="xl">
        <Stack spacing="xl" align="center">
          {/* Header */}
          <div className="text-center max-w-[600px] mx-auto">
            <Stack spacing="md" align="center">
              <Typography.H1 className="text-[48px] font-semibold text-[var(--neutral-900)]">
                Compare plans
              </Typography.H1>
              <Typography.BodyLg className="text-[var(--neutral-600)] leading-6">
                Get an overview of what is included.
              </Typography.BodyLg>
            </Stack>
          </div>

          {/* Plans Header with Buttons */}
          <div className="w-full max-w-[742px] mx-auto">
            <div className="grid grid-cols-3 gap-8 items-end mb-8">
              {comparisonData.plans.map((plan) => (
                <div key={plan.name} className="text-center">
                  <Stack spacing="sm" align="center">
                    <Typography.H3 className="text-[21px] font-medium text-[var(--neutral-900)] leading-8">
                      {plan.name}
                    </Typography.H3>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-[18px] font-medium text-[var(--neutral-900)] leading-7">
                        {plan.price}
                      </span>
                      {plan.period && (
                        <span className="text-[var(--neutral-600)] text-base font-medium">
                          {plan.period}
                        </span>
                      )}
                    </div>
                    <Button
                      onClick={handleGetStarted}
                      variant={plan.buttonVariant}
                      className={`${
                        plan.buttonVariant === "primary"
                          ? "bg-gradient-to-b from-[#1E1E28] to-[#141317] border border-[#333335] text-white hover:opacity-90"
                          : "border border-[var(--neutral-200)] bg-white text-[var(--neutral-900)] hover:bg-gray-50"
                      } font-semibold px-5 pr-4 h-[44px] rounded-xl`}
                    >
                      {plan.buttonText}
                      <ChevronRight
                        className={`w-4 h-4 ${
                          plan.buttonVariant === "primary"
                            ? "text-white"
                            : "text-[var(--neutral-900)]"
                        }`}
                      />
                    </Button>
                  </Stack>
                </div>
              ))}
            </div>
          </div>

          {/* Comparison Table */}
          <div className="w-full max-w-[1200px]">
            <Stack spacing="xl">
              {comparisonData.sections.map((section) => (
                <div key={section.title} className="w-full">
                  {/* Section Title */}
                  <div className="mb-6">
                    <Typography.H3 className="text-sm font-semibold text-[var(--neutral-900)] leading-[21px]">
                      {section.title}
                    </Typography.H3>
                  </div>

                  {/* Features Table */}
                  <div className="overflow-hidden">
                    {section.features.map((feature, index) => (
                      <div
                        key={feature.name}
                        className={`grid grid-cols-[300px_1fr_1fr_1fr] items-center ${
                          index !== section.features.length - 1
                            ? "border-b border-[var(--neutral-200)]"
                            : ""
                        }`}
                      >
                        {/* Feature Name */}
                        <div className="text-[var(--neutral-900)] text-sm leading-[21px] py-4 px-6 border-r border-[var(--neutral-200)]">
                          {feature.name}
                        </div>

                        {/* Free Plan */}
                        <div className="flex justify-center py-4 px-6 border-r border-[var(--neutral-200)]">
                          {typeof feature.free === "boolean" ? (
                            feature.free ? (
                              <Check className="w-4 h-4 text-[var(--neutral-900)]" />
                            ) : (
                              <span className="text-[var(--neutral-900)] text-sm">
                                -
                              </span>
                            )
                          ) : (
                            <span className="text-[var(--neutral-900)] text-sm text-center">
                              {feature.free}
                            </span>
                          )}
                        </div>

                        {/* Basic Plan */}
                        <div className="flex justify-center py-4 px-6 border-r border-[var(--neutral-200)]">
                          {typeof feature.basic === "boolean" ? (
                            feature.basic ? (
                              <Check className="w-4 h-4 text-[var(--neutral-900)]" />
                            ) : (
                              <span className="text-[var(--neutral-900)] text-sm">
                                -
                              </span>
                            )
                          ) : (
                            <span className="text-[var(--neutral-900)] text-sm text-center">
                              {feature.basic}
                            </span>
                          )}
                        </div>

                        {/* Enterprise Plan */}
                        <div className="flex justify-center py-4 px-6">
                          {typeof feature.enterprise === "boolean" ? (
                            feature.enterprise ? (
                              <Check className="w-4 h-4 text-[var(--neutral-900)]" />
                            ) : (
                              <span className="text-[var(--neutral-900)] text-sm">
                                -
                              </span>
                            )
                          ) : (
                            <span className="text-[var(--neutral-900)] text-sm text-center">
                              {feature.enterprise}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </Stack>
          </div>
        </Stack>
      </Container>
    </Section>
  );
}
