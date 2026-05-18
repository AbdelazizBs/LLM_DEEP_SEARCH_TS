import { PageShell } from "../components/PageShell";
import { AdminTaskPanel } from "../features/admin/AdminTaskPanel";

export function AdminPage() {
  return (
    <PageShell
      description="Track task status, stage timing, token usage, and cost once the scheduler starts persisting real runs."
      maxWidth="6xl"
      title="Admin"
    >
      <AdminTaskPanel />
    </PageShell>
  );
}
