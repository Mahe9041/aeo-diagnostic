import { NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/health");

export async function GET() {
  const checks: Record<string, "ok" | "missing" | "error"> = {};

  const requiredKeys = [
    "OPENAI_API_KEY","ANTHROPIC_API_KEY","GOOGLE_API_KEY",
    "UPSTASH_REDIS_REST_URL","UPSTASH_REDIS_REST_TOKEN",
    "NEXT_PUBLIC_SUPABASE_URL","SUPABASE_SERVICE_ROLE_KEY",
  ];

  for (const key of requiredKeys) {
    checks[key] = process.env[key] ? "ok" : "missing";
  }

  try {
    await getRedis().ping();
    checks["redis"] = "ok";
  } catch (err) {
    log.error({ err }, "Redis health check failed");
    checks["redis"] = "error";
  }

  const allOk = Object.values(checks).every((v) => v === "ok");
  return NextResponse.json({ status: allOk ? "ok" : "degraded", checks }, { status: allOk ? 200 : 503 });
}
