import { describe, expect, it, vi } from "vitest";
import { routeTransaction } from "../../src/lib/routing";
import { jevEvaluationSchema, ollamaReplySchema } from "../../src/lib/utils";
import type { JevEvaluation, TransactionState } from "../../src/types";

const state: TransactionState = {
  transaction_amount: 4500,
  currency: "EUR",
  merchant_category: "electronics",
  merchant_location: "London, UK",
  is_card_present: false,
  user_home_country: "India",
  user_typical_monthly_spend: 400,
  user_account_age_days: 120,
  user_history_summary: "Typically spends <500 INR locally on groceries.",
};

function jev(overrides: Partial<JevEvaluation>): JevEvaluation {
  return {
    fraud_risk_score: 0.7,
    routing_action: "approve",
    confidence: 0.9,
    is_novel_anomaly_probability: 0.1,
    ...overrides,
  };
}

describe("routeTransaction (System One / System Two gate)", () => {
  it("accepts the Jev decision without calling Ollama when confidence is > 85%", async () => {
    const evaluateWithJev = vi.fn().mockResolvedValue(jev({ confidence: 0.92, routing_action: "approve" }));
    const reasonWithOllama = vi.fn();

    const decision = await routeTransaction(state, { evaluateWithJev, reasonWithOllama });

    expect(reasonWithOllama).not.toHaveBeenCalled();
    expect(decision).toMatchObject({
      finalAction: "approve",
      modelUsed: "jev",
      reasoning: null,
    });
  });

  it("triggers the Ollama fallback when confidence is <= 85%", async () => {
    const evaluateWithJev = vi.fn().mockResolvedValue(jev({ confidence: 0.6, routing_action: "escalate" }));
    const reasonWithOllama = vi.fn().mockResolvedValue({
      finalAction: "decline",
      riskScore: 0.88,
      reasoning: "Cross-border spend far exceeds the account norm. Decline to protect the account.",
    });

    const decision = await routeTransaction(state, { evaluateWithJev, reasonWithOllama });

    expect(reasonWithOllama).toHaveBeenCalledWith(state, expect.anything());
    expect(decision).toMatchObject({
      finalAction: "decline",
      riskScore: 0.88,
      modelUsed: "jev+ollama",
    });
    expect((decision.reasoning ?? "").toLowerCase()).toContain("cross-border");
  });

  it("falls through to Ollama at exactly the 85% boundary", async () => {
    const evaluateWithJev = vi.fn().mockResolvedValue(jev({ confidence: 0.85 }));
    const reasonWithOllama = vi.fn().mockResolvedValue({
      finalAction: "approve",
      riskScore: 0.5,
      reasoning: "No material risk indicators found.",
    });

    const decision = await routeTransaction(state, { evaluateWithJev, reasonWithOllama });

    expect(reasonWithOllama).toHaveBeenCalled();
    expect(decision.modelUsed).toBe("jev+ollama");
  });
});

describe("AI output validation schemas", () => {
  it("accepts a valid Jev evaluation", () => {
    expect(() =>
      jevEvaluationSchema.parse({
        fraud_risk_score: 0.4,
        routing_action: "escalate",
        confidence: 0.81,
        is_novel_anomaly_probability: 0.5,
      }),
    ).not.toThrow();
  });

  it("rejects a Jev risk score outside 0-1", () => {
    expect(() =>
      jevEvaluationSchema.parse({
        fraud_risk_score: 1.7,
        routing_action: "approve",
        confidence: 0.9,
        is_novel_anomaly_probability: 0.1,
      }),
    ).toThrow();
  });

  it("rejects an unknown routing action from Jev", () => {
    expect(() =>
      jevEvaluationSchema.parse({
        fraud_risk_score: 0.5,
        routing_action: "void",
        confidence: 0.9,
        is_novel_anomaly_probability: 0.1,
      }),
    ).toThrow();
  });

  it("rejects an Ollama reply with a non-JSON risk score", () => {
    expect(() =>
      ollamaReplySchema.parse({ reasoning: "ok", final_action: "approve", risk_score: "high" }),
    ).toThrow();
  });
});