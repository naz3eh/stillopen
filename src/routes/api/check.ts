import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const bodySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(63)
    .regex(/^[a-z0-9-]+$/i, "Letters, numbers, and hyphens only"),
});

type Status = "taken" | "open" | "unknown";

interface CheckResult {
  label: string;
  kind: "domain" | "github";
  status: Status;
  detail: string;
}

// Deterministic fake availability derived from the name, so the same name
// always returns the same results while no live lookup is wired up.
function fakeStatus(seed: string): Status {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const r = h % 10;
  if (r < 4) return "taken";
  if (r < 9) return "open";
  return "unknown";
}

function buildResults(name: string): CheckResult[] {
  const slug = name.toLowerCase();
  const domains = [".com", ".io", ".dev", ".app", ".co"];
  const results: CheckResult[] = domains.map((tld) => {
    const status = fakeStatus(slug + tld);
    return {
      label: slug + tld,
      kind: "domain" as const,
      status,
      detail:
        status === "taken"
          ? "Registered"
          : status === "open"
            ? "No public record found"
            : "We could not check this one",
    };
  });
  const gh = fakeStatus(slug + "github");
  results.push({
    label: `github.com/${slug}`,
    kind: "github",
    status: gh,
    detail:
      gh === "taken"
        ? "Handle is taken"
        : gh === "open"
          ? "No public account found"
          : "We could not check this one",
  });
  return results;
}

export const Route = createFileRoute("/api/check")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON body" }, { status: 400 });
        }
        const parsed = bodySchema.safeParse(body);
        if (!parsed.success) {
          return Response.json(
            { error: parsed.error.issues[0]?.message ?? "Invalid name" },
            { status: 400 },
          );
        }
        return Response.json({ results: buildResults(parsed.data.name) });
      },
    },
  },
});
