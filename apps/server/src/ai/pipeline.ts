import type { FinalReport } from "@deep-research/shared";
import { env } from "../config/env";
import { decomposeQuestion } from "./decompose";
import { researchSubQuestions } from "./research";
import { synthesizeReport } from "./synthesize";
import type { PipelineEventHandler, PipelineRunContext, ResearchResult } from "./types";

export type PipelineResult = {
  question: string;
  findings: ResearchResult[];
  report: FinalReport;
};

export async function runResearchPipeline(
  question: string,
  onEvent?: PipelineEventHandler,
  context: Omit<PipelineRunContext, "onUsage"> = {},
): Promise<PipelineResult> {
  const runContext: PipelineRunContext = {
    ...context,
    onUsage: async (entry) => {
      await onEvent?.({
        type: "ledger",
        entry,
      });
    },
  };

  await onEvent?.({
    type: "stage-started",
    stage: "decompose",
    message: "Breaking the question into focused sub-questions.",
  });

  const decomposition = await decomposeQuestion(question, runContext);
  const subQuestions = decomposition.subQuestions.slice(0, env.pipelineMaxSubQuestions);
  await onEvent?.({
    type: "stage-completed",
    stage: "decompose",
    subQuestions,
  });
  await onEvent?.({
    type: "stage-started",
    stage: "research",
    message: "Researching each sub-question in parallel.",
  });
  const findings = await researchSubQuestions(subQuestions, runContext);
  await onEvent?.({
    type: "stage-completed",
    stage: "research",
    findings,
  });
  await onEvent?.({
    type: "stage-started",
    stage: "synthesize",
    message: "Synthesizing the final report.",
  });
  const report = await synthesizeReport(question, findings, runContext);
  await onEvent?.({
    type: "stage-completed",
    stage: "synthesize",
    report,
  });
  return {
    question,
    findings,
    report,
  };
}
