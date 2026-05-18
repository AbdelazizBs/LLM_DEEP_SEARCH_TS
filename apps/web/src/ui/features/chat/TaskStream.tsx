import { useEffect, useMemo, useState } from "react";

type StreamEvent =
  | {
      type: "stage-started";
      stage: string;
      message: string;
    }
  | {
      type: "stage-completed";
      stage: string;
      subQuestions?: Array<{ text: string; focus: string }>;
      findings?: Array<{ subQuestion: { text: string }; topFindings: Array<{ finding: string; score: number }> }>;
      report?: { summary: string; confidence: string };
    }
  | {
      type: "ledger";
      entry: {
        label: string;
        inputTokens: number;
        outputTokens: number;
        reasoningTokens: number;
        costUsd: number;
      };
    }
  | {
      type: "task-error";
      message: string;
    };

type LedgerSummary = {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  costUsd: number;
};

export function TaskStream({ taskId }: { taskId: string }) {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const source = new EventSource(`/api/tasks/${taskId}/events`);

    const handleEvent = (message: MessageEvent<string>) => {
      if (!message.data) return;
      setEvents((current) => [...current, JSON.parse(message.data) as StreamEvent]);
    };

    const handleOpen = () => setConnected(true);
    const handleError = () => setConnected(false);

    source.addEventListener("open", handleOpen);
    source.addEventListener("error", handleError);
    source.addEventListener("stage-started", handleEvent);
    source.addEventListener("stage-completed", handleEvent);
    source.addEventListener("ledger", handleEvent);

    return () => {
      source.close();
    };
  }, [taskId]);

  const ledger = useMemo(
    () =>
      events.reduce<LedgerSummary>(
        (summary, event) => {
          if (event.type !== "ledger") return summary;

          return {
            calls: summary.calls + 1,
            inputTokens: summary.inputTokens + event.entry.inputTokens,
            outputTokens: summary.outputTokens + event.entry.outputTokens,
            reasoningTokens: summary.reasoningTokens + event.entry.reasoningTokens,
            costUsd: summary.costUsd + event.entry.costUsd,
          };
        },
        {
          calls: 0,
          inputTokens: 0,
          outputTokens: 0,
          reasoningTokens: 0,
          costUsd: 0,
        },
      ),
    [events],
  );

  return (
    <div className="mt-3 rounded-md border border-border bg-surface p-3 text-left text-xs text-foreground">
      <div className="flex flex-col gap-2 border-b border-border pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium">Task {taskId.slice(0, 8)}</p>
          <p className="text-muted">{connected ? "Streaming progress" : "Connecting to stream"}</p>
        </div>
        <span className="w-fit rounded-full border border-border bg-surface-muted px-2 py-1 text-muted">
          {ledger.calls} calls · {ledger.inputTokens + ledger.outputTokens + ledger.reasoningTokens} tokens · $
          {ledger.costUsd.toFixed(4)}
        </span>
      </div>

      <div className="mt-3 space-y-3">
        {events.length === 0 ? (
          <p className="text-muted">Waiting for the first task event...</p>
        ) : (
          events.map((event, index) => <TaskEventItem event={event} key={`${event.type}-${index}`} />)
        )}
      </div>
    </div>
  );
}

function TaskEventItem({ event }: { event: StreamEvent }) {
  if (event.type === "ledger") {
    return (
      <div className="rounded-md bg-surface-muted p-3 text-muted">
        LLM call: {event.entry.label} · input {event.entry.inputTokens} · output {event.entry.outputTokens}
      </div>
    );
  }

  if (event.type === "task-error") {
    return (
      <div className="rounded-md border border-danger/30 bg-danger/10 p-3 text-foreground">
        <p className="font-medium">Task failed</p>
        <p className="mt-1 text-muted">{event.message}</p>
      </div>
    );
  }

  if (event.type === "stage-started") {
    return (
      <div className="rounded-md bg-surface-muted p-3">
        <p className="font-medium">{event.stage} started</p>
        <p className="mt-1 text-muted">{event.message}</p>
      </div>
    );
  }

  return (
    <div className="rounded-md bg-surface-muted p-3">
      <p className="font-medium">{event.stage} completed</p>
      {event.subQuestions ? (
        <ul className="mt-2 list-disc space-y-1 pl-4 text-muted">
          {event.subQuestions.map((item) => (
            <li key={item.text}>{item.text}</li>
          ))}
        </ul>
      ) : null}
      {event.findings ? <p className="mt-1 text-muted">{event.findings.length} research groups scored.</p> : null}
      {event.report ? (
        <div className="mt-2 text-muted">
          <p>{event.report.summary}</p>
          <p className="mt-1">Confidence: {event.report.confidence}</p>
        </div>
      ) : null}
    </div>
  );
}
