import { db } from "@/lib/db";
import { rateLimit, processTransactionInputSchema, formatZodError, buildTransactionState } from "@/lib/utils";
import { routeTransaction } from "@/lib/routing";
import { evaluateWithJev } from "@/lib/ai/jev-client";
import { reasonWithOllama } from "@/lib/ai/ollama-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  if (!rateLimit(ip)) {
    return Response.json(
      { error: "RATE_LIMITED", message: "Too many requests. Try again shortly." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = processTransactionInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(formatZodError(parsed.error), { status: 400 });
  }

  const user = await db.user.findUnique({ where: { id: parsed.data.userId } });
  if (!user) {
    return Response.json(
      { error: "USER_NOT_FOUND", message: `No user exists with id '${parsed.data.userId}'.` },
      { status: 404 },
    );
  }

  try {
    const decision = await routeTransaction(buildTransactionState(user, parsed.data), {
      evaluateWithJev,
      reasonWithOllama,
    });

    const transaction = await db.transaction.create({
      data: {
        userId: user.id,
        amount: parsed.data.amount,
        currency: parsed.data.currency,
        merchantCategory: parsed.data.merchantCategory,
        merchantLocation: parsed.data.merchantLocation,
        isCardPresent: parsed.data.isCardPresent,
        finalAction: decision.finalAction,
        riskScore: decision.riskScore,
        modelUsed: decision.modelUsed,
        latencyMs: decision.latencyMs,
        reasoning: decision.reasoning,
      },
    });

    return Response.json({ transaction }, { status: 201 });
  } catch (error) {
    const errorCode =
      error instanceof Error && error.message.startsWith("OLLAMA_")
        ? error.message
        : "AI_ENGINE_ERROR";
    console.error("process failed:", error instanceof Error ? error.message : error);
    return Response.json(
      { error: errorCode, message: "The AI routing engine failed to process this transaction." },
      { status: 502 },
    );
  }
}