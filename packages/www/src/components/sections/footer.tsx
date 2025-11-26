import { Instagram, Linkedin, Twitter } from "lucide-react";
import logoSrc from "../../assets/logo.png";

const sections = [
  {
    title: "Product",
    links: [
      { name: "Features", href: "#" },
      { name: "Pricing", href: "#" },
    ],
  },
  {
    title: "Company",
    links: [
      { name: "Contact", href: "/contact" },
      { name: "Faq", href: "#" },
    ],
  },
  {
    title: "Legal",
    links: [{ name: "Terms of Service", href: "/terms" }],
  },
];

const Footer = () => {
  return (
    <footer className="border-t">
      <div className="container flex justify-between gap-8 border-x py-4 max-md:flex-col lg:py-8">
        <div className="mb-8 flex-1">
          <a href="/" className="flex items-center gap-1">
            <img
              src={logoSrc.src}
              alt="logo"
              width={32}
              height={32}
              className="dark:invert"
            />
            <span className="leading-0 text-2xl font-semibold">OpenPromo</span>
          </a>
        </div>
        <div className="flex flex-1 justify-between gap-8 max-sm:flex-col">
          {sections.map((section, sectionIdx) => (
            <div key={sectionIdx}>
              <h3 className="text-muted-foreground-subtle text-sm tracking-[-0.28px]">
                {section.title}
              </h3>
              <ul className="mt-6 space-y-6 text-sm tracking-[-0.28px] lg:mt-8 lg:space-y-8">
                {section.links.map((link, linkIdx) => (
                  <li key={linkIdx} className="hover:text-primary">
                    <a href={link.href}>{link.name}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h3 className="text-muted-foreground-subtle text-sm tracking-[-0.28px]">
              Social
            </h3>

            <div className="text-muted-foreground-subtle mt-6 flex gap-3 lg:mt-8">
              <a href="https://instagram.com" aria-label="Instagram">
                <Instagram size={20} />
              </a>
              <a href="https://twitter.com" aria-label="Twitter">
                <Twitter size={20} />
              </a>
              <a href="https://Linkedin.com" aria-label="Linkedin">
                <Linkedin size={20} />
              </a>
            </div>
          </div>
        </div>
      </div>
      <div className="text-muted-foreground-subtle container border-x border-b border-t py-4 text-sm tracking-[-0.28px] lg:py-8">
        <p>© {new Date().getFullYear()} OpenPromo. All rights reserved.</p>
      </div>
      <div className="container h-6 border-x"></div>
    </footer>
  );
};

export default Footer;
