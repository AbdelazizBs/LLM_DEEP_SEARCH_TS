import { PageShell } from "../components/PageShell";
import { ChatPanel } from "../features/chat/ChatPanel";

export function ChatPage() {
  return (
    <PageShell title="Research chat">
      <div className="flex min-h-[calc(100vh-8rem)] flex-col">
        <ChatPanel />
      </div>
    </PageShell>
  );
}
