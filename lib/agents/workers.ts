import Groq from "groq-sdk";
import { WorkerResponseSchema } from "@/lib/schemas";
import { PROMPT_TEMPLATES } from "@/lib/rag/templates";
import { withRetry, withTimeout } from "@/lib/retry";
import { llmSemaphore } from "@/lib/semaphore";
import { createLogger } from "@/lib/logger";
import type { AiProvider, WorkerRawOutput, QueryCategory } from "@/types";

const log = createLogger("worker");

function getGroq() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

const PROVIDER_MODELS: Record<AiProvider, string> = {
  gpt:    "llama-3.3-70b-versatile",
  claude: "llama-3.1-8b-instant",
  gemini: "llama-3.1-8b-instant",
};

export async function runWorker(
  provider: AiProvider,
  normalizedQuery: string,
  category: QueryCategory,
  productName: string,
  competitors: string[]
): Promise<WorkerRawOutput> {
  const start = Date.now();
  const template = PROMPT_TEMPLATES[category];
  const userMessage = `${template.userPrefix} "${normalizedQuery}"

Context: The customer is considering: ${productName}. Other options include: ${competitors.slice(0, 8).join(", ")}.

Return your top 5 recommendations as JSON.`;

  log.info({ provider, normalizedQuery }, "Worker starting");

  return llmSemaphore.run(async () => {
    try {
      const resp = await withRetry(
        () => withTimeout(
          getGroq().chat.completions.create({
            model: PROVIDER_MODELS[provider],
            max_tokens: 400,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: template.system },
              { role: "user", content: userMessage },
            ],
          }),
          20000, `${provider}-worker`
        ),
        { maxAttempts: 3, baseDelayMs: 1000 }
      );

      const text = resp.choices[0]?.message?.content ?? "";
      const tokens = (resp.usage?.prompt_tokens ?? 0) + (resp.usage?.completion_tokens ?? 0);

      const cleaned = text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
      const validation = WorkerResponseSchema.safeParse(JSON.parse(cleaned));
      if (!validation.success) log.warn({ provider, issues: validation.error.issues }, "Schema validation failed");

      const latencyMs = Date.now() - start;
      log.info({ provider, latencyMs, tokens }, "Worker complete");
      return { provider, rawText: text, tokensUsed: tokens, latencyMs };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      log.error({ provider, error }, "Worker failed");
      return { provider, rawText: "", tokensUsed: 0, latencyMs: Date.now() - start, error };
    }
  });
}

export async function runAllWorkers(
  normalizedQuery: string,
  category: QueryCategory,
  productName: string,
  competitors: string[]
): Promise<WorkerRawOutput[]> {
  const providers: AiProvider[] = ["gpt", "claude", "gemini"];
  log.info({ normalizedQuery }, "Fanning out to all 3 workers");

  const results = await Promise.allSettled(
    providers.map((p) => runWorker(p, normalizedQuery, category, productName, competitors))
  );

  return results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    return { provider: providers[i], rawText: "", tokensUsed: 0, latencyMs: 0, error: String(r.reason) };
  });
}
