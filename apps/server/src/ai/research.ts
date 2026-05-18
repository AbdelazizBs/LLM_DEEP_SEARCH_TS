import {
  researchAnglesSchema,
  scoredFindingsSchema,
  type ScoredFinding,
  type SubQuestion,
} from "@deep-research/shared";
import { generateText, Output } from "ai";
import { modelFor } from "./provider";
import type { ResearchResult } from "./types";
import { withUsage } from "./withUsage";

type DraftFinding = {
  angle: string;
  hypothesis: string;
  finding: string;
};

const fallbackFindings = (subQuestion: SubQuestion): ScoredFinding[] => [
  {
    angle: "Baseline analysis",
    finding: `The pipeline could not complete live research for "${subQuestion.text}", so this fallback records the need to answer the core question directly.`,
    score: 60,
    rationale: "Fallback item preserves downstream shape after a handled model error.",
  },
  {
    angle: "Risk analysis",
    finding: `The answer should explicitly call out uncertainty, missing source material, and assumptions for "${subQuestion.focus}".`,
    score: 55,
    rationale: "Fallback item keeps synthesis aware of limitations.",
  },
];

export async function researchSubQuestions(subQuestions: SubQuestion[]) {
  const results = await Promise.all(subQuestions.map((subQuestion) => researchOneSubQuestion(subQuestion)));
  return results;
}

async function researchOneSubQuestion(subQuestion: SubQuestion): Promise<ResearchResult> {
  try {
    const anglesResult = await withUsage({ label: "research.angles", role: "angles" }, () =>
      generateText({
        model: modelFor("angles"),
        output: Output.object({
          schema: researchAnglesSchema,
          name: "ResearchAngles",
          description: "Three distinct angles for investigating one sub-question.",
        }),
        system: "You create distinct research angles for a sub-question. Return only schema-valid structured output.",
        prompt: `Sub-question: ${subQuestion.text}\nFocus: ${subQuestion.focus}`,
        maxRetries: 3,
        timeout: 60_000,
      }),
    );

    const draftFindings = await Promise.all(
      anglesResult.output.angles.map(async (angle) => {
        const findingResult = await withUsage({ label: "research.finding", role: "findings" }, () =>
          generateText({
            model: modelFor("findings"),
            system:
              "You write concise research findings. Be specific, practical, and honest about uncertainty. Do not invent URLs.",
            prompt: [
              `Sub-question: ${subQuestion.text}`,
              `Focus: ${subQuestion.focus}`,
              `Angle: ${angle.angle}`,
              `Hypothesis: ${angle.hypothesis}`,
              "Draft one short findings paragraph.",
            ].join("\n"),
            maxRetries: 3,
            timeout: 60_000,
          }),
        );

        return {
          ...angle,
          finding: findingResult.text,
        } satisfies DraftFinding;
      }),
    );

    const scoringResult = await withUsage({ label: "research.scoring", role: "scoring" }, () =>
      generateText({
        model: modelFor("scoring"),
        output: Output.object({
          schema: scoredFindingsSchema,
          name: "ScoredFindings",
          description: "The two strongest findings for a sub-question, ranked by usefulness.",
        }),
        system: "You rank research findings by usefulness and relevance. Return only schema-valid structured output.",
        prompt: JSON.stringify(
          {
            subQuestion,
            findings: draftFindings,
            instruction: "Pick exactly the top 2 findings and score each from 0 to 100.",
          },
          null,
          2,
        ),
        maxRetries: 3,
        timeout: 60_000,
      }),
    );

    return {
      subQuestion,
      topFindings: scoringResult.output.topFindings,
    };
  } catch {
    return {
      subQuestion,
      topFindings: fallbackFindings(subQuestion),
    };
  }
}
