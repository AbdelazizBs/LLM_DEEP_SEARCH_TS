import { useState } from "react";

type ChatComposerProps = {
  disabled?: boolean;
  onSend: (message: string) => void;
};

export function ChatComposer({ disabled = false, onSend }: ChatComposerProps) {
  const [message, setMessage] = useState("");

  const canSubmit = message.trim().length > 0 && !disabled;

  return (
    <form
      className="border-t border-neutral-200 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!canSubmit) return;

        onSend(message.trim());
        setMessage("");
      }}
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          className="min-w-0 flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-surface-muted"
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Ask a research question..."
          disabled={disabled}
          value={message}
        />
        <button
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!canSubmit}
        >
          {disabled ? "Sending..." : "Send"}
        </button>
      </div>
    </form>
  );
}
