export function ChatComposer() {
  return (
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
  );
}
