import { resetLedger, summarizeLedger } from "./ledger";
import { runResearchPipeline } from "./pipeline";

const question =
  Bun.argv.slice(2).join(" ") ||
  "What are the main tradeoffs between SQLite, DuckDB, and Postgres for analytics workloads?";

resetLedger();

console.log(`Question: ${question}`);

const result = await runResearchPipeline(question, (event) => {
  if (event.type === "stage-started") {
    console.log(`\n[${event.stage}] ${event.message}`);
    return;
  }

  if (event.type === "stage-completed") {
    console.log(`[${event.stage}] completed`);
    return;
  }

  if (event.type === "ledger") {
    const summary = summarizeLedger();
    console.log(
      `[ledger] calls=${summary.calls} input=${summary.inputTokens} output=${summary.outputTokens} reasoning=${summary.reasoningTokens} cost=$${summary.costUsd.toFixed(6)}`,
    );
  }
});

console.log("\nFinal report:");
console.log(JSON.stringify(result.report, null, 2));
