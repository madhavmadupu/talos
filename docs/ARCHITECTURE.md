# T.A.L.O.S. Architecture

**Transaction Assessment & Logic Orchestration System**

## System Overview

T.A.L.O.S. is a hybrid AI transaction routing engine built as a single Next.js
application. Every transaction is scored by a fast, probabilistic model
(System One — TypeSafe Jev). When Jev's confidence is low, a local LLM
(System Two — Ollama) performs deep reasoning before a final decision is
committed.

```
Synthetic transaction
   → POST /api/transactions/process
   → validate with Zod
   → build TransactionState
   → System One: Jev API (fraud risk score, routing action, novelty)
   → confidence > 85%?  ─yes─→ Jev decision accepted
        │no
        ▼
   System Two: Ollama (llama3.2:3b) 2-sentence reasoning chain + decision
   → persist Transaction row (finalAction, riskScore, modelUsed, latencyMs, reasoning?)
   → 201 { transaction }
```

## Decision Gate

- Confidence is Jev's own calibrated `confidence` field on the
  `routing_action` choice answer.
- `confidence > JEV_CONFIDENCE_THRESHOLD` (default `0.85`): accept Jev.
  `modelUsed = "jev"`, no reasoning stored.
- `confidence <= 0.85`: run Ollama fallback. `modelUsed = "jev+ollama"`,
  reasoning stored. Latency is the combined Jev + Ollama time.

## Data Model

- **User**: home country, typical monthly spend, account age. Synthetic.
- **Transaction**: amount, currency, merchant category/location, card present,
  timestamp + AI decision fields (`finalAction`, `riskScore`, `modelUsed`,
  `latencyMs`, `reasoning`).

SQLite via Prisma 7 (SQLite driver adapter). Pure Prisma ORM access, no raw SQL.

## AI Engines

- **System One** — `src/lib/ai/jev-client.ts`. Wraps `@typesafe-ai/sdk`
  `TypeSafeClient.systemOne()`. Questions: `fraud_risk_score` (Score, 5-level
  rubric), `routing_action` (Choice), `is_novel_anomaly` (Noul). Output parsed
  against a Zod schema before use.
- **System Two** — `src/lib/ai/ollama-client.ts`. POSTs to
  `OLLAMA_URL/api/chat` with `format: "json"`, 30s timeout. Prompt embeds the
  Jev evaluation for context. Strict JSON `{reasoning, final_action,
  risk_score}`.

Both clients throw typed error codes (`OLLAMA_HTTP_<status>`) so the API layer
can return standardized errors and never leak stack traces.

## Security

- Api route: in-memory rate limit (60 req/min/IP).
- Zod validation on every API body and every AI output before DB write.
- Secrets in `.env.local` (gitignored); `.env.example` committed.
- Standardized error responses: `{ error: "CODE", message: "..." }`.