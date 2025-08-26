import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { DashboardPreviewSection } from "@/components/landing/dashboard-preview-section";
import { FaqSection } from "@/components/landing/faq-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { FooterSection } from "@/components/landing/footer-section";
import { HeroSection } from "@/components/landing/hero-section";
import { TestimonialsSection } from "@/components/landing/testimonials-section";
import LandingNavbar from "@/components/ui/landing-navbar";

export const Route = createFileRoute("/")({
  component: App,
});

function App() {
  const navigate = useNavigate();

  const handleGetStartedClick = () => {
    navigate({ to: "/workspaces" });
  };

  return (
    <div className="min-h-screen bg-white">
      <LandingNavbar />

      <main>
        <HeroSection onGetStartedClick={handleGetStartedClick} />
        <DashboardPreviewSection />
        <FeaturesSection />
        <TestimonialsSection />
        <FaqSection />
      </main>

      <FooterSection onGetStartedClick={handleGetStartedClick} />
    </div>
  );
}
