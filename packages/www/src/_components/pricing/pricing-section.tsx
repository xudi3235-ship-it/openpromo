import { Badge } from "@openpromo/ui/components/badge";
import { Button } from "@openpromo/ui/components/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@openpromo/ui/components/card";
import { Text } from "@openpromo/ui/components/typography";
import { Check, ChevronRight, Sparkles, Zap } from "lucide-react";
import { useState } from "react";
import { Container, Section } from "../_layout";

const pricingPlans = [
  {
    id: "starter",
    name: "Starter",
    description: "Perfect for individuals and small teams getting started.",
    price: "$0",
    yearlyPrice: "$0",
    period: "/month",
    billingNote: "Free forever",
    features: [
      "Up to 3 social accounts",
      "Basic analytics",
      "5 scheduled posts/month",
      "Standard templates",
      "Email support",
    ],
    buttonText: "Start free",
    buttonVariant: "outline" as const,
    popular: false,
    icon: Sparkles,
  },
  {
    id: "pro",
    name: "Pro",
    description: "For growing businesses that need more power and flexibility.",
    price: "$29",
    yearlyPrice: "$24",
    period: "/month",
    billingNote: "Most popular plan",
    features: [
      "Unlimited social accounts",
      "Advanced analytics & insights",
      "Unlimited scheduled posts",
      "AI-powered content suggestions",
      "Custom branding",
      "Priority support",
      "Team collaboration",
    ],
    buttonText: "Start 14-day trial",
    buttonVariant: "default" as const,
    popular: true,
    icon: Zap,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description:
      "For large organizations with custom needs and dedicated support.",
    price: "Custom",
    yearlyPrice: "Custom",
    period: "",
    billingNote: "Contact us for pricing",
    features: [
      "Everything in Pro",
      "Custom integrations",
      "Dedicated account manager",
      "Advanced security & compliance",
      "Custom onboarding",
      "24/7 phone support",
      "SLA guarantee",
    ],
    buttonText: "Contact sales",
    buttonVariant: "outline" as const,
    popular: false,
    icon: null,
  },
];

interface PricingSectionProps {
  dashboardUrl: string;
}

export function PricingSection({ dashboardUrl }: PricingSectionProps) {
  const [isYearly, setIsYearly] = useState(false);

  return (
    <Section className="py-24">
      <Container size="xl">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="announcement" className="mb-6">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">Pricing</span>
          </Badge>

          <Text
            as="h1"
            variant="heading"
            size="4xl"
            weight="bold"
            className="mb-6 tracking-tight"
          >
            Simple, transparent pricing
          </Text>

          <Text as="p" size="lg" tone="muted" className="mb-8 leading-7">
            Choose the perfect plan for your business. Start free, upgrade when
            you're ready.
          </Text>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-1 p-1 bg-muted rounded-lg">
            <Button
              variant={!isYearly ? "default" : "ghost"}
              size="sm"
              onClick={() => setIsYearly(false)}
              className="relative"
            >
              Monthly
            </Button>
            <Button
              variant={isYearly ? "default" : "ghost"}
              size="sm"
              onClick={() => setIsYearly(true)}
              className="relative"
            >
              Yearly
              {isYearly && (
                <Badge
                  variant="success"
                  className="absolute -top-2 -right-2 px-1.5 py-0.5 text-xs"
                >
                  Save 20%
                </Badge>
              )}
            </Button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {pricingPlans.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              isYearly={isYearly}
              dashboardUrl={dashboardUrl}
            />
          ))}
        </div>

        {/* Trust Section */}
        <div className="text-center mt-20">
          <Text as="p" size="sm" tone="muted" className="mb-8">
            Trusted by teams at companies like
          </Text>
          <div className="flex justify-center items-center gap-8 opacity-60">
            {/* Placeholder for company logos */}
            <div className="h-8 w-20 bg-muted rounded" />
            <div className="h-8 w-24 bg-muted rounded" />
            <div className="h-8 w-16 bg-muted rounded" />
            <div className="h-8 w-28 bg-muted rounded" />
            <div className="h-8 w-20 bg-muted rounded" />
          </div>
        </div>
      </Container>
    </Section>
  );
}

interface PricingCardProps {
  plan: (typeof pricingPlans)[0];
  isYearly: boolean;
  dashboardUrl: string;
}

function PricingCard({ plan, isYearly, dashboardUrl }: PricingCardProps) {
  const displayPrice =
    isYearly && plan.yearlyPrice !== plan.price ? plan.yearlyPrice : plan.price;

  const isCustom = plan.price === "Custom";
  const isPro = plan.id === "pro";

  return (
    <Card
      className={`relative transition-all duration-300 hover:shadow-lg ${
        isPro ? "ring-2 ring-primary/20 scale-105" : ""
      }`}
    >
      {plan.popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <Badge variant="default" className="shadow-lg">
            <Sparkles className="h-3 w-3" />
            Most Popular
          </Badge>
        </div>
      )}

      <CardHeader className="text-center pb-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          {plan.icon && <plan.icon className="h-6 w-6 text-primary" />}
          <Text as="h3" variant="heading" size="2xl" weight="semibold">
            {plan.name}
          </Text>
        </div>

        <Text as="p" size="sm" tone="muted">
          {plan.description}
        </Text>
      </CardHeader>

      <CardContent className="text-center pb-8">
        {/* Price */}
        <div className="mb-6">
          {!isCustom ? (
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-4xl font-bold">{displayPrice}</span>
              {plan.period && (
                <span className="text-muted-foreground">{plan.period}</span>
              )}
            </div>
          ) : (
            <div className="text-2xl font-semibold text-muted-foreground">
              Custom pricing
            </div>
          )}

          {isYearly && !isCustom && plan.yearlyPrice !== plan.price && (
            <div className="text-sm text-muted-foreground mt-1">
              <span className="line-through">{plan.price}/month</span>
              <span className="ml-2 text-success-foreground">Save 20%</span>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="space-y-3 text-left">
          {plan.features.map((feature) => (
            <div key={feature} className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <div className="h-4 w-4 rounded-full bg-success/20 flex items-center justify-center">
                  <Check className="h-2.5 w-2.5 text-success" />
                </div>
              </div>
              <Text as="span" size="sm" className="text-foreground">
                {feature}
              </Text>
            </div>
          ))}
        </div>
      </CardContent>

      <CardFooter>
        <Button
          className="w-full"
          variant={plan.buttonVariant}
          size="lg"
          asChild={plan.id !== "enterprise"}
        >
          {plan.id === "enterprise" ? (
            <span>
              {plan.buttonText}
              <ChevronRight className="h-4 w-4" />
            </span>
          ) : (
            <a href={dashboardUrl}>
              {plan.buttonText}
              <ChevronRight className="h-4 w-4" />
            </a>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
