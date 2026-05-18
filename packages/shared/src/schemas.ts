import { z } from "zod";

export const taskStatusSchema = z
  .enum(["scheduled", "running", "completed", "failed"])
  .describe("Current lifecycle state of the background research task.");

export const chatRequestSchema = z.object({
  message: z.string().min(1).describe("The user's chat message or research question."),
});

export const chatResponseSchema = z.object({
  reply: z.string().describe("Assistant reply for the current chat turn."),
  mode: z.enum(["stub", "streaming"]).describe("Whether this response is temporary stub behavior or the final stream."),
});

export const subQuestionSchema = z.object({
  text: z.string().describe("A focused sub-question derived from the user's original research question."),
  focus: z.string().describe("The specific angle or boundary this sub-question should investigate."),
});

export const decompositionSchema = z.object({
  subQuestions: z
    .array(subQuestionSchema)
    .min(3)
    .max(5)
    .describe("Three to five focused sub-questions that decompose the original question."),
});

export const researchAngleSchema = z.object({
  angle: z.string().describe("A distinct research angle to explore for the sub-question."),
  hypothesis: z.string().describe("The expected finding or claim to test while researching this angle."),
});

export const researchAnglesSchema = z.object({
  angles: z
    .array(researchAngleSchema)
    .length(3)
    .describe("Exactly three distinct research angles for the sub-question."),
});

export const scoredFindingSchema = z.object({
  angle: z.string().describe("The research angle that produced this finding."),
  finding: z.string().describe("A concise paragraph summarizing the finding."),
  score: z.number().min(0).max(100).describe("Relevance and usefulness score from 0 to 100."),
  rationale: z.string().describe("Short explanation for why this finding received its score."),
});

export const scoredFindingsSchema = z.object({
  topFindings: z
    .array(scoredFindingSchema)
    .length(2)
    .describe("The two strongest findings for this sub-question."),
});

export const reportSectionSchema = z.object({
  title: z.string().describe("Clear title for this section of the final report."),
  body: z.string().describe("Detailed explanation for this section."),
  citations: z
    .array(z.string())
    .describe("Citation labels, source notes, or supporting references used for this section."),
});

export const finalReportSchema = z.object({
  summary: z.string().describe("Executive summary of the complete research result."),
  sections: z.array(reportSectionSchema).describe("Main sections of the final report."),
  confidence: z
    .enum(["low", "medium", "high"])
    .describe("Overall confidence level based on the quality and consistency of findings."),
});

export type TaskStatus = z.infer<typeof taskStatusSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type ChatResponse = z.infer<typeof chatResponseSchema>;
export type Decomposition = z.infer<typeof decompositionSchema>;
export type SubQuestion = z.infer<typeof subQuestionSchema>;
export type ResearchAngles = z.infer<typeof researchAnglesSchema>;
export type ScoredFinding = z.infer<typeof scoredFindingSchema>;
export type ScoredFindings = z.infer<typeof scoredFindingsSchema>;
export type FinalReport = z.infer<typeof finalReportSchema>;
