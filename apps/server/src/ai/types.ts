import type { FinalReport, ScoredFinding, SubQuestion } from "@deep-research/shared";
import type { LedgerEntry } from "./ledger";

export type PipelineRunContext = {
  taskId?: string;
  onUsage?: (entry: LedgerEntry) => void | Promise<void>;
};

export type PipelineEvent =
  | {
      type: "stage-started";
      stage: "decompose" | "research" | "synthesize";
      message: string;
    }
  | {
      type: "stage-completed";
      stage: "decompose";
      subQuestions: SubQuestion[];
    }
  | {
      type: "stage-completed";
      stage: "research";
      findings: ResearchResult[];
    }
  | {
      type: "stage-completed";
      stage: "synthesize";
      report: FinalReport;
    }
  | {
      type: "ledger";
      entry: LedgerEntry;
    }
  | {
      type: "task-error";
      message: string;
    };

export type PipelineEventHandler = (event: PipelineEvent) => void | Promise<void>;

export type ResearchResult = {
  subQuestion: SubQuestion;
  topFindings: ScoredFinding[];
};
