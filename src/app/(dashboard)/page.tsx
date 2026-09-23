"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricsChart, type Metrics } from "@/components/MetricsChart";
import { TransactionFeed, type FeedTransaction } from "@/components/TransactionFeed";

const REFRESH_MS = 5000;

export default function DashboardPage() {
  const [transactions, setTransactions] = useState<FeedTransaction[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  useEffect(() => {
    let active = true;

    async function refresh() {
      try {
        const [histRes, metricsRes] = await Promise.all([
          fetch("/api/transactions/history?limit=25"),
          fetch("/api/metrics"),
        ]);
        if (!active) return;
        const [hist, met] = await Promise.all([histRes.json(), metricsRes.json()]);
        setTransactions(hist.transactions ?? []);
        setMetrics(met);
        setLastRefreshed(new Date());
      } catch {
        // keep last known data on transient errors
      }
    }

    refresh();
    const id = setInterval(refresh, REFRESH_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="space-y-6">
      <MetricsChart metrics={metrics} lastRefreshed={lastRefreshed} />
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Live transaction feed</CardTitle>
          <CardDescription>
            Latest assessed transactions, refreshing every {(REFRESH_MS / 1000).toFixed(0)}s
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <TransactionFeed transactions={transactions} />
        </CardContent>
      </Card>
    </div>
  );
}