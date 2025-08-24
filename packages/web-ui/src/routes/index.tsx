import {
  createFileRoute,
  useLoaderData,
  useNavigate,
} from "@tanstack/react-router";
import { login } from "@/lib/auth";
import { CompaniesSection } from "@/ui/components/landing/companies-section";
import { DashboardPreviewSection } from "@/ui/components/landing/dashboard-preview-section";
import { FeaturesSection } from "@/ui/components/landing/features-section";
import { HeroSection } from "@/ui/components/landing/hero-section";
import LandingNavbar from "@/ui/components/landing-navbar";

export const Route = createFileRoute("/")({
  component: App,
  // not sure if this works
  headers: () => ({
    "Cache-Control": "public, max-age=31536000, immutable",
  }),
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
      </main>
    </div>
  );
}
