import type { JevEvaluation, OllamaEvaluation, RouteDecision, TransactionState } from "@/types";

const CONFIDENCE_THRESHOLD = Number(process.env.JEV_CONFIDENCE_THRESHOLD ?? 0.85);

export interface RoutingDeps {
  evaluateWithJev: (state: TransactionState) => Promise<JevEvaluation>;
  reasonWithOllama: (state: TransactionState, jev: JevEvaluation) => Promise<OllamaEvaluation>;
}

export async function routeTransaction(state: TransactionState, deps: RoutingDeps): Promise<RouteDecision> {
  const start = performance.now();
  const jev = await deps.evaluateWithJev(state);

  if (jev.confidence > CONFIDENCE_THRESHOLD) {
    return {
      finalAction: jev.routing_action,
      riskScore: jev.fraud_risk_score,
      modelUsed: "jev",
      latencyMs: Math.round(performance.now() - start),
      reasoning: null,
    };
  }

  const ollama = await deps.reasonWithOllama(state, jev);
  return {
    finalAction: ollama.finalAction,
    riskScore: ollama.riskScore,
    modelUsed: "jev+ollama",
    latencyMs: Math.round(performance.now() - start),
    reasoning: ollama.reasoning,
  };
}