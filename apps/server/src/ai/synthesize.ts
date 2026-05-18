import { finalReportSchema, type FinalReport } from "@deep-research/shared";
import { generateText, Output } from "ai";
import { modelFor } from "./provider";
import type { ResearchResult } from "./types";
import { withUsage } from "./withUsage";

const fallbackReport = (question: string, findings: ResearchResult[]): FinalReport => ({
  summary: `A complete live synthesis could not be generated for "${question}". The fallback report preserves the final report shape and includes the available intermediate findings.`,
  sections: findings.map((result) => ({
    title: result.subQuestion.text,
    body: result.topFindings.map((finding) => finding.finding).join("\n\n"),
    citations: [],
  })),
  confidence: "low",
});

export async function synthesizeReport(question: string, findings: ResearchResult[]) {
  try {
    const result = await withUsage({ label: "synthesize", role: "synthesize" }, () =>
      generateText({
        model: modelFor("synthesize"),
        output: Output.object({
          schema: finalReportSchema,
          name: "FinalReport",
          description: "A concise final report synthesized from the strongest research findings.",
        }),
        providerOptions: {
          openrouter: {
            reasoning: {
              effort: "low",
              exclude: true,
            },
          },
        },
        system:
          "You synthesize research findings into a useful final report. Do not invent source URLs. Return only schema-valid structured output.",
        prompt: JSON.stringify(
          {
            question,
            findings,
            instruction:
              "Create a final report with a summary, clear sections, citation notes if present, and an honest confidence value.",
          },
          null,
          2,
        ),
        maxRetries: 3,
        timeout: 90_000,
      }),
    );

    return result.output;
  } catch {
    return fallbackReport(question, findings);
  }
}
