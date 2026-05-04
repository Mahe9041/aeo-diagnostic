import type { QueryCategory } from "@/types";

export const COMPETITOR_SEEDS: Record<QueryCategory, string[]> = {
  supplements: ["Nature Made","Garden of Life","NOW Foods","Thorne","Solgar","Doctor's Best","Jarrow Formulas","Pure Encapsulations"],
  electronics: ["Sony","Samsung","Apple","Bose","Anker","Belkin","JBL","LG"],
  footwear: ["Nike","Adidas","New Balance","Brooks","ASICS","Saucony","Hoka"],
  beauty: ["CeraVe","The Ordinary","Neutrogena","Olay","La Roche-Posay","Cetaphil"],
  home: ["iRobot","Dyson","Bissell","Shark","Ninja","Instant Pot","KitchenAid"],
  fitness: ["Bowflex","Peloton","NordicTrack","Rogue","TRX","Theragun","Hyperice"],
  food: ["KIND","RXBAR","Quest","Clif Bar","Larabar","Perfect Bar"],
  other: [],
};

const BASE_WORKER_SYSTEM = `You are a helpful shopping assistant. A customer asks you for product recommendations.

RULES:
- Respond ONLY with a valid JSON object matching this exact schema
- No markdown, no explanation, no preamble
- Schema: {"recommendations": [{"rank": 1, "name": "...", "reason": "..."}, ...]}
- Include exactly 5 recommendations ranked 1-5
- Be specific with brand names and product variants`;

export const PROMPT_TEMPLATES: Record<QueryCategory, { system: string; userPrefix: string }> = {
  supplements: {
    system: BASE_WORKER_SYSTEM + "\n- Prioritize form (glycinate vs oxide), absorption, and demographic fit",
    userPrefix: "A customer shopping for health supplements asks:",
  },
  electronics: {
    system: BASE_WORKER_SYSTEM + "\n- Prioritize features, price-to-performance, and reliability",
    userPrefix: "A customer shopping for electronics asks:",
  },
  footwear: {
    system: BASE_WORKER_SYSTEM + "\n- Prioritize fit, intended use, and comfort",
    userPrefix: "A customer shopping for footwear asks:",
  },
  beauty: {
    system: BASE_WORKER_SYSTEM + "\n- Prioritize skin type compatibility and ingredients",
    userPrefix: "A customer shopping for beauty and skincare asks:",
  },
  home: {
    system: BASE_WORKER_SYSTEM + "\n- Prioritize durability, ease of use, and value",
    userPrefix: "A customer shopping for home products asks:",
  },
  fitness: {
    system: BASE_WORKER_SYSTEM + "\n- Prioritize build quality and training goals",
    userPrefix: "A customer shopping for fitness equipment asks:",
  },
  food: {
    system: BASE_WORKER_SYSTEM + "\n- Prioritize taste, ingredients quality, and dietary needs",
    userPrefix: "A customer shopping for food products asks:",
  },
  other: {
    system: BASE_WORKER_SYSTEM,
    userPrefix: "A customer asks:",
  },
};

export const ORCHESTRATOR_SYSTEM = `You are a query analysis agent for an AI search visibility tool.

Given a product name, a user's search query, and a list of known competitors, you must:
1. Normalize the query: fix typos, expand abbreviations, make it sound like a natural shopper question
2. Classify the product category
3. Select the appropriate prompt template key
4. Merge user-provided competitors with category defaults (deduplicate, max 12)

Respond ONLY with valid JSON matching this schema:
{
  "normalizedQuery": "string",
  "category": "supplements|electronics|footwear|beauty|home|fitness|food|other",
  "promptTemplate": "string (same as category)",
  "competitorList": ["string", ...]
}`;

export const JUDGE_SYSTEM = `You are an AI search visibility analyst.

You will receive the target product name, search query, and three recommendation lists from different AI workers.

Scoring formula:
- Rank 1 = 40pts, rank 2 = 30pts, rank 3 = 20pts, rank 4-5 = 10pts, not ranked = 0
- Mentioned = 30pts, not mentioned = 0
- Positive sentiment = 30pts, neutral = 15pts, negative/undetected = 0

You MUST respond with ONLY this exact JSON structure, no other text:
{
  "providers": {
    "gpt": {
      "rank": <number 1-5 or null>,
      "mentioned": <true or false>,
      "snippet": "<exact quote or empty string>",
      "sentiment": "<positive|neutral|negative|undetected>",
      "score": <number 0-100>
    },
    "claude": {
      "rank": <number 1-5 or null>,
      "mentioned": <true or false>,
      "snippet": "<exact quote or empty string>",
      "sentiment": "<positive|neutral|negative|undetected>",
      "score": <number 0-100>
    },
    "gemini": {
      "rank": <number 1-5 or null>,
      "mentioned": <true or false>,
      "snippet": "<exact quote or empty string>",
      "sentiment": "<positive|neutral|negative|undetected>",
      "score": <number 0-100>
    }
  },
  "recommendations": [
    {
      "type": "<gap|strength|action>",
      "title": "<short title>",
      "detail": "<actionable detail>"
    }
  ],
  "competitorGaps": [
    {
      "competitorName": "<name>",
      "appearsInProviders": ["gpt"|"claude"|"gemini"],
      "yourRank": <number or null>,
      "theirBestRank": <number 1-5>
    }
  ]
}`;
