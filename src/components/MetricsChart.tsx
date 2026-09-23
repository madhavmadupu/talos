"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type Metrics = {
  totalTransactions: number;
  totalUsers: number;
  modelBreakdown: Record<string, number>;
  actionBreakdown: Record<string, number>;
  avgRiskScore: number;
};

const MODEL_COLORS: Record<string, string> = {
  jev: "bg-chart-1",
  "jev+ollama": "bg-chart-3",
};

export function MetricsChart({
  metrics,
  lastRefreshed,
}: {
  metrics: Metrics | null;
  lastRefreshed: Date | null;
}) {
  const models = Object.entries(metrics?.modelBreakdown ?? {});
  const modelTotal = models.reduce((sum, [, count]) => sum + count, 0);

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader>
          <CardTitle>{metrics?.totalTransactions ?? "-"}</CardTitle>
          <CardDescription>Transactions assessed</CardDescription>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{metrics?.totalUsers ?? "-"}</CardTitle>
          <CardDescription>Active users</CardDescription>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{metrics ? (metrics.avgRiskScore * 100).toFixed(1) + "%" : "-"}</CardTitle>
          <CardDescription>Average risk score</CardDescription>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{metrics ? metrics.modelBreakdown["jev+ollama"] ?? 0 : "-"}</CardTitle>
          <CardDescription>Ollama fallbacks (System Two)</CardDescription>
        </CardHeader>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>System One vs System Two</CardTitle>
          <CardDescription>Jev fast path vs Ollama deep reasoning by volume</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {modelTotal === 0 ? (
            <p className="text-muted-foreground">No data yet.</p>
          ) : (
            models.map(([model, count]) => (
              <div key={model} className="flex items-center gap-3">
                <span className="w-20 text-sm text-muted-foreground">{model}</span>
                <div className="h-4 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${MODEL_COLORS[model] ?? "bg-chart-4"}`}
                    style={{ width: `${(count / modelTotal) * 100}%` }}
                  />
                </div>
                <span className="w-16 text-right text-sm tabular-nums">{count}</span>
              </div>
            ))
          )}
          {lastRefreshed && (
            <p className="pt-1 text-xs text-muted-foreground">
              Last refreshed {lastRefreshed.toLocaleTimeString()}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Routing decisions</CardTitle>
          <CardDescription>Approve / decline / escalate split</CardDescription>
        </CardHeader>
        <CardContent>
          {metrics && metrics.totalTransactions > 0 ? (
            <div className="flex h-4 w-full overflow-hidden rounded-full bg-muted">
              {Object.entries(metrics.actionBreakdown).map(([action, count]) => (
                <div
                  key={action}
                  className={action === "decline" ? "bg-destructive" : action === "escalate" ? "bg-chart-4" : "bg-chart-2"}
                  style={{ width: `${(count / metrics.totalTransactions) * 100}%` }}
                />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No data yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}