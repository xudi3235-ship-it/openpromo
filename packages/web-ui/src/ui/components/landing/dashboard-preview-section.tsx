import dashboardPreview from "@/assets/dashboard.svg";

export function DashboardPreviewSection() {
  return (
    <section className="pb-20">
      <img
        src={dashboardPreview}
        alt="Dashboard Preview"
        className="w-full h-auto"
      />
    </section>
  );
}
