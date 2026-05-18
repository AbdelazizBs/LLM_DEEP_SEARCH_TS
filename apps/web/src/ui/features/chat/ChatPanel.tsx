import type { ChatResponse, FinalReport } from "@deep-research/shared";
import { useEffect, useRef, useState } from "react";
import { ChatComposer } from "./ChatComposer";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  taskId?: string;
};

type StreamEvent = {
  type: string;
  stage?: string;
  message?: string;
  report?: FinalReport;
};

const stageLabels: Record<string, string> = {
  decompose: "Thinking...",
  research: "Searching...",
  synthesize: "Writing...",
};

export function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const sourcesRef = useRef<Map<string, EventSource>>(new Map());

  useEffect(() => {
    return () => {
      sourcesRef.current.forEach((s) => s.close());
    };
  }, []);

  function subscribeToTask(taskId: string, messageId: string) {
    const source = new EventSource(`/api/tasks/${taskId}/events`);
    sourcesRef.current.set(taskId, source);

    source.addEventListener("stage-started", (e: MessageEvent) => {
      const data = JSON.parse(e.data) as StreamEvent;
      const label = data.stage ? stageLabels[data.stage] || "Processing..." : "Processing...";
      setMessages((current) =>
        current.map((m) => (m.id === messageId ? { ...m, text: label } : m)),
      );
    });

    source.addEventListener("stage-completed", (e: MessageEvent) => {
      const data = JSON.parse(e.data) as StreamEvent;
      if (data.stage === "synthesize" && data.report) {
        const finalText = [
          data.report.summary,
          ...(data.report.sections?.map((s) => `${s.title}\n${s.body}`) || []),
        ].join("\n\n");

        setMessages((current) =>
          current.map((m) => (m.id === messageId ? { ...m, text: finalText } : m)),
        );
        source.close();
        sourcesRef.current.delete(taskId);
      }
    });

    source.addEventListener("task-error", () => {
      setMessages((current) =>
        current.map((m) =>
          m.id === messageId ? { ...m, text: "Task failed. Try again." } : m,
        ),
      );
      source.close();
      sourcesRef.current.delete(taskId);
    });
  }

  async function handleSend(text: string) {
    const now = crypto.randomUUID();
    const assistantId = `${now}-assistant`;

    setMessages((current) => [
      ...current,
      { id: now, role: "user", text },
      { id: assistantId, role: "assistant", text: "Thinking..." },
    ]);

    setIsSending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      if (!response.ok) {
        throw new Error(`Chat request failed with status ${response.status}`);
      }

      const data = (await response.json()) as ChatResponse;

      if (data.taskId) {
        setMessages((current) =>
          current.map((m) =>
            m.id === assistantId ? { ...m, taskId: data.taskId, text: "Thinking..." } : m,
          ),
        );
        subscribeToTask(data.taskId, assistantId);
      } else {
        setMessages((current) =>
          current.map((m) => (m.id === assistantId ? { ...m, text: data.reply } : m)),
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown chat error";
      setMessages((current) =>
        current.map((m) =>
          m.id === assistantId ? { ...m, text: `Request failed: ${message}` } : m,
        ),
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <section className="flex flex-1 flex-col overflow-hidden rounded-panel border border-border bg-surface shadow-panel">
      <div className="border-b border-border bg-surface-muted px-5 py-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Chat test surface</p>
            <p className="text-xs text-muted">Starts a background research task and streams task events over SSE.</p>
          </div>
          <span className="w-fit rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-medium text-foreground">
            API connected
          </span>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-5">
        {messages.length === 0 ? (
          <div className="grid gap-3 rounded-md border border-dashed border-border bg-surface-muted p-4 text-sm leading-6 text-muted">
            <p className="font-medium text-foreground">Ready for a smoke test.</p>
            <p>Send a question to verify the React form, Vite proxy, Hono route, and shared schema validation.</p>
          </div>
        ) : (
          messages.map((message) => <ChatBubble key={message.id} message={message} />)
        )}
      </div>

      <ChatComposer disabled={isSending} onSend={handleSend} />
    </section>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const isAssistantLoading = message.role === "assistant" && message.taskId && !message.text.includes("\n");

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-4 py-3 text-sm leading-6 shadow-sm ${
          isUser
            ? "bg-primary text-primary-foreground"
            : isAssistantLoading
              ? "border border-border bg-surface-muted text-muted"
              : "border border-border bg-surface-muted text-foreground"
        }`}
      >
        {message.text}
      </div>
    </div>
  );
}
