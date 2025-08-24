import { Typography } from "@/ui/components/typography";

const companies = [
  { name: "Springfield", src: "/company/Springfield.svg" },
  { name: "Orbitc", src: "/company/Orbitc.svg" },
  { name: "Cloud", src: "/company/Cloud.svg" },
  { name: "Proline", src: "/company/Proline.svg" },
  { name: "Amsterdam", src: "/company/Amsterdam.svg" },
  { name: "Luminous", src: "/company/Luminous.svg" },
];

export function CompaniesSection() {
  return (
    <section className="flex flex-col items-center gap-8 py-16 lg:py-20">
      <Typography variant="body-base" className="text-center">
        Trusted by the best teams
      </Typography>
      <div className="flex items-center justify-center gap-6 md:gap-10 lg:gap-12 flex-wrap">
        {companies.map((company) => (
          <img
            key={company.name}
            src={company.src}
            alt={company.name}
            className="h-8 w-auto opacity-60 hover:opacity-100 transition-opacity"
          />
        ))}
      </div>
    </section>
  );
}
