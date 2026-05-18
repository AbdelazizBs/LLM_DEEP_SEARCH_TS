import type { FinalReport } from "@deep-research/shared";
import { getLedgerEntries } from "./ledger";
import { decomposeQuestion } from "./decompose";
import { researchSubQuestions } from "./research";
import { synthesizeReport } from "./synthesize";
import type { PipelineEventHandler, ResearchResult } from "./types";

export type PipelineResult = {
  question: string;
  findings: ResearchResult[];
  report: FinalReport;
};

export async function runResearchPipeline(question: string, onEvent?: PipelineEventHandler): Promise<PipelineResult> {
  await onEvent?.({
    type: "stage-started",
    stage: "decompose",
    message: "Breaking the question into focused sub-questions.",
  });

  const decomposition = await decomposeQuestion(question);
  await onEvent?.({
    type: "stage-completed",
    stage: "decompose",
    subQuestions: decomposition.subQuestions,
  });
  await onEvent?.({
    type: "ledger",
    entries: getLedgerEntries(),
  });

  await onEvent?.({
    type: "stage-started",
    stage: "research",
    message: "Researching each sub-question in parallel.",
  });
  const findings = await researchSubQuestions(decomposition.subQuestions);
  await onEvent?.({
    type: "stage-completed",
    stage: "research",
    findings,
  });
  await onEvent?.({
    type: "ledger",
    entries: getLedgerEntries(),
  });

  await onEvent?.({
    type: "stage-started",
    stage: "synthesize",
    message: "Synthesizing the final report.",
  });
  const report = await synthesizeReport(question, findings);
  await onEvent?.({
    type: "stage-completed",
    stage: "synthesize",
    report,
  });
  await onEvent?.({
    type: "ledger",
    entries: getLedgerEntries(),
  });

  return {
    question,
    findings,
    report,
  };
}
