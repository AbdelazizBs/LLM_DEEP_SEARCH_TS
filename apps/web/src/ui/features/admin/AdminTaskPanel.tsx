import { useEffect, useState } from "react";

type TaskRow = {
  id: string;
  question: string;
  status: string;
  finalOutput: unknown;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  totalCost: number;
  totalTokens: number;
  callCount: number;
};

type LlmCallRow = {
  id: string;
  taskId: string;
  label: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  costUsd: number;
  createdAt: string;
};

type TaskEventRow = {
  id: string;
  taskId: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

type TaskDetail = {
  task: TaskRow;
  events: TaskEventRow[];
  llmCalls: LlmCallRow[];
};

type AdminTasksResponse = {
  tasks: TaskRow[];
};

export function AdminTaskPanel() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<TaskDetail | null>(null);

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 5000);
    return () => clearInterval(interval);
  }, []);

  async function fetchTasks() {
    try {
      const res = await fetch("/api/admin/tasks");
      const data = (await res.json()) as AdminTasksResponse;
      setTasks(data.tasks);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  async function openTask(taskId: string) {
    try {
      const res = await fetch(`/api/admin/tasks/${taskId}`);
      const data = (await res.json()) as TaskDetail;
      setSelectedTask(data);
    } catch {
    }
  }

  function closeDetail() {
    setSelectedTask(null);
  }

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-panel border border-border bg-surface shadow-panel">
        <div className="border-b border-border bg-surface-muted px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">All Tasks</h2>
          <p className="mt-1 text-sm text-muted">Status, cost, and duration for every research task.</p>
        </div>

        {loading ? (
          <div className="p-5 text-sm text-muted">Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="p-5 text-sm text-muted">No tasks yet. Start a research question in chat.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead className="bg-surface-muted text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-5 py-3 font-semibold">Question</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Duration</th>
                  <th className="px-5 py-3 font-semibold">Cost</th>
                  <th className="px-5 py-3 font-semibold">Tokens</th>
                  <th className="px-5 py-3 font-semibold">Started</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tasks.map((task) => {
                  const duration = task.startedAt && task.completedAt
                    ? formatDuration(new Date(task.startedAt), new Date(task.completedAt))
                    : task.startedAt
                      ? formatDuration(new Date(task.startedAt), new Date())
                      : "—";

                  return (
                    <tr
                      key={task.id}
                      className="cursor-pointer hover:bg-surface-muted"
                      onClick={() => openTask(task.id)}
                    >
                      <td className="px-5 py-3 max-w-[300px] truncate font-medium text-foreground">
                        {task.question}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={task.status} />
                      </td>
                      <td className="px-5 py-3 text-muted">{duration}</td>
                      <td className="px-5 py-3 text-muted">${(task.totalCost ?? 0).toFixed(4)}</td>
                      <td className="px-5 py-3 text-muted">{(task.totalTokens ?? 0).toLocaleString()}</td>
                      <td className="px-5 py-3 text-muted">
                        {task.startedAt ? new Date(task.startedAt).toLocaleTimeString() : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedTask && <TaskDetailDrawer detail={selectedTask} onClose={closeDetail} />}
    </div>
  );
}

function TaskDetailDrawer({ detail, onClose }: { detail: TaskDetail; onClose: () => void }) {
  const { task, events, llmCalls } = detail;

  const totalCost = llmCalls.reduce((sum, c) => sum + c.costUsd, 0);
  const totalTokens = llmCalls.reduce((sum, c) => sum + c.inputTokens + c.outputTokens + c.reasoningTokens, 0);
  const totalCalls = llmCalls.length;

  const stageEvents = events.filter(
    (e) => e.type === "stage-started" || e.type === "stage-completed"
  );

  const duration = task.startedAt && task.completedAt
    ? formatDuration(new Date(task.startedAt), new Date(task.completedAt))
    : task.startedAt
      ? formatDuration(new Date(task.startedAt), new Date())
      : "—";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="mx-4 max-h-[85vh] w-full max-w-4xl overflow-auto rounded-lg border border-border bg-surface shadow-xl">
        <div className="sticky top-0 border-b border-border bg-surface-muted px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-foreground">Task Detail</h3>
              <p className="mt-1 text-sm text-muted">{task.question}</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-md px-3 py-1 text-sm text-muted hover:bg-surface"
            >
              Close
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 p-5">
          <MetricCard label="Status" value={<StatusBadge status={task.status} />} />
          <MetricCard label="Duration" value={duration} />
          <MetricCard label="Total Cost" value={`$${totalCost.toFixed(4)}`} />
          <MetricCard label="Tokens" value={`${totalTokens.toLocaleString()}`} />
        </div>

        <div className="border-t border-border px-5 py-4">
          <h4 className="text-sm font-semibold text-foreground">LLM Calls ({totalCalls})</h4>
          {llmCalls.length === 0 ? (
            <p className="mt-2 text-sm text-muted">No LLM calls recorded yet.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="bg-surface-muted text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Label</th>
                    <th className="px-3 py-2 font-semibold">Model</th>
                    <th className="px-3 py-2 font-semibold">Input</th>
                    <th className="px-3 py-2 font-semibold">Output</th>
                    <th className="px-3 py-2 font-semibold">Reasoning</th>
                    <th className="px-3 py-2 font-semibold">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {llmCalls.map((call) => (
                    <tr key={call.id}>
                      <td className="px-3 py-2 text-foreground">{call.label}</td>
                      <td className="px-3 py-2 text-muted">{call.model}</td>
                      <td className="px-3 py-2 text-muted">{call.inputTokens.toLocaleString()}</td>
                      <td className="px-3 py-2 text-muted">{call.outputTokens.toLocaleString()}</td>
                      <td className="px-3 py-2 text-muted">{call.reasoningTokens.toLocaleString()}</td>
                      <td className="px-3 py-2 text-muted">${call.costUsd.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="border-t border-border px-5 py-4">
          <h4 className="text-sm font-semibold text-foreground">Stage Events</h4>
          {stageEvents.length === 0 ? (
            <p className="mt-2 text-sm text-muted">No stage events yet.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {stageEvents.map((ev, i) => (
                <div key={i} className="rounded-md bg-surface-muted p-3 text-sm">
                  <p className="font-medium text-foreground">
                    {ev.type === "stage-started" ? "Started" : "Completed"}: {(ev.payload as { stage?: string })?.stage || "Unknown"}
                  </p>
                  {(ev.payload as { message?: string })?.message && (
                    <p className="mt-1 text-muted">{(ev.payload as { message?: string })?.message}</p>
                  )}
                  <p className="mt-1 text-xs text-muted">
                    {new Date(ev.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {task.finalOutput && (
          <div className="border-t border-border px-5 py-4">
            <h4 className="text-sm font-semibold text-foreground">Final Report</h4>
            <div className="mt-3 space-y-3 text-sm text-foreground">
              <p>{(task.finalOutput as { summary?: string })?.summary}</p>
              {(task.finalOutput as { sections?: Array<{ title: string; body: string }> })?.sections?.map((s, i) => (
                <div key={i}>
                  <p className="font-medium">{s.title}</p>
                  <p className="mt-1 text-muted">{s.body}</p>
                </div>
              ))}
              <p>Confidence: {(task.finalOutput as { confidence?: string })?.confidence}</p>
            </div>
          </div>
        )}

        {task.error && (
          <div className="border-t border-border px-5 py-4">
            <h4 className="text-sm font-semibold text-danger">Error</h4>
            <p className="mt-2 text-sm text-muted">{task.error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-surface-muted p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <div className="mt-2 text-lg font-semibold text-foreground">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "completed"
      ? "border-accent/40 bg-accent/10"
      : status === "failed"
        ? "border-danger/40 bg-danger/10"
        : status === "running"
          ? "border-warning/50 bg-warning/10"
          : "border-border bg-surface-muted";

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-medium text-foreground ${tone}`}>
      {status}
    </span>
  );
}

function formatDuration(start: Date, end: Date): string {
  const ms = end.getTime() - start.getTime();
  if (ms < 0) return "—";
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}
