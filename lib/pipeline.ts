import crypto from "crypto";
import { runOrchestrator } from "@/lib/agents/orchestrator";
import { runAllWorkers } from "@/lib/agents/workers";
import { runJudge } from "@/lib/agents/judge";
import { setJobState, getCachedReport, setCachedReport } from "@/lib/redis";
import { pipelineSemaphore } from "@/lib/semaphore";
import { saveRunToHistory } from "@/lib/history";
import { createLogger } from "@/lib/logger";
import type { DiagnoseRequest, JobState } from "@/types";

const log = createLogger("pipeline");
const CACHE_TTL = parseInt(process.env.CACHE_TTL_SECONDS ?? "21600", 10);

function buildCacheKey(productName: string, query: string): string {
  return crypto
    .createHash("sha256")
    .update(`${productName.toLowerCase().trim()}::${query.toLowerCase().trim()}`)
    .digest("hex")
    .slice(0, 16);
}

export async function runDiagnosticPipeline(jobId: string, request: DiagnoseRequest): Promise<void> {
  const { productName, query, competitors } = request;
  log.info({ jobId, productName, query }, "Pipeline starting");

  return pipelineSemaphore.run(async () => {
    try {
      const cacheKey = buildCacheKey(productName, query);
      const cached = await getCachedReport(cacheKey);
      if (cached) {
        await setJobState({ ...cached, jobId, status: "done" });
        log.info({ jobId }, "Served from cache");
        return;
      }

      await setJobState({ jobId, status: "orchestrating", progress: {}, createdAt: new Date().toISOString() });
      const orchestratorOutput = await runOrchestrator({ productName, rawQuery: query, userCompetitors: competitors });

      await setJobState({ jobId, status: "running", progress: {}, createdAt: new Date().toISOString() });
      const workerOutputs = await runAllWorkers(
        orchestratorOutput.normalizedQuery,
        orchestratorOutput.category,
        productName,
        orchestratorOutput.competitorList
      );

      await setJobState({ jobId, status: "judging", progress: {}, createdAt: new Date().toISOString() });
      const report = await runJudge(productName, orchestratorOutput.normalizedQuery, workerOutputs, jobId);
      report.category = orchestratorOutput.category;
      report.originalQuery = query;

      const finalState: JobState = { jobId, status: "done", progress: {}, report, createdAt: new Date().toISOString() };

      await Promise.all([
        setJobState(finalState),
        setCachedReport(cacheKey, finalState, CACHE_TTL),
        saveRunToHistory(report).catch((err) => log.error({ err }, "History save failed (non-fatal)")),
      ]);

      log.info({ jobId, score: report.overallScore, grade: report.grade }, "Pipeline complete");
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      log.error({ jobId, error }, "Pipeline failed");
      await setJobState({ jobId, status: "failed", progress: {}, error, createdAt: new Date().toISOString() });
    }
  });
}
