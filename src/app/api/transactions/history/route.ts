import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 50), 1), 200);

  const transactions = await db.transaction.findMany({
    orderBy: { timestamp: "desc" },
    take: limit,
    include: { user: { select: { homeCountry: true } } },
  });

  return Response.json({ transactions });
}