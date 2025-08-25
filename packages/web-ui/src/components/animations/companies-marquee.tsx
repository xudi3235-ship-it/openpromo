import { motion } from "framer-motion";

interface CompanyLogo {
  name: string;
  displayName: string;
}

// Mock company logos - you can replace these with actual company names or logos
const companies: CompanyLogo[] = [
  { name: "springfield", displayName: "Springfield" },
  { name: "orbitc", displayName: "Orbitc" },
  { name: "cloud", displayName: "Cloud" },
  { name: "proline", displayName: "Proline" },
  { name: "amsterdam", displayName: "Amsterdam" },
  { name: "luminous", displayName: "Luminous" },
  { name: "nextech", displayName: "NexTech" },
  { name: "quantum", displayName: "Quantum" },
];

export function CompaniesMarquee() {
  return (
    <div className="w-full overflow-hidden relative py-4">
      {/* Gradient masks for fade effect */}
      <div className="absolute left-0 top-0 w-32 h-full bg-gradient-to-r from-white via-white/80 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 w-32 h-full bg-gradient-to-l from-white via-white/80 to-transparent z-10 pointer-events-none" />

      {/* Scrolling content */}
      <motion.div
        className="flex items-center whitespace-nowrap"
        animate={{
          x: ["0%", "-50%"],
        }}
        transition={{
          x: {
            repeat: Infinity,
            repeatType: "loop",
            duration: 30,
            ease: "linear",
          },
        }}
        style={{ width: "200%" }}
      >
        {/* First set of logos */}
        <div className="flex items-center gap-16 min-w-full">
          {companies.map((company, index) => (
            <div
              key={`first-${company.name}-${index}`}
              className="text-gray-400 font-semibold text-lg tracking-wide whitespace-nowrap"
            >
              {company.displayName}
            </div>
          ))}
        </div>

        {/* Duplicate set for seamless loop */}
        <div className="flex items-center gap-16 min-w-full">
          {companies.map((company, index) => (
            <div
              key={`second-${company.name}-${index}`}
              className="text-gray-400 font-semibold text-lg tracking-wide whitespace-nowrap"
            >
              {company.displayName}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
