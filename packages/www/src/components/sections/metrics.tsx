const ITEMS = [
  {
    value: "500+",
    label: "Active users",
  },
  {
    value: "99.9%",
    label: "Uptime for productivity",
  },
  {
    value: "20+",
    label: "Industry awards",
  },
  {
    value: "100+",
    label: "Integrations",
  },
];

export const Metrics = () => {
  return (
    <section className="container pb-14 md:pb-20 lg:pb-24">
      <div className="flex flex-col justify-between gap-6 sm:flex-row">
        {ITEMS.map((metric, index) => (
          <div key={index} className="flex flex-col">
            <span className="text-primary text-[3.375rem] leading-[120%] tracking-[-2.8px]">
              {metric.value}
            </span>
            <span className="text-muted-foreground mt-2 tracking-[-0.32px]">
              {metric.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};
