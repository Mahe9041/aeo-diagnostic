import { createLogger } from "@/lib/logger";

const log = createLogger("semaphore");

export class Semaphore {
  private concurrency: number;
  private running = 0;
  private queue: Array<() => void> = [];
  private label: string;

  constructor(concurrency: number, label = "semaphore") {
    this.concurrency = concurrency;
    this.label = label;
  }

  private acquire(): Promise<void> {
    return new Promise((resolve) => {
      if (this.running < this.concurrency) {
        this.running++;
        resolve();
      } else {
        log.debug({ running: this.running, queued: this.queue.length + 1, label: this.label }, "Slot queued");
        this.queue.push(resolve);
      }
    });
  }

  private release(): void {
    this.running--;
    const next = this.queue.shift();
    if (next) { this.running++; next(); }
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }

  get stats() {
    return { running: this.running, queued: this.queue.length };
  }
}

export const llmSemaphore = new Semaphore(3, "llm-calls");
export const pipelineSemaphore = new Semaphore(10, "pipeline-runs");
