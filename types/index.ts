// ─── Core domain types ────────────────────────────────────────────────────────

export type AiProvider = "gpt" | "claude" | "gemini";

export type Grade = "A" | "B" | "C" | "D" | "F";

export type QueryCategory =
  | "supplements"
  | "electronics"
  | "footwear"
  | "beauty"
  | "home"
  | "fitness"
  | "food"
  | "other";

// ─── Request / Response shapes ────────────────────────────────────────────────

export interface DiagnoseRequest {
  productName: string;
  query: string;
  competitors: string[];
}

export interface DiagnoseResponse {
  jobId: string;
}

// ─── Agent types ──────────────────────────────────────────────────────────────

export interface OrchestratorOutput {
  normalizedQuery: string;
  category: QueryCategory;
  promptTemplate: string;
  competitorList: string[];
}

export interface WorkerRawOutput {
  provider: AiProvider;
  rawText: string;
  tokensUsed: number;
  latencyMs: number;
  error?: string;
}

export interface Recommendation {
  type: "gap" | "strength" | "action";
  provider?: AiProvider;
  title: string;
  detail: string;
}

export interface ProviderResult {
  provider: AiProvider;
  rank: number | null;
  mentioned: boolean;
  snippet: string;
  allRecommendations: string[];
  sentiment: "positive" | "neutral" | "negative" | "undetected";
  score: number;
  tokensUsed: number;
  latencyMs: number;
  error?: string;
}

export interface DiagnosticReport {
  jobId: string;
  productName: string;
  originalQuery: string;
  normalizedQuery: string;
  category: QueryCategory;
  overallScore: number;
  grade: Grade;
  mentionedByCount: number;
  avgRank: number | null;
  providers: Record<AiProvider, ProviderResult>;
  recommendations: Recommendation[];
  competitorGaps: CompetitorGap[];
  createdAt: string;
}

export interface CompetitorGap {
  competitorName: string;
  appearsInProviders: AiProvider[];
  yourRank: number | null;
  theirBestRank: number;
}

// ─── Job / Queue types ────────────────────────────────────────────────────────

export type JobStatus =
  | "queued"
  | "orchestrating"
  | "running"
  | "judging"
  | "done"
  | "failed";

export interface JobState {
  jobId: string;
  status: JobStatus;
  progress: Partial<Record<AiProvider, ProviderResult>>;
  report?: DiagnosticReport;
  error?: string;
  createdAt: string;
}

// ─── History types ────────────────────────────────────────────────────────────

export interface HistoryRun {
  jobId: string;
  productName: string;
  query: string;
  overallScore: number;
  grade: Grade;
  providers: Record<AiProvider, { rank: number | null; score: number }>;
  createdAt: string;
}
