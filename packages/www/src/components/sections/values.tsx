import { Heart, Lightbulb, Shield, UserCog } from "lucide-react";
import SectionHeader from "../elements/section-header";

const values = [
  {
    title: "User-Centered Design",
    description:
      "We prioritize the user experience, ensuring every feature adds real value and is intuitive to use.",
    icon: UserCog,
  },
  {
    title: "Continuous Innovation",
    description:
      "We are committed to pushing boundaries, and evolving to meet the needs of modern teams.",
    icon: Lightbulb,
  },
  {
    title: "Integrity and Transparency",
    description:
      "We build with honesty and clarity, fostering trust with our users and partners.",
    icon: Shield,
  },
];

const Values = () => {
  return (
    <section>
      <SectionHeader
        iconTitle="We live by"
        title="Our Core Values"
        icon={Heart}
        description="We believe in principles that guide our growth and inspire our community."
        className="border-none"
      />

      <div className="container mt-10 grid gap-8 sm:grid-cols-2 md:mt-14 lg:grid-cols-3">
        {values.map((value, index) => {
          const Icon = value.icon;
          return (
            <div className="flex gap-2.5" key={index}>
              <Icon className="mt-0.5 size-[18px] shrink-0" />
              <div>
                <h3 className="text-lg !leading-none tracking-[-0.96px] lg:text-2xl">
                  {value.title}
                </h3>
                <p className="text-muted-foreground mt-2.5 text-sm tracking-[-0.36px]">
                  {value.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default Values;
