# T.A.L.O.S. — Transaction Assessment & Logic Orchestration System

A hybrid AI-driven transaction routing and guardrail engine built with Next.js, TypeScript, SQLite, and Prisma.

## Architecture

T.A.L.O.S. routes financial transactions through a two-tier AI pipeline:

- **System One (Fast Path):** [TypeSafe Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev) classifies, scores, and routes each transaction with calibrated, type-safe probabilistic answers (~70–500ms).
- **System Two (Fallback Path):** when Jev's confidence on the routing decision falls at or below the threshold (`JEV_CONFIDENCE_THRESHOLD`, default `0.85`), a local Ollama model (`llama3.2:3b`) performs deep contextual reasoning before the final decision.

```
synthetic transaction
        │
        ▼
POST /api/transactions/process
        │
        ▼
   Jev (System One) ── confidence > 85% ──► decision
        │
        └── confidence ≤ 85% ──► Ollama (System Two) ──► decision
                                      │
                                      ▼
                          saved to SQLite + dashboard
```

Every decision, the model used, and latency are persisted. See `docs/` for design, API, and integration details.

## Tech Stack

| Layer      | Choice                                                     |
|------------|------------------------------------------------------------|
| Framework  | Next.js 16 (App Router) — frontend + API routes            |
| Language   | TypeScript (strict)                                        |
| UI         | Tailwind CSS v4 + shadcn/ui                                |
| Database   | SQLite (local file)                                        |
| ORM        | Prisma 7                                                   |
| Data       | @faker-js/faker (synthetic users/transactions)             |
| AI System 1| TypeSafe Jev (System One, `@typesafe-ai/sdk`)              |
| AI System 2| Ollama local (`llama3.2:3b`)                                |
| Validation | Zod                                                        |
| Testing    | Vitest + React Testing Library                             |

## Getting Started

```bash
npm install
```

Configure the environment — see `.env.example`:

```bash
cp .env.example .env.local   # add TYPESAFE_API_KEY, optional Ollama overrides
```

Set up the database:

```bash
npx prisma migrate dev       # applies prisma/migrations
```

Pull the fallback model (System Two):

```bash
ollama pull llama3.2:3b
```

Run the app and seed 50 users / 500 transactions through the live process endpoint:

```bash
npm run dev
npm run db:seed
```

Open http://localhost:3000.

## Scripts

| Command                | Description                                   |
|------------------------|-----------------------------------------------|
| `npm run dev`          | Start the Next.js dev server                  |
| `npm run build`        | Production build                              |
| `npm run lint`         | ESLint                                        |
| `npm run typecheck`    | `tsc --noEmit`                                |
| `npm test`             | Vitest unit + integration suites              |
| `npm run generate:data`| Write synthetic transaction JSON to disk      |
| `npm run db:seed`      | Seed Prisma with generated transactions       |

## API

- `POST /api/transactions/process` — route a transaction through the System One / System Two gate
- `GET  /api/transactions/history?limit=50` — recent transactions
- `GET  /api/metrics` — dashboard stats (counts, model/action breakdown, avg risk)

## Security

- All AI outputs validated against Zod schemas before persistence
- API keys and model URLs live in `.env.local` (gitignored)
- In-memory rate limiting on the process endpoint
- Standardized error payloads; no internal stack traces leaked

See `docs/API_SPEC.md` and `docs/ARCHITECTURE.md` for details.