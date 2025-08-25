import { createFileRoute } from "@tanstack/react-router";
import { FaqSection } from "@/components/landing/faq-section";
import { FooterSection } from "@/components/landing/footer-section";
import { ComparisonSection, PricingSection } from "@/components/pricing";
import LandingNavbar from "@/components/ui/landing-navbar";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
});

function PricingPage() {
  return (
    <div className="min-h-screen bg-[#F6F6F8]">
      <LandingNavbar />
      <main>
        <PricingSection />
        <ComparisonSection />
        <FaqSection />
        <FooterSection />
      </main>
    </div>
  );
}
