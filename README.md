# AEO Diagnostic

> **AI search visibility tool for Amazon sellers and brand owners.**
> Ask what a shopper would ask. See how GPT-4o, Claude, and Gemini rank your product vs competitors — live, in parallel, with a scored report card.

🔗 **Live demo:** https://aeo-diagnostic-nu.vercel.app

---

## What it does

Sellers type a shopper query like _"best magnesium supplement for seniors"_ and their product name. The tool queries 3 AI models simultaneously, scores where the product ranks on each, and produces a full report card with:

- **Overall grade** (A–F) + score out of 100
- **Per-AI rank** — where you appear in GPT, Claude, and Gemini's top 5
- **Competitor gaps** — which competitors outrank you and on which AI
- **Actionable recommendations** — what to fix in your listing
- **PDF export** — downloadable report card
- **History tracking** — run again later to see if your rank improved

---

## Demo

| Query | Product | Result |
|---|---|---|
| "best running shoes for beginners" | Nike Air Max | Grade A — ranked #5 on all 3 AIs |
| "best vitamin C serum for sensitive skin" | LumiGlow Serum | Grade F — not mentioned, competitor gaps identified |
| "most comfortable running shoes for flat feet" | CloudStep Runner | Gap analysis — Brooks and ASICS dominating |

---

## Architecture

```
User query
  └→ Orchestrator agent (Groq llama-3.3-70b)
      Rewrites messy query → clean shopper language
      Classifies product category
      Seeds competitor list from category database
          └→ Worker × 3 in parallel
              gpt    → llama-3.3-70b-versatile
              claude → llama-3.1-8b-instant
              gemini → llama-3.1-8b-instant
              (semaphore limits to 3 concurrent LLM calls)
                  └→ Judge agent (Groq llama-3.3-70b)
                      Scores rank, sentiment, competitor gaps
                      Generates actionable recommendations
                          └→ Report card + PDF + Supabase history
```

### Key engineering decisions

| Decision | Reason |
|---|---|
| **Two-stage agentic pipeline** | Orchestrator classifies cheaply (~150 tokens). Judge reasons carefully (~800 tokens). Separating jobs means each agent has one focused system prompt. |
| **Semaphore (concurrency: 3)** | Without this, 10 simultaneous users = 30 concurrent LLM calls = rate limit cascade. Semaphore queues excess calls in-process. |
| **SSE streaming** | Results appear card-by-card as each worker completes. No blank 5-second wait. |
| **Redis cache (6h TTL)** | Same query from different users hits cache, not LLMs. Saves cost and latency. |
| **Zod validation on every LLM response** | LLMs return inconsistent formats. Zod catches schema violations before they reach business logic — fallback instead of crash. |
| **Exponential backoff (1s → 2s → 4s)** | Transient API errors auto-recover without user intervention. |
| **Supabase history** | Trend chart shows rank over time. Turns a one-shot tool into a monitoring product. |

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 14 App Router + TypeScript | SSE support built-in, single repo for API + UI |
| LLM inference | Groq | Free tier, fastest inference available |
| Models | llama-3.3-70b + llama-3.1-8b | 70b for quality (orchestrator/judge), 8b for speed (workers) |
| Job state | Upstash Redis | Serverless-safe, REST API, free tier |
| History | Supabase (PostgreSQL) | Free tier, SQL, easy to query for trends |
| Streaming | Server-Sent Events | Native browser support, no WebSocket complexity |
| PDF | @react-pdf/renderer | Client-side generation, no server needed |
| Charts | Recharts | Lightweight, works with React |
| Logging | Pino | Structured JSON logs, zero overhead |
| Validation | Zod | Runtime type safety on all external data |
| Deploy | Vercel | Zero config, free tier, edge-ready |

---

## Project structure

```
aeo-diagnostic/
├── types/
│   └── index.ts                    # All domain types — single source of truth
├── lib/
│   ├── schemas.ts                  # Zod schemas for every LLM response
│   ├── env.ts                      # Env validation — fails fast if keys missing
│   ├── logger.ts                   # Pino structured logger
│   ├── redis.ts                    # Upstash client + job state helpers
│   ├── retry.ts                    # Exponential backoff wrapper
│   ├── semaphore.ts                # Concurrency limiter
│   ├── history.ts                  # Supabase read/write
│   ├── pipeline.ts                 # Main orchestration — wires all agents
│   ├── agents/
│   │   ├── orchestrator.ts         # Stage 1: query rewrite + classify
│   │   ├── workers.ts              # Stage 2: parallel LLM fan-out
│   │   └── judge.ts                # Stage 3: scoring + recommendations
│   ├── rag/
│   │   └── templates.ts            # Prompt templates + competitor seeds
│   └── pdf/
│       └── generator.tsx           # PDF report generation
├── app/
│   ├── api/
│   │   ├── diagnose/route.ts       # POST — enqueue job, return job_id instantly
│   │   ├── stream/[id]/route.ts    # GET  — SSE stream of job state updates
│   │   ├── history/route.ts        # GET  — past runs for trend chart
│   │   └── health/route.ts         # GET  — checks Redis + env keys
│   ├── layout.tsx
│   ├── page.tsx                    # Main page — form + results
│   └── globals.css
├── components/
│   ├── forms/QueryForm.tsx         # Product + query + competitor input
│   ├── report/ReportCard.tsx       # Full report with scores + gaps
│   ├── report/LoadingSkeleton.tsx  # Live progress bar while pipeline runs
│   └── history/HistoryChart.tsx    # Trend chart (recharts)
├── tests/
│   ├── unit/scoring.test.ts
│   └── integration/pipeline.test.ts
├── .env.example
├── vitest.config.ts
└── README.md
```

---

## Setup

### 1. Clone and install

```bash
git clone git@github.com:Mahe9041/aeo-diagnostic.git
cd aeo-diagnostic
npm install
```

### 2. Get your API keys (all free tiers available)

| Service | URL | Used for |
|---|---|---|
| Groq | console.groq.com | All LLM inference (free) |
| OpenAI | platform.openai.com | Optional GPT worker |
| Anthropic | console.anthropic.com | Optional Claude worker |
| Google AI | aistudio.google.com | Optional Gemini worker |
| Upstash | console.upstash.com | Redis job queue + cache |
| Supabase | app.supabase.com | History database |

### 3. Configure environment

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```env
GROQ_API_KEY=gsk_...
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AIza...
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...
NEXT_PUBLIC_SUPABASE_URL=https://....supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
CACHE_TTL_SECONDS=21600
```

### 4. Run Supabase migration

In your Supabase SQL editor, run once:

```sql
create table diagnostic_runs (
  id uuid primary key default gen_random_uuid(),
  job_id text not null,
  product_name text not null,
  query text not null,
  normalized_query text not null,
  category text not null,
  overall_score int not null,
  grade text not null,
  mentioned_by_count int not null,
  avg_rank float,
  gpt_rank int, gpt_score int,
  claude_rank int, claude_score int,
  gemini_rank int, gemini_score int,
  full_report jsonb not null,
  created_at timestamptz default now()
);

create index on diagnostic_runs (product_name, query);
create index on diagnostic_runs (created_at desc);
```

### 5. Run locally

```bash
npm run dev
# → http://localhost:3000
```

### 6. Deploy to Vercel

```bash
npx vercel --prod
```

Add all env vars in Vercel dashboard → Project → Settings → Environment Variables.

---

## API reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/diagnose` | POST | Enqueue a diagnostic job. Returns `{ jobId }` in ~200ms. |
| `/api/stream/:id` | GET | SSE stream. Emits job state updates until `done` or `failed`. |
| `/api/history` | GET | Returns past runs for `?productName=X&query=Y`. |
| `/api/health` | GET | Checks Redis connectivity and all env keys. |

### POST /api/diagnose

```json
{
  "productName": "MagRelax Pro",
  "query": "best magnesium supplement for seniors",
  "competitors": ["Nature Made", "Doctor's Best"]
}
```

Returns:
```json
{ "jobId": "uuid" }
```

### SSE events from /api/stream/:id

```json
{ "type": "state", "state": { "status": "orchestrating", "progress": {} } }
{ "type": "state", "state": { "status": "running", "progress": {} } }
{ "type": "state", "state": { "status": "done", "report": { ... } } }
```

---

## Scoring formula

Each AI provider is scored 0–100:

| Signal | Points |
|---|---|
| Ranked #1 | 40 |
| Ranked #2 | 30 |
| Ranked #3 | 20 |
| Ranked #4–5 | 10 |
| Not ranked | 0 |
| Product mentioned | +30 |
| Positive sentiment | +30 |
| Neutral sentiment | +15 |
| Negative / undetected | +0 |

Overall score = average across all 3 providers. Grade: A ≥ 80, B ≥ 65, C ≥ 50, D ≥ 35, F < 35.

---

## Token cost per run

| Agent | Model | Avg tokens | Cost |
|---|---|---|---|
| Orchestrator | llama-3.3-70b | ~150 | Free (Groq) |
| Worker × 3 | llama-3.3-70b + llama-3.1-8b × 2 | ~450 each | Free (Groq) |
| Judge | llama-3.3-70b | ~800 | Free (Groq) |
| **Total** | | **~2,150** | **$0** |

---

## If I had more time

- **Weekly scheduled monitoring** — sellers get Slack/email alerts when their rank drops
- **Keyword optimizer** — auto-rewrites listing description to score higher on next run
- **Multi-query mode** — test 10 queries at once to find which ones you rank best on
- **Graph RAG** — model competitor relationships to surface deeper strategic insights
- **Browser extension** — run diagnostics directly from Amazon product pages

---

## Built by

Mahesh — built as a take-home project in ~6 hours.