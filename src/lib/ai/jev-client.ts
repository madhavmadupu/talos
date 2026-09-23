import { choice, noul, score, TypeSafeClient } from "@typesafe-ai/sdk";
import type { JevEvaluation, TransactionState } from "@/types";
import { jevEvaluationSchema } from "@/lib/utils";

let client: TypeSafeClient | null = null;

function getClient(): TypeSafeClient {
  if (!client) client = new TypeSafeClient();
  return client;
}

const RISK_RUBRIC = [
  "No indicators of fraud; routine transaction.",
  "Minor anomalies; low fraud risk.",
  "Some anomalies; moderate fraud risk.",
  "Strong fraud indicators; high fraud risk.",
  "Certain or near-certain fraud.",
] as const;

export async function evaluateWithJev(state: TransactionState): Promise<JevEvaluation> {
  const { answers } = await getClient().systemOne({
    state: { ...state } as Record<string, string | number | boolean>,
    questions: {
      fraud_risk_score: score(
        "Evaluate the fraud risk of this transaction on the ordered 0-4 rubric.",
        RISK_RUBRIC,
      ),
      routing_action: choice(
        "Select the appropriate routing action for this transaction.",
        {
          approve: "Approve the transaction as legitimate.",
          decline: "Decline the transaction as fraudulent.",
          escalate: "Escalate for manual review; the risk is ambiguous.",
        },
      ),
      is_novel_anomaly: noul(
        "Probability that this transaction follows a novel, previously unseen fraud pattern.",
      ),
    },
  });

  return jevEvaluationSchema.parse({
    fraud_risk_score: Number(answers.fraud_risk_score.score) / (RISK_RUBRIC.length - 1),
    routing_action: answers.routing_action.choice,
    confidence: answers.routing_action.confidence,
    is_novel_anomaly_probability: answers.is_novel_anomaly.noul,
  });
}