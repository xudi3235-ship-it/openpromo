import { Check, ChevronRight, Flame } from "lucide-react";
import { useState } from "react";
import { Container, Section, Stack } from "@/components/_layout";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import { login } from "@/lib/auth";

const pricingPlans = [
  {
    id: "free",
    name: "Free",
    description: "Get started for free with essential features and resources.",
    price: "$0",
    period: "/mo",
    billingNote: "Free for everyone",
    features: ["Advanced analytics", "Custom branding", "Storage integrations"],
    buttonText: "Get started",
    buttonVariant: "outline" as const,
    popular: false,
  },
  {
    id: "basic",
    name: "Basic",
    description:
      "For growing businesses, expanding companies, and ambitious startups.",
    price: "$19",
    period: "/mo",
    billingNote: "Billed monthly",
    features: [
      "Advanced analytics",
      "Custom branding",
      "Storage integrations",
      "AI assistant",
      "Automated reports",
    ],
    buttonText: "Get started",
    buttonVariant: "default" as const,
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description:
      "For large enterprises with specialized requirements and custom solutions.",
    price: "Custom",
    period: "",
    billingNote: "Yearly billing only",
    features: [
      "Advanced analytics",
      "Custom branding",
      "Storage integrations",
      "AI assistant",
      "Automated reports",
    ],
    buttonText: "Talk to sales",
    buttonVariant: "outline" as const,
    popular: false,
  },
];

export function PricingSection() {
  const [isYearly, setIsYearly] = useState(false);

  const handleGetStarted = () => {
    login("/workspaces");
  };

  return (
    <Section className="pt-16 pb-24">
      <Container size="xl">
        <Stack spacing="xl" align="center">
          {/* Header */}
          <div className="text-center max-w-[600px] mx-auto">
            <Stack spacing="lg" align="center">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 text-[var(--green-text)] text-sm font-semibold">
                {/** biome-ignore lint/a11y/noSvgWithoutTitle: TODO */}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 17 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <g clipPath="url(#clip0_1792_6357)">
                    <path
                      d="M2.5 8C2.5 8.78793 2.65519 9.56815 2.95672 10.2961C3.25825 11.0241 3.70021 11.6855 4.25736 12.2426C4.81451 12.7998 5.47595 13.2417 6.2039 13.5433C6.93185 13.8448 7.71207 14 8.5 14C9.28793 14 10.0681 13.8448 10.7961 13.5433C11.5241 13.2417 12.1855 12.7998 12.7426 12.2426C13.2998 11.6855 13.7417 11.0241 14.0433 10.2961C14.3448 9.56815 14.5 8.78793 14.5 8C14.5 7.21207 14.3448 6.43185 14.0433 5.7039C13.7417 4.97595 13.2998 4.31451 12.7426 3.75736C12.1855 3.20021 11.5241 2.75825 10.7961 2.45672C10.0681 2.15519 9.28793 2 8.5 2C7.71207 2 6.93185 2.15519 6.2039 2.45672C5.47595 2.75825 4.81451 3.20021 4.25736 3.75736C3.70021 4.31451 3.25825 4.97595 2.95672 5.7039C2.65519 6.43185 2.5 7.21207 2.5 8Z"
                      stroke="#2D6E16"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M10.5 6H7.5C7.23478 6 6.98043 6.10536 6.79289 6.29289C6.60536 6.48043 6.5 6.73478 6.5 7C6.5 7.26522 6.60536 7.51957 6.79289 7.70711C6.98043 7.89464 7.23478 8 7.5 8H9.5C9.76522 8 10.0196 8.10536 10.2071 8.29289C10.3946 8.48043 10.5 8.73478 10.5 9C10.5 9.26522 10.3946 9.51957 10.2071 9.70711C10.0196 9.89464 9.76522 10 9.5 10H6.5"
                      stroke="#2D6E16"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M8.5 4.66666V5.99999"
                      stroke="#2D6E16"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M8.5 10V11.3333"
                      stroke="#2D6E16"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                  <defs>
                    <clipPath id="clip0_1792_6357">
                      <rect
                        width="16"
                        height="16"
                        fill="white"
                        transform="translate(0.5)"
                      />
                    </clipPath>
                  </defs>
                </svg>
                <span>Pricing</span>
              </div>

              {/* Main Heading */}
              <Typography.Display className="text-[var(--neutral-900)]">
                Choose a plan that's right for you.
              </Typography.Display>

              {/* Subtitle */}
              <Typography.BodyLg className="text-[var(--neutral-600)] leading-6">
                No hidden fees. No stress. Built with ease and transparency.
              </Typography.BodyLg>
            </Stack>

            {/* Billing Toggle */}
            <div className="mt-12 relative">
              <div className="flex items-center justify-center bg-white border border-[var(--neutral-200)] rounded-full p-1 w-fit mx-auto">
                <Button
                  onClick={() => setIsYearly(false)}
                  variant="ghost"
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                    !isYearly
                      ? "bg-white border border-[var(--neutral-200)] text-[var(--neutral-900)] shadow-sm"
                      : "text-[var(--neutral-600)] hover:bg-gray-50"
                  }`}
                >
                  Monthly
                </Button>
                <div className="relative">
                  <DiscountBadge />
                  <Button
                    onClick={() => setIsYearly(true)}
                    variant="ghost"
                    className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                      isYearly
                        ? "bg-white border border-[var(--neutral-200)] text-[var(--neutral-900)] shadow-sm"
                        : "text-[var(--neutral-600)] hover:bg-gray-50"
                    }`}
                  >
                    Yearly
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-[1200px]">
            {pricingPlans.map((plan) => (
              <PricingCard
                key={plan.id}
                plan={plan}
                isYearly={isYearly}
                onGetStarted={handleGetStarted}
              />
            ))}
          </div>

          {/* Companies Section */}
          <div className="mt-16 w-full text-center">
            <p className="text-[var(--neutral-600)] text-base font-medium mb-8">
              Trusted by the best teams
            </p>
            <img
              src="https://api.builder.io/api/v1/image/assets/TEMP/aabcff16b2a9de6a26b4f723e0e58e6bb7732da4?width=1494"
              alt="Company logos"
              className="mx-auto max-w-full h-auto"
            />
          </div>
        </Stack>
      </Container>
    </Section>
  );
}

function DiscountBadge() {
  return (
    <div className="absolute -top-5 -right-0.5 bg-[var(--green-fill)] border border-[var(--green-stroke)] text-[var(--green-text)] px-2 py-1 rounded-full text-xs font-semibold">
      -20%
    </div>
  );
}

interface PricingCardProps {
  plan: (typeof pricingPlans)[0];
  isYearly: boolean;
  onGetStarted: () => void;
}

function PricingCard({ plan, isYearly, onGetStarted }: PricingCardProps) {
  const displayPrice = plan.id === "basic" && isYearly ? "$15" : plan.price;

  return (
    <div className="bg-white rounded-2xl p-10 shadow-sm border border-gray-100 relative h-[548px] flex flex-col">
      {/* Header */}
      <div className="space-y-4 mb-8">
        <div className="flex items-start justify-between">
          <Typography.H3 className="text-[28px] font-medium text-[var(--neutral-900)] leading-[40px]">
            {plan.name}
          </Typography.H3>
          {plan.popular && (
            <div className="flex items-center gap-1 bg-[#F6F2EA] border border-[#DCCEBC] text-[#6E6416] px-2 py-1 rounded-full text-xs font-semibold mt-1">
              <Flame className="w-4 h-4" />
              Popular
            </div>
          )}
        </div>

        <p className="text-[var(--neutral-600)] text-[15px] leading-[21px]">
          {plan.description}
        </p>
      </div>

      {/* Price */}
      <div className="space-y-1 mb-6">
        <div className="flex items-baseline gap-1">
          <span className="text-[24px] font-medium text-[var(--neutral-900)] leading-[36px]">
            {displayPrice}
          </span>
          {plan.period && (
            <span className="text-[var(--neutral-600)] text-[15px] font-medium">
              {plan.period}
            </span>
          )}
        </div>
        <p className="text-[var(--neutral-900)] text-[15px] leading-[21px]">
          {plan.billingNote}
        </p>
      </div>

      {/* Divider */}
      <div className="border-t border-[var(--neutral-200)] mb-8" />

      {/* Features */}
      <div className="space-y-2 flex-1 mb-8">
        {plan.features.map((feature) => (
          <div key={feature} className="flex items-center gap-2">
            <Check className="w-4 h-4 text-[var(--neutral-900)] flex-shrink-0" />
            <span className="text-[var(--neutral-900)] text-[15px] leading-[21px]">
              {feature}
            </span>
          </div>
        ))}
      </div>

      {/* Button */}
      <Button onClick={onGetStarted} variant={plan.buttonVariant}>
        {plan.buttonText}
        <ChevronRight />
      </Button>
    </div>
  );
}
