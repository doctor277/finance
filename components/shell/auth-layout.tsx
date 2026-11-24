import { Logo } from "./logo";

const POINTS = [
  "Import a CSV from any bank: columns are matched for you",
  "See exactly why a row was rejected, and download the ones to fix",
  "Transactions already in the account are spotted and skipped",
  "Reports by category, month and payee, exportable to CSV",
];

/** Sign-in / sign-up frame: what the app does on the left, Clerk's form on the right. */
export const AuthLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
    <aside className="hidden flex-col justify-between bg-sidebar p-10 text-sidebar-foreground lg:flex">
      <Logo />
      <div className="max-w-md space-y-6">
        <h1 className="text-3xl font-semibold leading-tight tracking-tight">
          Bank exports in, clean books out.
        </h1>
        <ul className="space-y-3 text-sidebar-muted">
          {POINTS.map((point) => (
            <li key={point} className="flex gap-3">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-sidebar-foreground/60" aria-hidden />
              {point}
            </li>
          ))}
        </ul>
      </div>
      <p className="text-sm text-sidebar-muted">A portfolio project. Use test data, not your real bank login.</p>
    </aside>
    <main className="flex flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="lg:hidden">
        <Logo className="text-primary" />
      </div>
      {children}
    </main>
  </div>
);
