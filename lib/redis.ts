import { Redis } from "@upstash/redis";
import type { JobState } from "@/types";
import { createLogger } from "@/lib/logger";

const log = createLogger("redis");

let _redis: Redis | null = null;

export function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    log.debug("Redis client initialized");
  }
  return _redis;
}

const KEYS = {
  job: (id: string) => `job:${id}`,
  cache: (hash: string) => `cache:${hash}`,
} as const;

export async function setJobState(state: JobState): Promise<void> {
  const redis = getRedis();
  await redis.setex(KEYS.job(state.jobId), 7200, JSON.stringify(state));
  log.debug({ jobId: state.jobId, status: state.status }, "Job state updated");
}

export async function getJobState(jobId: string): Promise<JobState | null> {
  const redis = getRedis();
  const raw = await redis.get<string>(KEYS.job(jobId));
  if (!raw) return null;
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}

export async function getCachedReport(cacheKey: string): Promise<JobState | null> {
  const redis = getRedis();
  const raw = await redis.get<string>(KEYS.cache(cacheKey));
  if (!raw) return null;
  log.info({ cacheKey }, "Cache hit");
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}

export async function setCachedReport(
  cacheKey: string,
  state: JobState,
  ttlSeconds: number
): Promise<void> {
  const redis = getRedis();
  await redis.setex(KEYS.cache(cacheKey), ttlSeconds, JSON.stringify(state));
  log.debug({ cacheKey, ttlSeconds }, "Report cached");
}
