import Link from "next/link";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
          <span className="text-lg font-heading font-bold tracking-tight">
            T.A.L.O.S.
          </span>
          <span className="text-sm text-muted-foreground">
            Transaction Assessment & Logic Orchestration System
          </span>
          <span className="ml-auto">
            <Link
              href="/"
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Dashboard
            </Link>
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-6 p-4">{children}</main>
      <footer className="mx-auto max-w-6xl p-4 text-xs text-muted-foreground">
        System One (Jev) fast path · System Two (Ollama) fallback when confidence ≤ 85% · 100% local except Jev API call
      </footer>
    </div>
  );
}