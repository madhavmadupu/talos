import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [totalTransactions, totalUsers, modelBreakdown, actionBreakdown, avgRisk] = await Promise.all([
    db.transaction.count(),
    db.user.count(),
    db.transaction.groupBy({ by: ["modelUsed"], _count: { _all: true } }),
    db.transaction.groupBy({ by: ["finalAction"], _count: { _all: true } }),
    db.transaction.aggregate({ _avg: { riskScore: true } }),
  ]);

  return Response.json({
    totalTransactions,
    totalUsers,
    modelBreakdown: Object.fromEntries(modelBreakdown.map((m) => [m.modelUsed, m._count._all])),
    actionBreakdown: Object.fromEntries(actionBreakdown.map((a) => [a.finalAction, a._count._all])),
    avgRiskScore: avgRisk._avg.riskScore ?? 0,
  });
}