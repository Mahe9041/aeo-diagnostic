import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { DiagnoseRequestSchema } from "@/lib/schemas";
import { setJobState } from "@/lib/redis";
import { runDiagnosticPipeline } from "@/lib/pipeline";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/diagnose");

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = DiagnoseRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 422 });
  }

  const jobId = randomUUID();

  await setJobState({
    jobId,
    status: "queued",
    progress: {},
    createdAt: new Date().toISOString(),
  });

  void runDiagnosticPipeline(jobId, parsed.data).catch((err) => {
    log.error({ jobId, err }, "Unhandled pipeline error");
  });

  log.info({ jobId }, "Job enqueued");
  return NextResponse.json({ jobId }, { status: 202 });
}
