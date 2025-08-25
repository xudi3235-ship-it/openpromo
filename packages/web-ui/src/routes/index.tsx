import {
  createFileRoute,
  useLoaderData,
  useNavigate,
} from "@tanstack/react-router";
import { CompaniesSection } from "@/components/landing/companies-section";
import { DashboardPreviewSection } from "@/components/landing/dashboard-preview-section";
import { FaqSection } from "@/components/landing/faq-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { FooterSection } from "@/components/landing/footer-section";
import { HeroSection } from "@/components/landing/hero-section";
import { TestimonialsSection } from "@/components/landing/testimonials-section";
import LandingNavbar from "@/components/ui/landing-navbar";
import { login } from "@/lib/auth";

export const Route = createFileRoute("/")({
  component: App,
});

function App() {
  const { user } = useLoaderData({ from: "__root__" });
  const navigate = useNavigate();

  const handleGetStartedClick = () => {
    if (user) {
      navigate({ to: "/workspaces" });
    } else {
      login("/workspaces");
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <LandingNavbar />

      <main>
        <HeroSection onGetStartedClick={handleGetStartedClick} />
        <DashboardPreviewSection />
        <CompaniesSection />
        <FeaturesSection />
        <TestimonialsSection />
        <FaqSection />
      </main>

      <FooterSection onGetStartedClick={handleGetStartedClick} />
    </div>
  );
}
