import { PageShell } from "../components/PageShell";
import { AdminTaskPanel } from "../features/admin/AdminTaskPanel";

export function AdminPage() {
  return (
    <PageShell maxWidth="6xl" title="Admin">
      <AdminTaskPanel />
    </PageShell>
  );
}
