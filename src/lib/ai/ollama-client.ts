import type { JevEvaluation, OllamaEvaluation, TransactionState } from "@/types";
import { ollamaReplySchema } from "@/lib/utils";

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "llama3.2:3b";
const OLLAMA_TIMEOUT_MS = 30_000;

const PROMPT = (state: TransactionState, jev: JevEvaluation): string =>
  `You are a fraud analyst. The System One model evaluated the transaction below but was not confident enough to
route it automatically. Its provisional output was:
${JSON.stringify(jev, null, 2)}

Transaction state:
${JSON.stringify(state, null, 2)}

Perform deep reasoning. Provide exactly a two-sentence reasoning chain, then a final routing decision.
Respond with strict JSON only, matching this shape:
{"reasoning": "two sentence chain", "final_action": "approve" | "decline" | "escalate", "risk_score": 0.0-1.0}`;

export async function reasonWithOllama(
  state: TransactionState,
  jev: JevEvaluation,
): Promise<OllamaEvaluation> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);
  try {
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        format: "json",
        messages: [{ role: "user", content: PROMPT(state, jev) }],
      }),
    });
    if (!response.ok) {
      throw new Error(`OLLAMA_HTTP_${response.status}`);
    }
    const body = (await response.json()) as { message?: { content?: string } };
    const content = body.message?.content ?? "";
    const parsed = ollamaReplySchema.parse(JSON.parse(content));
    return {
      finalAction: parsed.final_action,
      riskScore: parsed.risk_score,
      reasoning: parsed.reasoning,
    };
  } finally {
    clearTimeout(timer);
  }
}