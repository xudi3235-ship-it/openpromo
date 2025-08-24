import dashboardPreview from "@/assets/dashboard.svg";
import { Container, Section } from "@/ui/components/layout";

export function DashboardPreviewSection() {
  return (
    <Section spacing="sm">
      <Container size="xl" padding="none">
        <img
          src={dashboardPreview}
          alt="Dashboard Preview"
          className="w-full h-auto"
        />
      </Container>
    </Section>
  );
}
