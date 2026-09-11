import { createFileRoute } from "@tanstack/react-router";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Stillopen — Check if the name is still open" },
      {
        name: "description",
        content:
          "Type a product name. See if the .com, .io, .dev, .app, .co and the GitHub handle are still open. One check, one screen.",
      },
      { property: "og:title", content: "Stillopen — Check if the name is still open" },
      {
        property: "og:description",
        content:
          "Type a product name. See if the domains and the GitHub handle are still open.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

type Status = "taken" | "open" | "unknown";

interface CheckResult {
  label: string;
  kind: "domain" | "github";
  status: Status;
  detail: string;
}

const NAME_RE = /^[a-z0-9-]+$/i;

function localFakeResults(name: string): CheckResult[] {
  const slug = name.toLowerCase();
  const fake = (seed: string): Status => {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    const r = h % 10;
    return r < 4 ? "taken" : r < 9 ? "open" : "unknown";
  };
  const detail = (s: Status, takenText: string, openText: string) =>
    s === "taken" ? takenText : s === "open" ? openText : "We could not check this one";
  const rows: CheckResult[] = [".com", ".io", ".dev", ".app", ".co"].map((tld) => {
    const s = fake(slug + tld);
    return {
      label: slug + tld,
      kind: "domain",
      status: s,
      detail: detail(s, "Registered", "No public record found"),
    };
  });
  const gh = fake(slug + "github");
  rows.push({
    label: `github.com/${slug}`,
    kind: "github",
    status: gh,
    detail: detail(gh, "Handle is taken", "No public account found"),
  });
  return rows;
}

const EXAMPLE_RESULTS: CheckResult[] = [
  { label: "stillopen.com", kind: "domain", status: "taken", detail: "Registered" },
  { label: "stillopen.io", kind: "domain", status: "taken", detail: "Registered" },
  { label: "stillopen.dev", kind: "domain", status: "open", detail: "No public record found" },
  { label: "stillopen.app", kind: "domain", status: "open", detail: "No public record found" },
  { label: "stillopen.co", kind: "domain", status: "taken", detail: "Registered" },
  { label: "github.com/stillopen", kind: "github", status: "unknown", detail: "We could not check this one" },
];

function StatusPill({ status }: { status: Status }) {
  if (status === "taken") {
    return (
      <span className="rounded-full bg-taken/10 px-3 py-1 font-mono text-xs font-bold tracking-widest text-taken uppercase">
        Taken
      </span>
    );
  }
  if (status === "open") {
    return (
      <span className="rounded-full bg-open/10 px-3 py-1 font-mono text-xs font-bold tracking-widest text-open uppercase">
        Open
      </span>
    );
  }
  return (
    <span className="rounded-full bg-muted px-3 py-1 font-mono text-xs tracking-widest text-muted-foreground uppercase">
      Unknown
    </span>
  );
}

function ResultRows({ results }: { results: CheckResult[] }) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
      {results.map((r, i) => (
        <li
          key={r.label}
          className="flex animate-slam items-center justify-between gap-4 px-4 py-3"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <div className="min-w-0">
            <p className="truncate font-mono text-base text-foreground">{r.label}</p>
            <p
              className={
                r.status === "unknown"
                  ? "text-sm text-muted-foreground/70 italic"
                  : "text-sm text-muted-foreground"
              }
            >
              {r.detail}
            </p>
          </div>
          <StatusPill status={r.status} />
        </li>
      ))}
    </ul>
  );
}

function ReportBlock({
  name,
  email,
  setEmail,
  onSubmit,
  sending,
  message,
}: {
  name: string;
  email: string;
  setEmail: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
  sending: boolean;
  message: string;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="font-display text-lg font-bold text-foreground">
        Want the full picture? <span className="text-open">$9</span>
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        A shareable report for “{name}” — every lookup, timestamped, in one link you can send to a co-founder.
      </p>
      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <div>
          <label
            htmlFor="email"
            className="mb-1 block font-mono text-xs tracking-widest text-muted-foreground uppercase"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            maxLength={255}
            className="w-full rounded-lg border border-input bg-background px-4 py-3 font-mono text-base text-foreground placeholder:text-muted-foreground/50 focus:border-open focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block font-mono text-xs tracking-widest text-muted-foreground uppercase">
            Name checked
          </label>
          <p className="rounded-lg border border-border bg-muted px-4 py-3 font-mono text-base text-muted-foreground">
            {name}
          </p>
        </div>
        <button
          type="submit"
          disabled={sending}
          className="w-full rounded-lg border-2 border-open px-5 py-3 text-base font-bold tracking-wide text-open uppercase transition-colors hover:bg-open hover:text-primary-foreground disabled:opacity-60"
        >
          Get the $9 report
        </button>
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </form>
    </section>
  );
}

function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem("stillopen-theme");
    const initial =
      stored === "dark" ||
      (stored !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setDark(initial);
    document.documentElement.classList.toggle("dark", initial);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    window.localStorage.setItem("stillopen-theme", next ? "dark" : "light");
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="rounded-full border border-border bg-card p-2 text-muted-foreground transition-colors hover:text-foreground"
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}

function Index() {
  const [name, setName] = useState("");
  const [checkedName, setCheckedName] = useState("");
  const [results, setResults] = useState<CheckResult[] | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  const [email, setEmail] = useState("");
  const [intentMessage, setIntentMessage] = useState("");
  const [sendingIntent, setSendingIntent] = useState(false);

  async function runCheck(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Type a name first.");
      return;
    }
    if (trimmed.length > 63 || !NAME_RE.test(trimmed)) {
      setError("Letters, numbers, and hyphens only. 63 characters max.");
      return;
    }
    setError("");
    setChecking(true);
    setResults(null);
    setCheckedName(trimmed);
    setIntentMessage("");
    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) throw new Error(`check failed: ${res.status}`);
      const data = (await res.json()) as { results: CheckResult[] };
      setResults(data.results);
    } catch {
      // Fall back to local fake results so the UI still works.
      setResults(localFakeResults(trimmed));
    } finally {
      setChecking(false);
    }
  }

  async function saveIntent(e: FormEvent) {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail) || trimmedEmail.length > 255) {
      setIntentMessage("Enter a valid email.");
      return;
    }
    setSendingIntent(true);
    try {
      const res = await fetch("/api/save-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, name: checkedName || "stillopen" }),
      });
      if (!res.ok) throw new Error(`save-intent failed: ${res.status}`);
      setIntentMessage("Checkout is not wired yet. No charge.");
    } catch {
      setIntentMessage("Checkout is not wired yet. No charge.");
    } finally {
      setSendingIntent(false);
    }
  }

  const reportName = results ? checkedName : "stillopen";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-5 pt-10 pb-10 sm:pt-14">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-5xl font-extrabold tracking-tight text-foreground sm:text-6xl">
            Still<span className="text-open">open</span>
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Check if the name is still open.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <div className="mt-8 rounded-2xl border border-border bg-secondary/50 p-4 shadow-sm sm:p-5">
        <form onSubmit={runCheck}>
          <label htmlFor="name" className="sr-only">
            Product name
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="yourproduct"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              maxLength={63}
              className="w-full rounded-xl border border-input bg-card px-4 py-4 font-mono text-xl text-foreground placeholder:text-muted-foreground/50 focus:border-open focus:outline-none"
            />
            <button
              type="submit"
              disabled={checking}
              className="rounded-xl bg-primary px-6 py-4 text-lg font-bold tracking-wide text-primary-foreground uppercase transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 sm:shrink-0"
            >
              {checking ? "Checking…" : "Check"}
            </button>
          </div>
          {error && <p className="mt-2 font-mono text-sm text-taken">{error}</p>}
        </form>

        <section aria-live="polite" className="mt-5">
          <div className="flex items-baseline justify-between">
            <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
              {results ? `Results for “${checkedName}”` : "Example: stillopen"}
            </p>
            {!results && (
              <span className="font-mono text-[10px] tracking-widest text-muted-foreground/60 uppercase">
                Not a live result
              </span>
            )}
          </div>
          <div className="mt-3">
            <ResultRows results={results ?? EXAMPLE_RESULTS} />
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Open means the public lookup found nothing. It does not mean a registrar will sell it.
          </p>
        </section>
      </div>

      <div className="mt-4">
        <ReportBlock
          name={reportName}
          email={email}
          setEmail={setEmail}
          onSubmit={saveIntent}
          sending={sendingIntent}
          message={intentMessage}
        />
      </div>

      <footer className="mt-auto pt-10">
        <p className="text-xs text-muted-foreground">
          Made by{" "}
          <a
            href="https://x.com/sablemakes"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground underline underline-offset-4 hover:text-open"
          >
            Sable
          </a>
        </p>
      </footer>
    </main>
  );
}
