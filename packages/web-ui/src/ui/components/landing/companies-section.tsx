import amsterdamLogo from "@/assets/company/Amsterdam.svg";
import cloudLogo from "@/assets/company/Cloud.svg";
import luminousLogo from "@/assets/company/Luminous.svg";
import orbitcLogo from "@/assets/company/Orbitc.svg";
import prolineLogo from "@/assets/company/Proline.svg";
import springfieldLogo from "@/assets/company/Springfield.svg";
import { Typography } from "@/ui/components/typography";

const companies = [
  { name: "Springfield", src: springfieldLogo },
  { name: "Orbitc", src: orbitcLogo },
  { name: "Cloud", src: cloudLogo },
  { name: "Proline", src: prolineLogo },
  { name: "Amsterdam", src: amsterdamLogo },
  { name: "Luminous", src: luminousLogo },
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
