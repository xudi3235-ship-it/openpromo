import { Badge } from "@openpromo/ui/components/badge";
import { Button } from "@openpromo/ui/components/button";
import { Typography } from "@openpromo/ui/components/typography";
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
      <Typography.BodySm className="font-medium">{value}</Typography.BodySm>
    );
  };

  return (
    <Section className="py-24 bg-muted/30">
      <Container size="xl">
        <div className="text-center mb-16">
          <Typography.Display className="mb-4">
            Compare all features
          </Typography.Display>
          <Typography.BodyLg className="text-muted-foreground max-w-2xl mx-auto">
            See exactly what's included in each plan. Upgrade or downgrade at
            any time.
          </Typography.BodyLg>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="bg-card rounded-2xl border overflow-hidden shadow-sm">
            {/* Headers */}
            <div className="grid grid-cols-4 bg-muted/50 border-b">
              <div className="p-6">
                <Typography.H4 className="font-semibold">
                  Features
                </Typography.H4>
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
                  <Typography.H4
                    className={`font-semibold mt-${plan.popular ? "4" : "0"}`}
                  >
                    {plan.name}
                  </Typography.H4>
                </div>
              ))}
            </div>

            {/* Feature Sections */}
            {comparisonData.sections.map((section) => (
              <div key={section.title}>
                {/* Section Title */}
                <div className="px-6 py-4 bg-muted/30 border-b">
                  <Typography.BodySm className="font-semibold text-muted-foreground uppercase tracking-wide">
                    {section.title}
                  </Typography.BodySm>
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
                      <Typography.BodySm className="font-medium">
                        {feature.name}
                      </Typography.BodySm>
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
            <Typography.BodyLg className="text-muted-foreground mb-6">
              Ready to get started? Choose your plan above or start with a free
              trial.
            </Typography.BodyLg>
            <Button asChild size="lg">
              <a href={dashboardUrl}>Start free trial</a>
            </Button>
          </div>
        </div>
      </Container>
    </Section>
  );
}
