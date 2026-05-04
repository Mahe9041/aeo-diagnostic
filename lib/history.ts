import { createClient } from "@supabase/supabase-js";
import { createLogger } from "@/lib/logger";
import type { DiagnosticReport, HistoryRun } from "@/types";

const log = createLogger("history");

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function saveRunToHistory(report: DiagnosticReport): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("diagnostic_runs").insert({
    job_id: report.jobId,
    product_name: report.productName,
    query: report.originalQuery,
    normalized_query: report.normalizedQuery,
    category: report.category,
    overall_score: report.overallScore,
    grade: report.grade,
    mentioned_by_count: report.mentionedByCount,
    avg_rank: report.avgRank,
    gpt_rank: report.providers.gpt.rank,
    gpt_score: report.providers.gpt.score,
    claude_rank: report.providers.claude.rank,
    claude_score: report.providers.claude.score,
    gemini_rank: report.providers.gemini.rank,
    gemini_score: report.providers.gemini.score,
    full_report: report,
  });
  if (error) { log.error({ error }, "Failed to save run"); throw new Error(error.message); }
  log.info({ jobId: report.jobId }, "Run saved to history");
}

export async function getHistory(
  productName: string,
  query?: string,
  limit = 20
): Promise<HistoryRun[]> {
  const supabase = getSupabase();
  let builder = supabase
    .from("diagnostic_runs")
    .select("job_id,product_name,query,overall_score,grade,gpt_rank,gpt_score,claude_rank,claude_score,gemini_rank,gemini_score,created_at")
    .eq("product_name", productName)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (query) builder = builder.eq("query", query);
  const { data, error } = await builder;
  if (error) { log.error({ error }, "Failed to fetch history"); return []; }
  return (data ?? []).map((row) => ({
    jobId: row.job_id,
    productName: row.product_name,
    query: row.query,
    overallScore: row.overall_score,
    grade: row.grade,
    providers: {
      gpt: { rank: row.gpt_rank, score: row.gpt_score },
      claude: { rank: row.claude_rank, score: row.claude_score },
      gemini: { rank: row.gemini_rank, score: row.gemini_score },
    },
    createdAt: row.created_at,
  }));
}
