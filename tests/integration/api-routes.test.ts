import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../../src/app/api/transactions/process/route";
import { db } from "../../src/lib/db";

vi.mock("@/lib/ai/jev-client", () => ({
  evaluateWithJev: vi.fn().mockResolvedValue({
    fraud_risk_score: 0.2,
    routing_action: "approve",
    confidence: 0.97,
    is_novel_anomaly_probability: 0.03,
  }),
}));

vi.mock("@/lib/ai/ollama-client", () => ({
  reasonWithOllama: vi.fn().mockResolvedValue({
    finalAction: "decline",
    riskScore: 0.9,
    reasoning: "High-risk cross-border pattern. Decline.",
  }),
}));

async function makeRequest(body: unknown, ip = "127.0.0.1") {
  return POST(
    new Request("http://localhost/api/transactions/process", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/transactions/process", () => {
  let userId: string;

  beforeEach(async () => {
    const user = await db.user.create({
      data: { homeCountry: "India", typicalMonthlySpend: 500, accountAgeDays: 90 },
    });
    userId = user.id;
  });

  it("validates input with Zod and rejects missing fields", async () => {
    const res = await makeRequest({ userId });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("INVALID_INPUT");
  });

  it("returns 404 for an unknown user", async () => {
    const res = await makeRequest({ ...validBody(userId), userId: "missing" });
    expect(res.status).toBe(404);
  });

  it("routes a transaction, saves it with the Jev decision, and returns it", async () => {
    const res = await makeRequest(validBody(userId));
    expect(res.status).toBe(201);

    const saved = await db.transaction.findFirst({ where: { userId } });
    expect(saved).not.toBeNull();
    expect(saved).toMatchObject({
      finalAction: "approve",
      modelUsed: "jev",
      amount: 150.5,
      currency: "USD",
    });
  });

  it("falls back to the Ollama decision when Jev is low-confidence and stores reasoning", async () => {
    const { evaluateWithJev } = await import("@/lib/ai/jev-client");
    vi.mocked(evaluateWithJev).mockResolvedValue({
      fraud_risk_score: 0.6,
      routing_action: "escalate",
      confidence: 0.5,
      is_novel_anomaly_probability: 0.4,
    });

    const res = await makeRequest(validBody(userId), "127.0.0.2");
    expect(res.status).toBe(201);

    const saved = await db.transaction.findFirst({ where: { userId } });
    expect(saved?.modelUsed).toBe("jev+ollama");
    expect(saved?.finalAction).toBe("decline");
    expect(saved?.reasoning).toContain("Decline");
  });
});

function validBody(userId: string) {
  return {
    userId,
    amount: 150.5,
    currency: "USD",
    merchantCategory: "electronics",
    merchantLocation: "India",
    isCardPresent: true,
  };
}