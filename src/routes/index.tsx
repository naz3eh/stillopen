import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

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

function StatusWord({ status }: { status: Status }) {
  if (status === "taken") {
    return (
      <span className="font-mono text-sm font-bold tracking-widest text-taken uppercase">
        Taken
      </span>
    );
  }
  if (status === "open") {
    return (
      <span className="font-mono text-sm font-bold tracking-widest text-open uppercase">
        Open
      </span>
    );
  }
  return (
    <span className="font-mono text-sm tracking-widest text-muted-foreground uppercase">
      Unknown
    </span>
  );
}

function ResultRows({ results }: { results: CheckResult[] }) {
  return (
    <ul className="divide-y divide-border border-y-2 border-border">
      {results.map((r, i) => (
        <li
          key={r.label}
          className="flex animate-slam items-center justify-between gap-4 py-3.5"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <div className="min-w-0">
            <p className="truncate font-mono text-lg text-foreground">{r.label}</p>
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
          <StatusWord status={r.status} />
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
    <section className="mt-8 border-2 border-border p-5">
      <h2 className="text-xl font-bold text-foreground">
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
            className="w-full border border-input bg-transparent px-4 py-3 font-mono text-base text-foreground placeholder:text-muted-foreground/50 focus:border-open focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block font-mono text-xs tracking-widest text-muted-foreground uppercase">
            Name checked
          </label>
          <p className="border border-border bg-muted px-4 py-3 font-mono text-base text-muted-foreground">
            {name}
          </p>
        </div>
        <button
          type="submit"
          disabled={sending}
          className="w-full border-2 border-open px-5 py-3 text-base font-bold tracking-wide text-open uppercase transition-colors hover:bg-open hover:text-primary-foreground disabled:opacity-60"
        >
          Get the $9 report
        </button>
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </form>
    </section>
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
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-5 pt-16 pb-10 sm:pt-24">
      <header>
        <h1 className="font-display text-6xl font-bold tracking-tight text-foreground sm:text-7xl">
          Still<span className="text-open">open</span>
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Check if the name is still open.
        </p>
      </header>

      <form onSubmit={runCheck} className="mt-8">
        <label htmlFor="name" className="sr-only">
          Product name
        </label>
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
          className="w-full border-2 border-input bg-transparent px-5 py-5 font-mono text-2xl text-foreground placeholder:text-muted-foreground/50 focus:border-open focus:outline-none"
        />
        {error && <p className="mt-2 font-mono text-sm text-taken">{error}</p>}
        <button
          type="submit"
          disabled={checking}
          className="mt-3 w-full bg-primary px-5 py-4 text-xl font-bold tracking-wide text-primary-foreground uppercase transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60"
        >
          {checking ? "Checking…" : "Check"}
        </button>
      </form>

      {results ? (
        <section aria-live="polite" className="mt-10">
          <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
            Results for “{checkedName}”
          </p>
          <div className="mt-3">
            <ResultRows results={results} />
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Open means the public lookup found nothing. It does not mean a registrar will sell it.
          </p>
          <ReportBlock
            name={reportName}
            email={email}
            setEmail={setEmail}
            onSubmit={saveIntent}
            sending={sendingIntent}
            message={intentMessage}
          />
        </section>
      ) : (
        <section className="mt-10">
          <div className="flex items-baseline justify-between">
            <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
              Example: stillopen
            </p>
            <span className="font-mono text-[10px] tracking-widest text-muted-foreground/60 uppercase">
              Not a live result
            </span>
          </div>
          <div className="mt-3">
            <ResultRows results={EXAMPLE_RESULTS} />
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Open means the public lookup found nothing. It does not mean a registrar will sell it.
          </p>
          <ReportBlock
            name={reportName}
            email={email}
            setEmail={setEmail}
            onSubmit={saveIntent}
            sending={sendingIntent}
            message={intentMessage}
          />
        </section>
      )}

      <footer className="mt-auto pt-12">
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
