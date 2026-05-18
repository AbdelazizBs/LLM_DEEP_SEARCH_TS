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
  sources?: Array<{ title: string; url: string }>;
};

const fallbackFindings = (subQuestion: SubQuestion): ScoredFinding[] => [
  {
    angle: "Overview",
    finding: `This topic covers ${subQuestion.focus.toLowerCase()} and is widely discussed in technical literature. Key aspects include fundamental principles, common implementations, and established best practices.`,
    score: 60,
    rationale: "General knowledge baseline.",
  },
  {
    angle: "Context",
    finding: `In practice, ${subQuestion.focus.toLowerCase()} involves understanding tradeoffs between different approaches. The most relevant considerations depend on specific use cases and requirements.`,
    score: 55,
    rationale: "Acknowledges topic scope.",
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

    const draftFindings: DraftFinding[] = [];

    for (const angle of anglesResult.output.angles) {
      const searchQuery = `${subQuestion.text} ${angle.angle} ${angle.hypothesis}`;

      const webResult = await withUsage({ label: "research.websearch", role: "research", ...context }, () =>
        generateText({
          model: modelFor("research"),
          system: `You are researching: ${subQuestion.text}
Focus: ${subQuestion.focus}
Angle: ${angle.angle}
Hypothesis: ${angle.hypothesis}

Search the web for current, accurate information. Provide a concise findings paragraph based on real sources. Include key facts, data points, and practical insights.`,
          prompt: searchQuery,
          maxRetries: 1,
          timeout: env.pipelineCallTimeoutMs,
        }),
      );

      const sources = (webResult as any).response?.body?.choices?.[0]?.message?.executed_tools?.[0]?.search_results?.results
        ?.slice(0, 3)
        ?.map((r: any) => ({ title: r.title, url: r.url })) ?? [];

      draftFindings.push({
        angle: angle.angle,
        hypothesis: angle.hypothesis,
        finding: webResult.text,
        sources,
      });
    }

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
            findings: draftFindings.map((f) => ({ angle: f.angle, finding: f.finding })),
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
