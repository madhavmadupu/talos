export { cn } from "cn";

import { z } from "zod";
import type { TransactionState } from "@/types";
import type { User } from "@/generated/prisma/client";

export const ROUTING_ACTIONS = ["approve", "decline", "escalate"] as const;

export const routingActionSchema = z.enum(ROUTING_ACTIONS);

export const jevEvaluationSchema = z.object({
  fraud_risk_score: z.number().min(0).max(1),
  routing_action: routingActionSchema,
  confidence: z.number().min(0).max(1),
  is_novel_anomaly_probability: z.number().min(0).max(1),
});

export const ollamaReplySchema = z.object({
  reasoning: z.string().min(1),
  final_action: routingActionSchema,
  risk_score: z.number().min(0).max(1),
});

export const processTransactionInputSchema = z.object({
  userId: z.string().min(1),
  amount: z.number().positive().max(1_000_000),
  currency: z.string().length(3),
  merchantCategory: z.string().min(1),
  merchantLocation: z.string().min(1),
  isCardPresent: z.boolean(),
});

export type ProcessTransactionInput = z.infer<typeof processTransactionInputSchema>;

export function formatZodError(error: z.ZodError): { error: string; message: string } {
  return {
    error: "INVALID_INPUT",
    message: error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "),
  };
}

export function buildTransactionState(user: User, tx: { amount: number; currency: string; merchantCategory: string; merchantLocation: string; isCardPresent: boolean }): TransactionState {
  return {
    transaction_amount: tx.amount,
    currency: tx.currency,
    merchant_category: tx.merchantCategory,
    merchant_location: tx.merchantLocation,
    is_card_present: tx.isCardPresent,
    user_home_country: user.homeCountry,
    user_typical_monthly_spend: user.typicalMonthlySpend,
    user_account_age_days: user.accountAgeDays,
    user_history_summary:
      `Primary cardholder located in ${user.homeCountry} with an account age of ${user.accountAgeDays} days ` +
      `and a typical monthly spend of ${tx.currency} ${user.typicalMonthlySpend}.`,
  };
}

const hits = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_HITS = 60;

export function rateLimit(key: string, max: number = MAX_HITS, windowMs: number = WINDOW_MS): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}