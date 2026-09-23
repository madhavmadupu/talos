export type RoutingAction = "approve" | "decline" | "escalate";

export interface TransactionState {
  transaction_amount: number;
  currency: string;
  merchant_category: string;
  merchant_location: string;
  is_card_present: boolean;
  user_home_country: string;
  user_typical_monthly_spend: number;
  user_account_age_days: number;
  user_history_summary: string;
}

export interface JevEvaluation {
  fraud_risk_score: number;
  routing_action: RoutingAction;
  confidence: number;
  is_novel_anomaly_probability: number;
}

export interface OllamaEvaluation {
  finalAction: RoutingAction;
  riskScore: number;
  reasoning: string;
}

export interface RouteDecision {
  finalAction: RoutingAction;
  riskScore: number;
  modelUsed: string;
  latencyMs: number;
  reasoning: string | null;
}