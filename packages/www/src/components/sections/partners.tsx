const Partners = () => {
  const partners = [
    {
      name: "Notion",
      logo: "/images/partners/notion.svg",
    },
    {
      name: "GitHub",
      logo: "/images/partners/github.svg",
    },
    {
      name: "Slack",
      logo: "/images/partners/slack.svg",
    },
    {
      name: "Loom",
      logo: "/images/partners/loom.svg",
    },
    {
      name: "Figma",
      logo: "/images/partners/figma.svg",
    },
  ];

  return (
    <section className="container flex flex-wrap items-center justify-between gap-12 py-12 lg:py-20">
      <p className="text-primary text-lg leading-[140%] tracking-[-0.32px]">
        Used by the world&apos;s leading companies
      </p>
      <div className="flex flex-wrap items-center gap-x-8 gap-y-6 opacity-70 grayscale lg:gap-[60px]">
        {partners.map((partner) => (
          <div key={partner.name} className="flex items-center justify-center">
            <img
              src={partner.logo}
              alt={`${partner.name} logo`}
              width={109}
              height={48}
              className="object-contain"
            />
          </div>
        ))}
      </div>
    </section>
  );
};

export default Partners;
