import { InboxEmptyState } from "./inbox-empty-state";

export function InboxList() {
  return (
    <section className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border/60 bg-background">
      <InboxEmptyState />
    </section>
  );
}
