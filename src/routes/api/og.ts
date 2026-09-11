import { createFileRoute } from "@tanstack/react-router";

const CODE_STATUS: Record<string, string> = {
  t: "TAKEN",
  o: "OPEN",
  u: "UNKNOWN",
};

const CODE_COLOR: Record<string, { fg: string; bg: string }> = {
  t: { fg: "#c44a3a", bg: "#f8e8e5" },
  o: { fg: "#2d9a6a", bg: "#e5f5ee" },
  u: { fg: "#8a8578", bg: "#eeebe4" },
};

function xml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function labelsFor(name: string): string[] {
  const slug = name.toLowerCase();
  return [
    `${slug}.com`,
    `${slug}.io`,
    `${slug}.dev`,
    `${slug}.app`,
    `${slug}.co`,
    `github.com/${slug}`,
  ];
}

function buildSvg(name: string, codes: string): string {
  const slug = (name || "name").slice(0, 40);
  const rows = labelsFor(slug);
  const statusCodes = [...codes.padEnd(6, "u").slice(0, 6)];
  const rowH = 46;
  const rowsTop = 210;
  const rowNodes = rows
    .map((label, i) => {
      const code = statusCodes[i] ?? "u";
      const word = CODE_STATUS[code] ?? "UNKNOWN";
      const colors = CODE_COLOR[code] ?? CODE_COLOR.u;
      const y = rowsTop + i * rowH;
      const display = xml(label.length > 34 ? `${label.slice(0, 33)}…` : label);
      return `
      <line x1="88" y1="${y}" x2="1112" y2="${y}" stroke="#ebe8e1" stroke-width="${i === 0 ? 0 : 1}" />
      <text x="112" y="${y + 36}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="24" fill="#2a2926">${display}</text>
      <rect x="980" y="${y + 12}" width="120" height="30" rx="15" fill="${colors.bg}" />
      <text x="1040" y="${y + 33}" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="13" font-weight="700" fill="${colors.fg}">${word}</text>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#faf9f7"/>
  <rect x="48" y="40" width="1104" height="550" rx="28" fill="#ffffff" stroke="#e5e2db" stroke-width="2"/>
  <text x="88" y="110" font-family="ui-sans-serif, system-ui, sans-serif" font-size="48" font-weight="800" fill="#2a2926">Still<tspan fill="#2d9a6a">open</tspan></text>
  <text x="88" y="150" font-family="ui-sans-serif, system-ui, sans-serif" font-size="22" fill="#7a7568">Name check results</text>
  <text x="88" y="182" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="32" font-weight="700" fill="#2a2926">${xml(slug)}</text>
  <rect x="88" y="${rowsTop}" width="1024" height="${rowH * 6}" rx="16" fill="none" stroke="#e5e2db" stroke-width="2"/>
  ${rowNodes}
  <text x="88" y="575" font-family="ui-sans-serif, system-ui, sans-serif" font-size="18" fill="#7a7568">@sablemakes  ·  stillopen-sigma.vercel.app</text>
</svg>`;
}

export const Route = createFileRoute("/api/og")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const n = (url.searchParams.get("n") ?? "name").replace(/[^a-z0-9-]/gi, "").slice(0, 63) || "name";
        const r = (url.searchParams.get("r") ?? "uuuuuu").replace(/[^tou]/g, "u").slice(0, 6);
        const svg = buildSvg(n, r);
        return new Response(svg, {
          headers: {
            "Content-Type": "image/svg+xml; charset=utf-8",
            "Cache-Control": "public, max-age=86400",
          },
        });
      },
    },
  },
});
