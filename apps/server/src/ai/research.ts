import {
  researchAnglesSchema,
  scoredFindingsSchema,
  type ScoredFinding,
  type SubQuestion,
} from "@deep-research/shared";
import { generateText, Output } from "ai";
import { env } from "../config/env";
import { modelFor } from "./provider";
import type { PipelineRunContext, ResearchResult } from "./types";
import { withUsage } from "./withUsage";

type DraftFinding = {
  angle: string;
  hypothesis: string;
  finding: string;
};

const fallbackFindings = (subQuestion: SubQuestion): ScoredFinding[] => [
  {
    angle: "Overview",
    finding: `Based on general knowledge: ${subQuestion.text}. A thorough live search was not available, so this summary reflects established understanding of the topic.`,
    score: 60,
    rationale: "General knowledge baseline — no live source verification.",
  },
  {
    angle: "Context",
    finding: `Regarding ${subQuestion.focus}: practical applications and examples exist but require verified sources for full detail.`,
    score: 55,
    rationale: "Acknowledges topic scope without unverified specifics.",
  },
];

export async function researchSubQuestions(subQuestions: SubQuestion[], context: PipelineRunContext = {}) {
  const results = await Promise.all(subQuestions.map((subQuestion) => researchOneSubQuestion(subQuestion, context)));
  return results;
}

async function researchOneSubQuestion(
  subQuestion: SubQuestion,
  context: PipelineRunContext = {},
): Promise<ResearchResult> {
  try {
    const anglesResult = await withUsage({ label: "research.angles", role: "angles", ...context }, () =>
      generateText({
        model: modelFor("angles"),
        output: Output.object({
          schema: researchAnglesSchema,
          name: "ResearchAngles",
          description: "Three distinct angles for investigating one sub-question.",
        }),
        system: "You create distinct research angles for a sub-question. Return only schema-valid structured output.",
        prompt: `Sub-question: ${subQuestion.text}\nFocus: ${subQuestion.focus}`,
        maxRetries: 1,
        timeout: env.pipelineCallTimeoutMs,
      }),
    );

    const draftFindings = await Promise.all(
      anglesResult.output.angles.map(async (angle) => {
        const findingResult = await withUsage({ label: "research.finding", role: "findings", ...context }, () =>
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
            maxRetries: 1,
            timeout: env.pipelineCallTimeoutMs,
          }),
        );

        return {
          ...angle,
          finding: findingResult.text,
        } satisfies DraftFinding;
      }),
    );

    const scoringResult = await withUsage({ label: "research.scoring", role: "scoring", ...context }, () =>
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
        maxRetries: 1,
        timeout: env.pipelineCallTimeoutMs,
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
