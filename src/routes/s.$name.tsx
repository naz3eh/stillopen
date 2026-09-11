import { Link, createFileRoute } from "@tanstack/react-router";
import { ogImageUrl, STILLOPEN_URL } from "@/lib/shareOnX";

const CODE_WORD: Record<string, string> = {
  t: "Taken",
  o: "Open",
  u: "Unknown",
};

function labelsFor(name: string): { label: string; code: string }[] {
  const slug = name.toLowerCase();
  const tlds = [".com", ".io", ".dev", ".app", ".co"];
  return [
    ...tlds.map((tld) => ({ label: `${slug}${tld}`, code: "u" })),
    { label: `github.com/${slug}`, code: "u" },
  ];
}

export const Route = createFileRoute("/s/$name")({
  validateSearch: (search: Record<string, unknown>) => ({
    r: typeof search.r === "string" ? search.r.replace(/[^tou]/g, "u").slice(0, 6) : "",
  }),
  head: ({ params, search }) => {
    const name = params.name || "name";
    const codes = search.r || "uuuuuu";
    const img = ogImageUrl(name, codes);
    const title = `I checked “${name}” on Stillopen`;
    return {
      meta: [
        { title },
        {
          name: "description",
          content: `Availability check for ${name} on Stillopen. Open means the public lookup found nothing.`,
        },
        { property: "og:title", content: title },
        {
          property: "og:description",
          content: "Check if the name is still open.",
        },
        { property: "og:type", content: "website" },
        { property: "og:image", content: img },
        { property: "og:url", content: `${STILLOPEN_URL}/s/${encodeURIComponent(name)}?r=${codes}` },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:image", content: img },
        { name: "twitter:site", content: "@sablemakes" },
      ],
    };
  },
  component: SharePage,
});

function StatusPill({ code }: { code: string }) {
  const word = CODE_WORD[code] ?? "Unknown";
  if (code === "t") {
    return (
      <span className="rounded-full bg-taken/10 px-3 py-1 font-mono text-xs font-bold tracking-widest text-taken uppercase">
        {word}
      </span>
    );
  }
  if (code === "o") {
    return (
      <span className="rounded-full bg-open/10 px-3 py-1 font-mono text-xs font-bold tracking-widest text-open uppercase">
        {word}
      </span>
    );
  }
  return (
    <span className="rounded-full bg-muted px-3 py-1 font-mono text-xs tracking-widest text-muted-foreground uppercase">
      {word}
    </span>
  );
}

function SharePage() {
  const { name } = Route.useParams();
  const { r } = Route.useSearch();
  const slug = name.toLowerCase();
  const codes = (r || "uuuuuu").padEnd(6, "u").slice(0, 6);
  const rows = labelsFor(slug).map((row, i) => ({
    ...row,
    code: codes[i] ?? "u",
  }));

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-5 pt-10 pb-10 sm:pt-14">
      <header>
        <h1 className="font-display text-5xl font-extrabold tracking-tight text-foreground sm:text-6xl">
          Still<span className="text-open">open</span>
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">Check if the name is still open.</p>
      </header>

      <section className="mt-8 rounded-2xl border border-border bg-secondary/50 p-4 shadow-sm sm:p-5">
        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          Results for “{slug}”
        </p>
        <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {rows.map((row) => (
            <li key={row.label} className="flex items-center justify-between gap-4 px-4 py-3">
              <p className="truncate font-mono text-base text-foreground">{row.label}</p>
              <StatusPill code={row.code} />
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Open means the public lookup found nothing. It does not mean a registrar will sell it.
        </p>
      </section>

      <div className="mt-6">
        <Link
          to="/"
          className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-6 py-4 text-lg font-bold tracking-wide text-primary-foreground uppercase"
        >
          Check yours
        </Link>
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
