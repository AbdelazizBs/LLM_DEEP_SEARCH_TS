import { PlaceholderPanel } from "../../components/PlaceholderPanel";
import { ChatComposer } from "./ChatComposer";

export function ChatPanel() {
  return (
    <section className="flex flex-1 flex-col rounded-lg border border-neutral-200 bg-white">
      <div className="flex-1 p-5">
        <PlaceholderPanel>
          Chat UI will connect to the AI SDK transport after the pipeline and scheduler are in place.
        </PlaceholderPanel>
      </div>

      <ChatComposer />
    </section>
  );
}
