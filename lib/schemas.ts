import { z } from "zod";

export const DiagnoseRequestSchema = z.object({
  productName: z.string().min(1).max(100),
  query: z.string().min(5).max(300),
  competitors: z.array(z.string().max(100)).min(0).max(10).default([]),
});

export const OrchestratorOutputSchema = z.object({
  normalizedQuery: z.string().min(5).max(300),
  category: z.enum([
    "supplements","electronics","footwear","beauty","home","fitness","food","other",
  ]),
  promptTemplate: z.string(),
  competitorList: z.array(z.string()).min(0).max(15),
});

export const WorkerRecommendationSchema = z.object({
  rank: z.number().int().min(1).max(5),
  name: z.string().max(200),
  reason: z.string().max(500),
});

export const WorkerResponseSchema = z.object({
  recommendations: z.array(WorkerRecommendationSchema).min(1).max(5),
});

export const ProviderAnalysisSchema = z.object({
  rank: z.number().int().min(1).max(5).nullable(),
  mentioned: z.boolean(),
  snippet: z.string().max(500),
  sentiment: z.enum(["positive","neutral","negative","undetected"]),
  score: z.number().int().min(0).max(100),
});

export const JudgeOutputSchema = z.object({
  providers: z.object({
    gpt: ProviderAnalysisSchema,
    claude: ProviderAnalysisSchema,
    gemini: ProviderAnalysisSchema,
  }),
  recommendations: z.array(
    z.object({
      type: z.enum(["gap","strength","action"]),
      provider: z.enum(["gpt","claude","gemini"]).optional(),
      title: z.string().max(100),
      detail: z.string().max(400),
    })
  ).max(6),
  competitorGaps: z.array(
    z.object({
      competitorName: z.string().max(100),
      appearsInProviders: z.array(z.enum(["gpt","claude","gemini"])),
      yourRank: z.number().int().nullable(),
      theirBestRank: z.number().int().min(1).max(5),
    })
  ).max(10),
});

export type WorkerResponse = z.infer<typeof WorkerResponseSchema>;
export type JudgeOutput = z.infer<typeof JudgeOutputSchema>;
export type OrchestratorOutput = z.infer<typeof OrchestratorOutputSchema>;
