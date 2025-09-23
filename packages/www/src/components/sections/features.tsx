import { PocketKnife } from "lucide-react";
import FeaturesList from "../elements/features-list";
import SectionHeader from "../elements/section-header";

const Features = () => {
  return (
    <section id="smart-productivity" className="pt-12 lg:pt-20">
      <div className="border-y">
        <SectionHeader
          iconTitle="Features"
          title="Smart productivity with AI"
          icon={PocketKnife}
          description={
            "Unlock smarter productivity with features that help you manage tasks, time, and focus—seamlessly."
          }
        />
      </div>

      <div className="container border-x lg:!px-0">
        <FeaturesList />
      </div>

      <div className="h-8 w-full border-y md:h-12 lg:h-[112px]">
        <div className="container h-full w-full border-x"></div>
      </div>
    </section>
  );
};

export default Features;
