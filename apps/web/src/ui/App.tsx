export function App() {
  const isAdmin = window.location.pathname.startsWith("/admin");

  if (isAdmin) {
    return <AdminPage />;
  }

  return <ChatPage />;
}

function ChatPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-5 py-6">
      <header className="mb-5 border-b border-neutral-200 pb-4">
        <p className="text-sm font-medium text-neutral-500">Deep Dive Research Agent</p>
        <h1 className="mt-1 text-2xl font-semibold text-neutral-950">Research chat</h1>
      </header>

      <section className="flex flex-1 flex-col rounded-lg border border-neutral-200 bg-white">
        <div className="flex-1 p-5">
          <div className="rounded-md border border-dashed border-neutral-300 p-4 text-sm text-neutral-600">
            Chat UI will connect to the AI SDK transport after the pipeline and scheduler are in place.
          </div>
        </div>

        <form className="border-t border-neutral-200 p-4">
          <div className="flex gap-3">
            <input
              className="min-w-0 flex-1 rounded-md border border-neutral-300 px-3 py-2 outline-none focus:border-neutral-950"
              placeholder="Ask a research question..."
              disabled
            />
            <button
              className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled
            >
              Send
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

function AdminPage() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-5 py-6">
      <header className="mb-5 border-b border-neutral-200 pb-4">
        <p className="text-sm font-medium text-neutral-500">Deep Dive Research Agent</p>
        <h1 className="mt-1 text-2xl font-semibold text-neutral-950">Admin</h1>
      </header>

      <section className="rounded-lg border border-neutral-200 bg-white p-5">
        <div className="rounded-md border border-dashed border-neutral-300 p-4 text-sm text-neutral-600">
          Task table and telemetry drawer will be added after the database and scheduler are implemented.
        </div>
      </section>
    </main>
  );
}
