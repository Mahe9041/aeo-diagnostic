import { NextRequest } from "next/server";
import { getJobState } from "@/lib/redis";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/stream");

const POLL_INTERVAL_MS = 800;
const MAX_WAIT_MS = 120000;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params;
  log.info({ jobId }, "SSE stream opened");

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const startTime = Date.now();

      while (Date.now() - startTime < MAX_WAIT_MS) {
        const state = await getJobState(jobId);

        if (!state) { send({ type: "error", message: "Job not found" }); break; }

        send({ type: "state", state });

        if (state.status === "done" || state.status === "failed") {
          log.info({ jobId, status: state.status }, "SSE stream closing");
          break;
        }

        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
