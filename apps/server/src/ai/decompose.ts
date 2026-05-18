import { decompositionSchema, type Decomposition } from "@deep-research/shared";
import { generateText, Output } from "ai";
import { modelFor } from "./provider";
import { withUsage } from "./withUsage";

const fallbackDecomposition = (question: string): Decomposition => ({
  subQuestions: [
    {
      text: `What is the direct answer to: ${question}`,
      focus: "Core facts and primary tradeoffs.",
    },
    {
      text: `What evidence or examples matter most for: ${question}`,
      focus: "Supporting details and practical examples.",
    },
    {
      text: `What risks, limitations, or counterarguments affect: ${question}`,
      focus: "Caveats and confidence boundaries.",
    },
  ],
});

export async function decomposeQuestion(question: string) {
  try {
    const result = await withUsage({ label: "decompose", role: "decompose" }, () =>
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
        maxRetries: 3,
        timeout: 60_000,
      }),
    );

    return result.output;
  } catch {
    return fallbackDecomposition(question);
  }
}
