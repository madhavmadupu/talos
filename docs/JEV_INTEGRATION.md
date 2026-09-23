# TypeSafe Jev Integration

Jev is TypeSafe's **System One** model. It takes unstructured state and typed
questions, returning calibrated probabilistic decisions — it does not generate
text, cannot hallucinate, and responds in ~70–500ms.

- Docs: https://docs.typesafe.ai
- SDK: `@typesafe-ai/sdk` (reads `TYPESAFE_API_KEY`, defaults model to
  `jev-latest`).

## Questions used

| Key | Type | Purpose |
| --- | --- | --- |
| `fraud_risk_score` | Score (5-level rubric) | Risk 0–1, normalized from level index |
| `routing_action` | Choice `[approve, decline, escalate]` | Routing decision |
| `is_novel_anomaly` | Noul | Probability this is a novel, unseen fraud pattern |

## Decision gate

Jev returns a `confidence` (0–1) on Choice/Score answers. If
`confidence > JEV_CONFIDENCE_THRESHOLD` (default `0.85`) the Jev
`routing_action` is accepted; otherwise the transaction is sent to the local
Ollama fallback (System Two) for deep reasoning.

## HTTP reference (raw, without the SDK)

```
POST https://api.typesafe.ai/v1/systemone
Authorization: Bearer <TYPESAFE_API_KEY>

{
  "state": { "transaction_amount": 4500.0, "...": "..." },
  "model": "jev-latest",
  "questions": {
    "fraud_risk_score": {
      "type": "score",
      "instructions": "Rate fraud risk of this transaction.",
      "criteria": ["no risk", "low risk", "moderate", "high risk", "certain fraud"]
    },
    "routing_action": {
      "type": "choice",
      "instructions": "Select the routing action.",
      "criteria": {
        "approve": "process normally",
        "decline": "refuse the transaction",
        "escalate": "flag for manual review"
      }
    },
    "is_novel_anomaly": {
      "type": "noul",
      "instructions": "Probability this is a novel fraud pattern."
    }
  }
}
```

Response answers carry `choice`, `confidence`, `probabilities`, `score`,
`legend`, and `noul` fields as applicable.

## Environment variables

| Variable | Description |
| --- | --- |
| `TYPESAFE_API_KEY` | API key for api.typesafe.ai (`.env.local`) |
| `JEV_CONFIDENCE_THRESHOLD` | High-confidence gate (default `0.85`) |