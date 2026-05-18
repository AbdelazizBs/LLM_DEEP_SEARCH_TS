const phaseRows = [
  ["Phase 0", "Mostly done", "Workspace, stack, env, docs, and initial app shell exist."],
  ["Phase 1", "Started", "Pipeline functions and usage wrapper exist; needs live tuning and persistence."],
  ["Phase 2", "Started", "DB tables exist; task/event/call write helpers are still missing."],
  ["Phase 3", "Started", "SSE route exists as placeholder; scheduler and replay are missing."],
  ["Phase 4", "Started", "Chat route validates requests and returns a stub; AI SDK streaming is missing."],
  ["Phase 5", "Started", "Chat UI posts to API; TaskStream and token meter are missing."],
  ["Phase 6", "Started", "Scalar and admin APIs exist; real admin telemetry UI is missing."],
  ["Phase 7", "Not started", "Final QA, cleanup validation, cost check, and reflection remain."],
] as const;

export function AdminTaskPanel() {
  return (
    <section className="overflow-hidden rounded-panel border border-border bg-surface shadow-panel">
      <div className="border-b border-border bg-surface-muted px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Phase readiness</h2>
            <p className="mt-1 text-sm text-muted">
              This panel shows what is missing until real persisted task telemetry is available.
            </p>
          </div>
          <a
            className="w-fit rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-muted"
            href="http://127.0.0.1:3000/docs"
          >
            Open API docs
          </a>
        </div>
      </div>

      <div className="grid gap-3 p-5 md:grid-cols-3">
        <Metric label="Current focus" value="Phase 2" />
        <Metric label="API manager" value="Scalar" />
        <Metric label="Active provider" value="OpenRouter" />
      </div>

      <div className="overflow-x-auto border-t border-border">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead className="bg-surface-muted text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-5 py-3 font-semibold">Phase</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 font-semibold">What is missing</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {phaseRows.map(([phase, status, note]) => (
              <tr key={phase} className="align-top">
                <td className="px-5 py-4 font-medium text-foreground">{phase}</td>
                <td className="px-5 py-4">
                  <StatusBadge status={status} />
                </td>
                <td className="px-5 py-4 text-muted">{note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-surface-muted p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "Mostly done"
      ? "border-accent/40 bg-accent/10"
      : status === "Not started"
        ? "border-danger/40 bg-danger/10"
        : "border-warning/50 bg-warning/10";

  return <span className={`rounded-full border px-3 py-1 text-xs font-medium text-foreground ${tone}`}>{status}</span>;
}
