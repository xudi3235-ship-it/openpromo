import { Badge } from "@openpromo/ui/components/badge";
import { Button } from "@openpromo/ui/components/button";
import { Text } from "@openpromo/ui/components/typography";
import { Check, X } from "lucide-react";
import { Container, Section } from "../_layout";

const comparisonData = {
  plans: [
    {
      name: "Starter",
      popular: false,
    },
    {
      name: "Pro",
      popular: true,
    },
    {
      name: "Enterprise",
      popular: false,
    },
  ],
  sections: [
    {
      title: "Content Management",
      features: [
        {
          name: "Social accounts",
          starter: "Up to 3",
          pro: "Unlimited",
          enterprise: "Unlimited",
        },
        {
          name: "Scheduled posts",
          starter: "5/month",
          pro: "Unlimited",
          enterprise: "Unlimited",
        },
        {
          name: "Content templates",
          starter: true,
          pro: true,
          enterprise: true,
        },
        {
          name: "AI content suggestions",
          starter: false,
          pro: true,
          enterprise: true,
        },
      ],
    },
    {
      title: "Analytics & Insights",
      features: [
        {
          name: "Basic analytics",
          starter: true,
          pro: true,
          enterprise: true,
        },
        {
          name: "Advanced reporting",
          starter: false,
          pro: true,
          enterprise: true,
        },
        {
          name: "Custom dashboards",
          starter: false,
          pro: false,
          enterprise: true,
        },
      ],
    },
    {
      title: "Team & Collaboration",
      features: [
        {
          name: "Team members",
          starter: "1",
          pro: "Up to 10",
          enterprise: "Unlimited",
        },
        {
          name: "Role permissions",
          starter: false,
          pro: true,
          enterprise: true,
        },
        {
          name: "Approval workflows",
          starter: false,
          pro: false,
          enterprise: true,
        },
      ],
    },
    {
      title: "Support & Security",
      features: [
        {
          name: "Email support",
          starter: true,
          pro: true,
          enterprise: true,
        },
        {
          name: "Priority support",
          starter: false,
          pro: true,
          enterprise: true,
        },
        {
          name: "Dedicated account manager",
          starter: false,
          pro: false,
          enterprise: true,
        },
        {
          name: "SLA guarantee",
          starter: false,
          pro: false,
          enterprise: true,
        },
      ],
    },
  ],
};

type FeatureValue = boolean | string;

interface ComparisonSectionProps {
  dashboardUrl: string;
}

export function ComparisonSection({ dashboardUrl }: ComparisonSectionProps) {
  const renderFeatureValue = (value: FeatureValue) => {
    if (typeof value === "boolean") {
      return value ? (
        <Check className="h-5 w-5 text-success" />
      ) : (
        <X className="h-5 w-5 text-muted-foreground/40" />
      );
    }
    return (
      <Text as="span" size="sm" weight="medium">
        {value}
      </Text>
    );
  };

  return (
    <Section className="py-24 bg-muted/30">
      <Container size="xl">
        <div className="text-center mb-16">
          <Text
            as="h1"
            variant="heading"
            size="4xl"
            weight="bold"
            className="mb-4"
          >
            Compare all features
          </Text>
          <Text
            as="p"
            size="lg"
            tone="muted"
            className="max-w-2xl mx-auto leading-7"
          >
            See exactly what's included in each plan. Upgrade or downgrade at
            any time.
          </Text>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="bg-card rounded-2xl border overflow-hidden shadow-sm">
            {/* Headers */}
            <div className="grid grid-cols-4 bg-muted/50 border-b">
              <div className="p-6">
                <Text as="h4" variant="heading" size="xl" weight="semibold">
                  Features
                </Text>
              </div>
              {comparisonData.plans.map((plan) => (
                <div key={plan.name} className="p-6 text-center relative">
                  {plan.popular && (
                    <Badge
                      variant="default"
                      className="absolute top-2 left-1/2 -translate-x-1/2 text-xs"
                    >
                      Popular
                    </Badge>
                  )}
                  <Text
                    as="h4"
                    variant="heading"
                    size="xl"
                    weight="semibold"
                    className={plan.popular ? "mt-4" : undefined}
                  >
                    {plan.name}
                  </Text>
                </div>
              ))}
            </div>

            {/* Feature Sections */}
            {comparisonData.sections.map((section) => (
              <div key={section.title}>
                {/* Section Title */}
                <div className="px-6 py-4 bg-muted/30 border-b">
                  <Text
                    as="span"
                    size="sm"
                    weight="semibold"
                    tone="muted"
                    transform="uppercase"
                    className="tracking-wide"
                  >
                    {section.title}
                  </Text>
                </div>

                {/* Features */}
                {section.features.map((feature, index) => (
                  <div
                    key={feature.name}
                    className={`grid grid-cols-4 border-b last:border-b-0 ${
                      index % 2 === 0 ? "bg-card" : "bg-muted/20"
                    }`}
                  >
                    <div className="p-4 flex items-center">
                      <Text as="span" size="sm" weight="medium">
                        {feature.name}
                      </Text>
                    </div>
                    <div className="p-4 flex items-center justify-center">
                      {renderFeatureValue(feature.starter)}
                    </div>
                    <div className="p-4 flex items-center justify-center">
                      {renderFeatureValue(feature.pro)}
                    </div>
                    <div className="p-4 flex items-center justify-center">
                      {renderFeatureValue(feature.enterprise)}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* CTA Section */}
          <div className="text-center mt-12">
            <Text as="p" size="lg" tone="muted" className="mb-6">
              Ready to get started? Choose your plan above or start with a free
              trial.
            </Text>
            <Button asChild size="lg">
              <a href={dashboardUrl}>Start free trial</a>
            </Button>
          </div>
        </div>
      </Container>
    </Section>
  );
}
