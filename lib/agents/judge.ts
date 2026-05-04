import Groq from "groq-sdk";
import { JudgeOutputSchema } from "@/lib/schemas";
import { JUDGE_SYSTEM } from "@/lib/rag/templates";
import { withRetry, withTimeout } from "@/lib/retry";
import { createLogger } from "@/lib/logger";
import type { WorkerRawOutput, DiagnosticReport, ProviderResult, Grade, AiProvider } from "@/types";
import type { JudgeOutput } from "@/lib/schemas";

const log = createLogger("judge");

function getGroq() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

function computeGrade(score: number): Grade {
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 50) return "C";
  if (score >= 35) return "D";
  return "F";
}

function extractAllRecos(rawText: string): string[] {
  if (!rawText) return [];
  try {
    const parsed = JSON.parse(rawText.replace(/^```json\s*/i, "").replace(/```$/i, "").trim());
    return parsed?.recommendations?.map((r: { rank: number; name: string; reason: string }) =>
      `${r.rank}. ${r.name} — ${r.reason}`) ?? [];
  } catch { return []; }
}

const FALLBACK: JudgeOutput = {
  providers: {
    gpt:    { rank: null, mentioned: false, snippet: "", sentiment: "undetected", score: 0 },
    claude: { rank: null, mentioned: false, snippet: "", sentiment: "undetected", score: 0 },
    gemini: { rank: null, mentioned: false, snippet: "", sentiment: "undetected", score: 0 },
  },
  recommendations: [{ type: "action", title: "Analysis unavailable", detail: "Please try again." }],
  competitorGaps: [],
};

export async function runJudge(
  productName: string,
  normalizedQuery: string,
  workerOutputs: WorkerRawOutput[],
  jobId: string
): Promise<DiagnosticReport> {
  log.info({ jobId, productName }, "Judge starting");

  const workerSummary = workerOutputs.map((w) =>
    w.error || !w.rawText
      ? `\n## ${w.provider.toUpperCase()} RESULT\nError: ${w.error ?? "No response"}\n`
      : `\n## ${w.provider.toUpperCase()} RESULT\n${w.rawText}\n`
  ).join("\n");

  const userMessage = `Target product: "${productName}"
Search query: "${normalizedQuery}"

Worker outputs:
${workerSummary}

Analyze the above and return your JSON assessment.`;

  const rawOutput = await withRetry(
    () => withTimeout(
      getGroq().chat.completions.create({
        model: "llama-3.3-70b-versatile",
        max_tokens: 800,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: JUDGE_SYSTEM },
          { role: "user", content: userMessage },
        ],
      }),
      30000, "judge"
    ),
    { maxAttempts: 3, baseDelayMs: 1500 }
  );

  const rawText = rawOutput.choices[0]?.message?.content ?? "";
  log.debug({ rawText }, "Judge raw response");

  const cleaned = rawText.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();

  let judgeOutput: JudgeOutput;
  try {
    const result = JudgeOutputSchema.safeParse(JSON.parse(cleaned));
    judgeOutput = result.success ? result.data : FALLBACK;
    if (!result.success) log.error({ issues: result.error.issues }, "Judge validation failed");
  } catch {
    log.error({ rawText }, "Judge parse failed");
    judgeOutput = FALLBACK;
  }

  const providers = (["gpt", "claude", "gemini"] as const).reduce((acc, p) => {
    const analysis = judgeOutput.providers[p];
    const worker = workerOutputs.find((w) => w.provider === p);
    acc[p] = {
      provider: p, rank: analysis.rank, mentioned: analysis.mentioned,
      snippet: analysis.snippet, allRecommendations: extractAllRecos(worker?.rawText ?? ""),
      sentiment: analysis.sentiment, score: analysis.score,
      tokensUsed: worker?.tokensUsed ?? 0, latencyMs: worker?.latencyMs ?? 0, error: worker?.error,
    } satisfies ProviderResult;
    return acc;
  }, {} as Record<AiProvider, ProviderResult>);

  const scores = Object.values(providers).map((p) => p.score);
  const overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const mentionedByCount = Object.values(providers).filter((p) => p.mentioned).length;
  const rankedProviders = Object.values(providers).filter((p) => p.rank !== null);
  const avgRank = rankedProviders.length > 0
    ? Math.round((rankedProviders.reduce((a, p) => a + (p.rank ?? 0), 0) / rankedProviders.length) * 10) / 10
    : null;

  const report: DiagnosticReport = {
    jobId, productName, originalQuery: normalizedQuery, normalizedQuery,
    category: "other", overallScore, grade: computeGrade(overallScore),
    mentionedByCount, avgRank, providers,
    recommendations: judgeOutput.recommendations,
    competitorGaps: judgeOutput.competitorGaps,
    createdAt: new Date().toISOString(),
  };

  log.info({ jobId, overallScore, grade: report.grade }, "Judge complete");
  return report;
}
