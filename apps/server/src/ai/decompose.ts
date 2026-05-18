import { decompositionSchema, type Decomposition } from "@deep-research/shared";
import { generateText, Output } from "ai";
import { env } from "../config/env";
import { modelFor } from "./provider";
import type { PipelineRunContext } from "./types";
import { withUsage } from "./withUsage";

const fallbackDecomposition = (question: string): Decomposition => ({
  subQuestions: [
    {
      text: `What are the key facts about ${question}`,
      focus: "Core answer and main points.",
    },
    {
      text: `What are the practical implications of ${question}`,
      focus: "Real-world context and examples.",
    },
    {
      text: `What are the limitations or caveats regarding ${question}`,
      focus: "Uncertainty and boundaries.",
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
