import { Eye } from "lucide-react";
import OptimizeList from "../elements/optimize-list";
import SectionHeader from "../elements/section-header";

const Optimize = () => {
  return (
    <section id="optimized-scheduling" className="">
      <div className="border-b">
        <SectionHeader
          iconTitle="Optimize"
          title="Optimize every aspect of your day"
          icon={Eye}
          description={
            "Achieve seamless productivity with intelligent scheduling, insightful analytics, and effortless integrations."
          }
        />
      </div>

      <div className="container border-x lg:!px-0">
        <OptimizeList />
      </div>

      <div className="h-8 w-full border-y md:h-12 lg:h-[112px]">
        <div className="container h-full w-full border-x"></div>
      </div>
    </section>
  );
};

export default Optimize;
