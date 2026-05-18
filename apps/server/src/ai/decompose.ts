import { decompositionSchema, type Decomposition } from "@deep-research/shared";
import { generateText, Output } from "ai";
import { env } from "../config/env";
import { modelFor } from "./provider";
import type { PipelineRunContext } from "./types";
import { withUsage } from "./withUsage";

const fallbackDecomposition = (question: string): Decomposition => ({
  subQuestions: [
    {
      text: `Definition and core concepts of ${question}`,
      focus: "What it is and how it works.",
    },
    {
      text: `Practical applications of ${question}`,
      focus: "Real-world usage and examples.",
    },
    {
      text: `Key considerations for ${question}`,
      focus: "Important context and tradeoffs.",
    },
  ],
});

export async function decomposeQuestion(question: string, context: PipelineRunContext = {}) {
  try {
    const result = await withUsage({ label: "decompose", role: "decompose", ...context }, () =>
      generateText({
        model: modelFor("decompose"),
        output: Output.object({
          schema: decompositionSchema,
          name: "QuestionDecomposition",
          description: "Focused research sub-questions for a deep-dive answer.",
        }),
        system:
          "You decompose broad research questions into practical sub-questions. Return only schema-valid structured output.",
        prompt: `Break this research question into 3 to 5 focused sub-questions:\n\n${question}`,
        maxRetries: 1,
        timeout: env.pipelineCallTimeoutMs,
      }),
    );

    return result.output;
  } catch {
    return fallbackDecomposition(question);
  }
}
