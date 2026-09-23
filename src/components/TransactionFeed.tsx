"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type FeedTransaction = {
  id: string;
  amount: number;
  currency: string;
  merchantCategory: string;
  merchantLocation: string;
  isCardPresent: boolean;
  timestamp: string;
  finalAction: string;
  riskScore: number;
  modelUsed: string;
  latencyMs: number;
  reasoning: string | null;
  user: { homeCountry: string };
};

function actionVariant(action: string): "destructive" | "outline" | "secondary" {
  if (action === "decline") return "destructive";
  if (action === "escalate") return "outline";
  return "secondary";
}

function modelVariant(model: string): "default" | "outline" {
  return model === "jev" ? "default" : "outline";
}

export function TransactionFeed({ transactions }: { transactions: FeedTransaction[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Time</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Merchant</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>Action</TableHead>
          <TableHead>Risk</TableHead>
          <TableHead>Model</TableHead>
          <TableHead>Latency</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
              No transactions yet. Run <code>npm run db:seed</code> to populate.
            </TableCell>
          </TableRow>
        ) : (
          transactions.map((tx) => (
            <TableRow key={tx.id} title={tx.reasoning ?? undefined}>
              <TableCell className="text-muted-foreground">
                {new Date(tx.timestamp).toLocaleTimeString()}
              </TableCell>
              <TableCell className="font-medium">
                {tx.currency} {tx.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </TableCell>
              <TableCell className="capitalize">{tx.merchantCategory}</TableCell>
              <TableCell>
                {tx.merchantLocation} ({tx.user.homeCountry})
              </TableCell>
              <TableCell>
                <Badge variant={actionVariant(tx.finalAction)}>{tx.finalAction}</Badge>
              </TableCell>
              <TableCell>{tx.riskScore.toFixed(2)}</TableCell>
              <TableCell>
                <Badge variant={modelVariant(tx.modelUsed)}>{tx.modelUsed}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">{tx.latencyMs}ms</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}