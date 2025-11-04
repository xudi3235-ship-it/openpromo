import { Surface, SurfaceBody } from "@openpromo/ui/components/surface";
import { InboxEmptyState } from "./inbox-empty-state";

export function InboxList() {
  return (
    <Surface
      asChild
      padded="none"
      className="flex flex-1 flex-col overflow-hidden"
    >
      <section>
        <SurfaceBody padded="lg" className="items-center justify-center">
          <InboxEmptyState />
        </SurfaceBody>
      </section>
    </Surface>
  );
}
