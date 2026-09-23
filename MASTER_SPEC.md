# 🏛️ T.A.L.O.S. Master Specification
**Transaction Assessment & Logic Orchestration System**

## 1. Project Overview
T.A.L.O.S. is a hybrid AI-driven financial transaction routing and guardrail engine. It utilizes a "System One" (fast, structured, probabilistic) and "System Two" (slow, deep reasoning) architecture.

- **System One (Fast Path):** Uses the **TypeSafe Jev API** to instantly classify, score, and route transactions with structured, type-safe outputs.
- **System Two (Fallback Path):** If Jev's confidence is below a defined threshold, the system falls back to a **local Ollama LLM** to perform deep contextual reasoning before making a final decision.

The system must run 100% locally (except for the required Jev API call), use no other paid APIs, and feature a unified Next.js frontend and backend.

---

## 2. Strict Constraints & Tech Stack
The AI Agent must strictly adhere to the following technology choices. Do not introduce external paid APIs or unnecessary heavy infrastructure (like Docker/Kafka).

- **Framework:** Next.js 14+ (App Router) - Used for BOTH Frontend and Backend (API Routes).
- **Language:** TypeScript (Strict Mode).
- **Styling:** Tailwind CSS + `shadcn/ui` (for clean, professional components).
- **Database:** SQLite (Local file-based DB).
- **ORM:** Prisma or Drizzle ORM.
- **Data Generation:** `@faker-js/faker` (Node.js script to seed synthetic data).
- **AI Engine 1 (System One):** TypeSafe Jev API (Early Access).
- **AI Engine 2 (System Two):** Ollama Local API (`http://localhost:11434`).
- **Testing:** Vitest (Unit & Integration), React Testing Library (Frontend).
- **Validation:** Zod (Strict schema validation for all inputs/outputs).

---

## 3. System Architecture & Flow

### 3.1 The Routing Logic
1. A synthetic transaction is generated and sent to the `/api/transactions/process` endpoint.
2. The backend formats the transaction state and sends it to the **Jev API**.
3. Jev returns a structured JSON response containing:
   - `fraud_risk_score` (Score: 0.0 to 1.0)
   - `routing_action` (Choice: `approve`, `decline`, `escalate`)
   - `is_novel_anomaly_probability` (Noul: 0.0 to 1.0)
4. **Decision Gate:**
   - If Jev's confidence (derived from the probabilities) is **> 85%**, accept the decision. Log it.
   - If confidence is **<= 85%**, trigger the **Ollama Fallback**. Pass the transaction to the local Ollama model (`llama3.2:3b`) with a prompt asking for a 2-sentence reasoning chain and a final decision.
5. The final decision, model used, and latency (in ms) are saved to the SQLite database.

---

## 4. AI Integration Details

### 4.1 TypeSafe Jev API (System One)
**Documentation & Resources:**
- Official Blog/Docs Context: [Introducing System One Models & Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev)
- Jev is a "System One" model. It does not generate text. It takes unstructured state and typed questions, returning calibrated probabilistic decisions.

**Expected Jev API Payload Structure:**
*Note: The agent should use the official TypeSafe SDK if provided in early access, or construct the HTTP request based on this conceptual schema.*
```json
{
  "state": {
    "transaction_amount": 4500.00,
    "merchant_category": "electronics",
    "user_location": "Hyderabad, IN",
    "card_location": "London, UK",
    "user_history_summary": "Typically spends <500 INR locally on groceries."
  },
  "questions": [
    {
      "key": "fraud_risk_score",
      "type": "Score",
      "prompt": "Evaluate the fraud risk from 0.0 (no risk) to 1.0 (certain fraud)."
    },
    {
      "key": "routing_action",
      "type": "Choice",
      "options": ["approve", "decline", "escalate"],
      "prompt": "Select the appropriate routing action."
    },
    {
      "key": "is_novel_anomaly",
      "type": "Noul",
      "prompt": "Estimate the probability (0.0 to 1.0) that this is a novel, unseen fraud pattern."
    }
  ]
}
```

### 4.2 Ollama Local API (System Two)
- **Endpoint:** `POST http://localhost:11434/api/chat`
- **Model:** `llama3.2:3b` (Must be pulled locally via `ollama pull llama3.2:3b`).
- **Payload:** Standard Ollama chat format. Instruct the model to output strict JSON so it can be parsed by the backend.

---

## 5. Data Model (Prisma Schema)

```prisma
model User {
  id                  String   @id @default(cuid())
  homeCountry         String
  typicalMonthlySpend Float
  accountAgeDays      Int
  transactions        Transaction[]
}

model Transaction {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id])
  amount            Float
  currency          String
  merchantCategory  String
  merchantLocation  String
  isCardPresent     Boolean
  timestamp         DateTime @default(now())

  // AI Decision Fields
  finalAction       String   // approve, decline, escalate
  riskScore         Float
  modelUsed         String   // "jev", "ollama", "jev+ollama"
  latencyMs         Int
  reasoning         String?  // Populated if Ollama fallback is used
}
```

---

## 6. Project Directory Structure
Maintain this exact structure for a clean, professional codebase.

```text
talos/
├── docs/                   # Project documentation
│   ├── ARCHITECTURE.md     # Detailed system design
│   ├── API_SPEC.md         # Endpoint documentation
│   └── JEV_INTEGRATION.md  # Notes on TypeSafe Jev API
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── seed.ts             # Faker data generation script
├── scripts/
│   └── generate-data.ts    # Standalone script to generate mock transactions
├── src/
│   ├── app/
│   │   ├── (dashboard)/    # Frontend UI routes
│   │   │   ├── page.tsx    # Main dashboard (Live feed, charts)
│   │   │   └── layout.tsx
│   │   ├── api/
│   │   │   ├── transactions/
│   │   │   │   ├── process/route.ts  # Core AI routing logic
│   │   │   │   └── history/route.ts  # Fetch past transactions
│   │   │   └── metrics/route.ts      # Fetch dashboard stats
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/             # shadcn/ui components
│   │   ├── TransactionFeed.tsx
│   │   └── MetricsChart.tsx
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── jev-client.ts       # Jev API integration
│   │   │   └── ollama-client.ts    # Ollama local integration
│   │   ├── db.ts                   # Prisma client instance
│   │   └── utils.ts                # Zod schemas, helpers
│   └── types/
│       └── index.ts                # Global TypeScript interfaces
├── tests/
│   ├── unit/
│   │   └── routing-logic.test.ts   # Tests for System 1 vs System 2 routing
│   └── integration/
│       └── api-routes.test.ts      # Tests for Next.js API endpoints
├── .env.local              # Local environment variables (Gitignored)
├── .env.example            # Template for environment variables
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 7. Security & Best Practices Protocols
The AI Agent must implement the following security measures:

1. **Input Validation:** Use `Zod` to strictly validate all incoming API requests and AI model outputs. Never trust raw AI output; parse it against a Zod schema before saving to the DB.
2. **Environment Variables:** All API keys (Jev API Key) and local URLs (Ollama URL) must be stored in `.env.local`. Ensure `.env*` is in `.gitignore`. Provide a `.env.example` file.
3. **Rate Limiting:** Implement basic in-memory rate limiting on the `/api/transactions/process` endpoint to prevent local resource exhaustion.
4. **Error Handling:** Never expose raw stack traces or internal AI errors to the frontend. Return standardized JSON error responses (e.g., `{ error: "AI_ENGINE_TIMEOUT", message: "..." }`).
5. **SQL Injection:** Rely strictly on Prisma ORM for all database queries. Do not use raw SQL strings.

---

## 8. Testing Strategy
The project must include comprehensive tests using **Vitest**.

1. **Unit Tests (`tests/unit/`):**
   - Test the routing logic: Mock the Jev client to return high confidence (verify it doesn't call Ollama). Mock Jev to return low confidence (verify it calls Ollama).
   - Test Zod schemas to ensure invalid AI outputs are caught.
2. **Integration Tests (`tests/integration/`):**
   - Test the `/api/transactions/process` endpoint using Next.js test utilities. Ensure it correctly saves the transaction to the SQLite database.
3. **Mocking:**
   - Create mock implementations for `jev-client.ts` and `ollama-client.ts` so tests run deterministically without needing actual AI inference or network calls.

---

## 9. Step-by-Step Execution Plan for the AI Agent

**Phase 1: Scaffolding & Database**
1. Initialize Next.js app with TypeScript, Tailwind, and App Router.
2. Setup Prisma with SQLite. Run initial migration.
3. Create the `docs/` directory and populate it with this spec.

**Phase 2: Core AI Logic (Backend)**
1. Implement `src/lib/ai/jev-client.ts` to format and send requests to the Jev API.
2. Implement `src/lib/ai/ollama-client.ts` to send requests to the local Ollama API.
3. Build the core routing logic in `src/app/api/transactions/process/route.ts` implementing the System 1 / System 2 fallback gate.

**Phase 3: Data Seeding**
1. Write `prisma/seed.ts` using `@faker-js/faker` to generate 50 Users and 500 Transactions.
2. Ensure the seed script pushes these through the `/api/transactions/process` endpoint to populate the DB with AI decisions.

**Phase 4: Frontend Dashboard**
1. Setup `shadcn/ui`.
2. Build the main dashboard page (`src/app/(dashboard)/page.tsx`).
3. Create a live-updating table for the `TransactionFeed` and a simple chart for `MetricsChart` (showing Jev vs Ollama usage).

**Phase 5: Testing & Polish**
1. Write the Vitest unit and integration tests as specified in Section 8.
2. Ensure all security protocols (Zod, env vars) are strictly enforced.
3. Run `npm run build` to ensure zero TypeScript errors.

---
*End of Master Specification.*