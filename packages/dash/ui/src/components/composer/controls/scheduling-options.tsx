import { SchedulingSection } from "./scheduling-section";

/**
 * SchedulingOptions - Legacy component that uses the new SchedulingSection composition
 * Kept for backward compatibility
 */
export function SchedulingOptions() {
  return (
    <SchedulingSection>
      <SchedulingSection.Header />
      <SchedulingSection.Toggle />
      <SchedulingSection.Picker />
    </SchedulingSection>
  );
}
