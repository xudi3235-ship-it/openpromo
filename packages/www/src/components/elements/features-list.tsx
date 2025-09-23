import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@openpromo/ui/components/tabs";
import { CalendarClock, ChartBar, SquarePen } from "lucide-react";
import DiagonalPattern from "./diagonal-pattern";

const FEATURES_DATA = [
  {
    title: "Smart Task Management",
    description:
      "Create, prioritize, and delegate tasks effortlessly. AI helps you identify what matters most with smart recommendations and automated workflows.",
    icon: SquarePen,
    image: "/images/homepage/features-1.png",
  },
  {
    title: "Automated Scheduling",
    description:
      "Let AI find the best time slots for meetings, reminders, and tasks based on your calendar and working habits. Stay organized without the hassle.",
    icon: CalendarClock,
    image: "/images/homepage/features-2.png",
  },
  {
    title: "Personalized Insights",
    description:
      "Track your productivity with AI-powered insights. Get weekly summaries and actionable tips to improve your workflow and manage workloads better.",
    icon: ChartBar,
    image: "/images/homepage/features-3.png",
  },
];

const FeaturesList = () => {
  return (
    <Tabs
      defaultValue={FEATURES_DATA[0].title}
      // On mobile we keep vertical stacking (list then content); on lg switch to horizontal left(right)
      className="flex flex-col lg:flex-row lg:items-stretch lg:gap-0"
    >
      <TabsList className="flex h-auto w-full flex-col bg-transparent p-0 max-lg:border-x lg:w-[40%] lg:max-w-md lg:border-r lg:border-t-0 lg:rounded-none lg:bg-transparent">
        {FEATURES_DATA.map((item) => (
          <TabsTrigger
            key={item.title}
            value={item.title}
            className="group relative whitespace-normal border-b px-1 py-5 text-start data-[state=active]:shadow-none lg:px-8"
          >
            <div
              className={`absolute bottom-[-1px] left-0 z-10 h-[1px] w-0 bg-gradient-to-r from-blue-600 via-sky-300 to-transparent transition-all duration-300 group-data-[state=active]:w-1/2`}
            />
            <div className="">
              <div className="flex items-center gap-1.5">
                <item.icon className="size-4" />
                <h3 className="text-lg tracking-[-0.36px]">{item.title}</h3>
              </div>
              <p className="text-muted-foreground mt-2.5 tracking-[-0.32px]">
                {item.description}
              </p>
            </div>
          </TabsTrigger>
        ))}
      </TabsList>

      <div className="flex-1 lg:w-[60%]">
        {FEATURES_DATA.map((item, index) => (
          <TabsContent
            // biome-ignore lint/suspicious/noArrayIndexKey: ok
            key={index}
            value={item.title}
            className="m-0 px-6 py-[38px] max-lg:border-x lg:border-none"
          >
            <div className="flex justify-center">
              <div>
                <div className="px-6 lg:px-10">
                  <DiagonalPattern className="h-6 lg:h-10" />
                </div>
                <div className="relative grid grid-cols-[auto_1fr_auto] items-stretch">
                  <DiagonalPattern className="h-full w-6 lg:w-10" />
                  <img
                    src={item.image}
                    alt={item.title}
                    width={400}
                    height={510}
                    className="m-3 rounded-md object-contain shadow-md lg:rounded-xl lg:shadow-lg dark:invert"
                  />
                  <DiagonalPattern className="w-6 lg:w-10" />
                </div>
                <div className="px-6 lg:px-10">
                  <DiagonalPattern className="h-6 lg:h-10" />
                </div>
              </div>
            </div>
          </TabsContent>
        ))}
      </div>
    </Tabs>
  );
};

export default FeaturesList;
