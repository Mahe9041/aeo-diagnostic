import Groq from "groq-sdk";
import { OrchestratorOutputSchema } from "@/lib/schemas";
import { ORCHESTRATOR_SYSTEM, COMPETITOR_SEEDS } from "@/lib/rag/templates";
import { withRetry, withTimeout } from "@/lib/retry";
import { createLogger } from "@/lib/logger";
import type { QueryCategory } from "@/types";
import type { OrchestratorOutput } from "@/lib/schemas";

const log = createLogger("orchestrator");

function getGroq() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

export async function runOrchestrator(input: {
  productName: string;
  rawQuery: string;
  userCompetitors: string[];
}): Promise<OrchestratorOutput> {
  const { productName, rawQuery, userCompetitors } = input;
  log.info({ productName, rawQuery }, "Orchestrator starting");

  const userMessage = `Product name: "${productName}"
User query: "${rawQuery}"
User-provided competitors: ${userCompetitors.length > 0 ? userCompetitors.join(", ") : "none"}
Analyze this and return the JSON response.`;

  const rawOutput = await withRetry(
    () => withTimeout(
      getGroq().chat.completions.create({
        model: "llama-3.3-70b-versatile",
        max_tokens: 400,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: ORCHESTRATOR_SYSTEM },
          { role: "user", content: userMessage },
        ],
      }),
      15000, "orchestrator"
    ),
    { maxAttempts: 3, baseDelayMs: 1000 }
  );

  const rawText = rawOutput.choices[0]?.message?.content ?? "";
  log.debug({ rawText }, "Orchestrator raw response");

  const cleaned = rawText.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();

  let parsed: unknown;
  try { parsed = JSON.parse(cleaned); }
  catch {
    log.error({ rawText }, "Orchestrator parse failed — using fallback");
    return { normalizedQuery: rawQuery, category: "other", promptTemplate: "other", competitorList: userCompetitors };
  }

  const result = OrchestratorOutputSchema.safeParse(parsed);
  if (!result.success) {
    log.error({ issues: result.error.issues }, "Orchestrator validation failed");
    return { normalizedQuery: rawQuery, category: "other", promptTemplate: "other", competitorList: userCompetitors };
  }

  const seeds = COMPETITOR_SEEDS[result.data.category as QueryCategory] ?? [];
  const merged = Array.from(new Set([...result.data.competitorList, ...seeds])).slice(0, 12);

  log.info({ normalizedQuery: result.data.normalizedQuery, category: result.data.category }, "Orchestrator complete");
  return { ...result.data, competitorList: merged };
}
