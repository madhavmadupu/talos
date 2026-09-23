# T.A.L.O.S. API Specification

All endpoints are Next.js Route Handlers. Errors use a standard shape:

```json
{ "error": "ERROR_CODE", "message": "human readable detail" }
```

## POST /api/transactions/process

Assess a single transaction through System One → optional System Two fallback
and persist the result.

**Rate limited:** 60 requests / minute / client IP.

Body:

```json
{
  "userId": "ckwxyz...",
  "amount": 1500.0,
  "currency": "INR",
  "merchantCategory": "electronics",
  "merchantLocation": "Hyderabad, IN",
  "isCardPresent": false
}
```

Responses:

| Status | Body |
| ------ | ---- |
| 201 | `{ transaction: {...} }` — saved row incl. `finalAction`, `riskScore`, `modelUsed`, `latencyMs`, `reasoning?` |
| 400 | `RATE_LIMITED` / `INVALID_INPUT` (Zod detail in `message`) |
| 404 | `USER_NOT_FOUND` |
| 502 | `AI_ENGINE_ERROR` / `OLLAMA_HTTP_<status>` / `AI_ENGINE_TIMEOUT` |

## GET /api/transactions/history

Recent transactions, newest first. Query param `limit` (1–200, default 50).

```
200 { "transactions": [ Transaction ] }
```

## GET /api/metrics

Dashboard stats.

```
200 {
  "totalTransactions": number,
  "totalUsers": number,
  "modelBreakdown": { "jev": number, "jev+ollama": number },
  "actionBreakdown": { "approve": number, "decline": number, "escalate": number },
  "avgRiskScore": number  // 0..1
}
```