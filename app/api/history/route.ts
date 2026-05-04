import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getHistory } from "@/lib/history";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/history");

const QuerySchema = z.object({
  productName: z.string().min(1).max(100),
  query: z.string().optional(),
  limit: z.string().optional().transform((v) => Math.min(parseInt(v ?? "20", 10), 50)),
});

export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = QuerySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 422 });
  }
  const { productName, query, limit } = parsed.data;
  try {
    const runs = await getHistory(productName, query, limit);
    log.info({ productName, count: runs.length }, "History fetched");
    return NextResponse.json({ runs });
  } catch (err) {
    log.error({ err }, "History fetch failed");
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}
