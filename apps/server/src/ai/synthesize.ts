import { finalReportSchema, type FinalReport } from "@deep-research/shared";
import { generateText, Output } from "ai";
import { env } from "../config/env";
import { modelFor } from "./provider";
import type { PipelineRunContext, ResearchResult } from "./types";
import { withUsage } from "./withUsage";

const fallbackReport = (_question: string, findings: ResearchResult[]): FinalReport => {
  const summaryParts = findings.map((f) => {
    const text = f.topFindings.map((t) => t.finding).join(" ");
    return text;
  });

  return {
    summary: summaryParts.join(" "),
    sections: findings.map((result) => ({
      title: result.subQuestion.text,
      body: result.topFindings.map((finding) => finding.finding).join("\n\n"),
      citations: [],
    })),
    confidence: "low",
  };
};

export async function synthesizeReport(question: string, findings: ResearchResult[], context: PipelineRunContext = {}) {
  try {
    const result = await withUsage({ label: "synthesize", role: "synthesize", ...context }, () =>
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
        maxRetries: 1,
        timeout: env.pipelineCallTimeoutMs,
      }),
    );

    return result.output;
  } catch {
    return fallbackReport(question, findings);
  }
}
