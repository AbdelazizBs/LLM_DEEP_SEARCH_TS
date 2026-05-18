import { PageShell } from "../components/PageShell";
import { ChatPanel } from "../features/chat/ChatPanel";

export function ChatPage() {
  return (
    <PageShell
      description="Ask a question, verify the API path, then connect the same surface to the long-running research stream."
      title="Research chat"
    >
      <div className="flex min-h-[calc(100vh-8rem)] flex-col">
        <ChatPanel />
      </div>
    </PageShell>
  );
}
