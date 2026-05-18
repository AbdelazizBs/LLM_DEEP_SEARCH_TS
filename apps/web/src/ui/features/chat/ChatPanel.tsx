import type { ChatResponse, FinalReport } from "@deep-research/shared";
import { useEffect, useRef, useState } from "react";
import { ChatComposer } from "./ChatComposer";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  taskId?: string;
  stage?: string;
  stageIndex?: number;
};

type StreamEvent = {
  type: string;
  stage?: string;
  message?: string;
  report?: FinalReport;
};

const stages = ["decompose", "research", "synthesize"] as const;

const stageLabels: Record<string, string> = {
  decompose: "Analyzing question",
  research: "Searching the web",
  synthesize: "Writing response",
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
      if (data.stage) {
        const stageIndex = stages.indexOf(data.stage as (typeof stages)[number]);
        setMessages((current) =>
          current.map((m) =>
            m.id === messageId
              ? { ...m, stage: data.stage, stageIndex: stageIndex >= 0 ? stageIndex + 1 : 1 }
              : m,
          ),
        );
      }
    });

    source.addEventListener("stage-completed", (e: MessageEvent) => {
      const data = JSON.parse(e.data) as StreamEvent;
      if (data.stage === "synthesize" && data.report) {
        const parts = [data.report.summary];
        if (data.report.sections) {
          for (const section of data.report.sections) {
            parts.push(`${section.title}\n${section.body}`);
          }
        }
        const finalText = parts.join("\n\n");

        setMessages((current) =>
          current.map((m) => (m.id === messageId ? { ...m, text: finalText, stage: undefined, stageIndex: undefined } : m)),
        );
        source.close();
        sourcesRef.current.delete(taskId);
      }
    });

    source.addEventListener("task-error", () => {
      setMessages((current) =>
        current.map((m) =>
          m.id === messageId ? { ...m, text: "Task failed. Try again.", stage: undefined, stageIndex: undefined } : m,
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
      { id: assistantId, role: "assistant", text: "", stage: "decompose", stageIndex: 1 },
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
        subscribeToTask(data.taskId, assistantId);
      } else {
        setMessages((current) =>
          current.map((m) => (m.id === assistantId ? { ...m, text: data.reply, stage: undefined, stageIndex: undefined } : m)),
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown chat error";
      setMessages((current) =>
        current.map((m) =>
          m.id === assistantId ? { ...m, text: `Request failed: ${message}`, stage: undefined, stageIndex: undefined } : m,
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
            <p className="text-sm font-medium text-foreground">Research chat</p>
            <p className="text-xs text-muted">Ask a question and get a researched answer with web search.</p>
          </div>
          <span className="w-fit rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-medium text-foreground">
            Connected
          </span>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-5">
        {messages.length === 0 ? (
          <div className="grid gap-3 rounded-md border border-dashed border-border bg-surface-muted p-4 text-sm leading-6 text-muted">
            <p className="font-medium text-foreground">Ask a research question.</p>
            <p>The system will search the web and compose a detailed answer.</p>
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
  const isLoading = message.role === "assistant" && message.stage !== undefined;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-4 py-3 text-sm leading-6 shadow-sm whitespace-pre-wrap ${
          isUser
            ? "bg-primary text-primary-foreground"
            : isLoading
              ? "border border-border bg-surface-muted text-muted"
              : "border border-border bg-surface-muted text-foreground"
        }`}
      >
        {isLoading ? (
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              <span className="h-2 w-2 animate-bounce rounded-full bg-muted" style={{ animationDelay: "0ms" }} />
              <span className="h-2 w-2 animate-bounce rounded-full bg-muted" style={{ animationDelay: "150ms" }} />
              <span className="h-2 w-2 animate-bounce rounded-full bg-muted" style={{ animationDelay: "300ms" }} />
            </div>
            <div>
              <p className="font-medium text-foreground">
                {message.stage ? stageLabels[message.stage] || "Processing" : "Processing"}
              </p>
              {message.stageIndex && (
                <p className="text-xs text-muted">
                  Step {message.stageIndex} of {stages.length}
                </p>
              )}
            </div>
          </div>
        ) : (
          message.text
        )}
      </div>
    </div>
  );
}
