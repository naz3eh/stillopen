export type ShareStatus = "taken" | "open" | "unknown";

export interface ShareResultRow {
  label: string;
  kind: "domain" | "github";
  status: ShareStatus;
}

export const STILLOPEN_URL = "https://stillopen-sigma.vercel.app";
export const STILLOPEN_CREDIT = "@sablemakes";

const STATUS_CODE: Record<ShareStatus, string> = {
  taken: "t",
  open: "o",
  unknown: "u",
};

const CODE_STATUS: Record<string, ShareStatus> = {
  t: "taken",
  o: "open",
  u: "unknown",
};

export function encodeStatusCodes(results: ShareResultRow[]): string {
  return results.map((r) => STATUS_CODE[r.status] ?? "u").join("");
}

export function decodeStatusCodes(codes: string): ShareStatus[] {
  return [...codes].map((c) => CODE_STATUS[c] ?? "unknown");
}

export function sharePageUrl(name: string, results: ShareResultRow[]): string {
  const slug = name.trim().toLowerCase();
  const r = encodeStatusCodes(results);
  return `${STILLOPEN_URL}/s/${encodeURIComponent(slug)}?r=${encodeURIComponent(r)}`;
}

export function ogImageUrl(name: string, codes: string): string {
  const slug = name.trim().toLowerCase();
  const params = new URLSearchParams({ n: slug, r: codes });
  return `${STILLOPEN_URL}/api/og?${params.toString()}`;
}

/** Pre-written tweet for the X compose draft. */
export function buildTweetText(name: string, results: ShareResultRow[]): string {
  return [
    `I checked “${name}” and this is how its availability looks like.`,
    "",
    `via ${STILLOPEN_CREDIT}`,
    "",
    "check yours now here 👇",
    sharePageUrl(name, results),
  ].join("\n");
}

function statusWord(status: ShareStatus): string {
  if (status === "taken") return "Taken";
  if (status === "open") return "Open";
  return "Unknown";
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function statusColors(status: ShareStatus): { fg: string; bg: string } {
  if (status === "taken") return { fg: "#c44a3a", bg: "rgba(196, 74, 58, 0.12)" };
  if (status === "open") return { fg: "#2d9a6a", bg: "rgba(45, 154, 106, 0.12)" };
  return { fg: "#8a8578", bg: "rgba(138, 133, 120, 0.14)" };
}

/** Draw a clean light share card and return a PNG blob. */
export function generateShareCardPng(name: string, results: ShareResultRow[]): Promise<Blob> {
  const width = 1200;
  const height = 980;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Canvas not supported"));

  ctx.fillStyle = "#faf9f7";
  ctx.fillRect(0, 0, width, height);

  const pad = 56;
  const cardX = pad;
  const cardY = pad;
  const cardW = width - pad * 2;
  const cardH = height - pad * 2;

  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#e5e2db";
  ctx.lineWidth = 2;
  roundRect(ctx, cardX, cardY, cardW, cardH, 28);
  ctx.fill();
  ctx.stroke();

  const left = cardX + 56;
  let y = cardY + 78;

  ctx.font = '800 58px "Sora", ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = "#2a2926";
  ctx.fillText("Still", left, y);
  const stillW = ctx.measureText("Still").width;
  ctx.fillStyle = "#2d9a6a";
  ctx.fillText("open", left + stillW, y);

  y += 44;
  ctx.font = '500 26px "Manrope", ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = "#7a7568";
  ctx.fillText("Name check results", left, y);

  y += 58;
  ctx.font = '700 42px "JetBrains Mono", ui-monospace, monospace';
  ctx.fillStyle = "#2a2926";
  const displayName = name.length > 28 ? `${name.slice(0, 27)}…` : name;
  ctx.fillText(displayName, left, y);

  y += 36;

  const rowsX = cardX + 40;
  const rowsW = cardW - 80;
  const rowH = 78;
  const rowsTop = y;
  const rowsBoxH = results.length * rowH;
  ctx.strokeStyle = "#e5e2db";
  ctx.lineWidth = 2;
  roundRect(ctx, rowsX, rowsTop, rowsW, rowsBoxH, 16);
  ctx.stroke();

  results.forEach((r, i) => {
    const ry = rowsTop + i * rowH;
    if (i > 0) {
      ctx.strokeStyle = "#ebe8e1";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(rowsX + 1, ry);
      ctx.lineTo(rowsX + rowsW - 1, ry);
      ctx.stroke();
    }

    const rowLabel = r.label.length > 36 ? `${r.label.slice(0, 35)}…` : r.label;
    ctx.font = '500 26px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillStyle = "#2a2926";
    ctx.fillText(rowLabel, rowsX + 24, ry + 48);

    const pill = statusWord(r.status).toUpperCase();
    ctx.font = '700 16px "JetBrains Mono", ui-monospace, monospace';
    const tw = ctx.measureText(pill).width;
    const pw = tw + 28;
    const ph = 32;
    const px = rowsX + rowsW - pw - 24;
    const py = ry + (rowH - ph) / 2;
    const colors = statusColors(r.status);

    ctx.fillStyle = colors.bg;
    roundRect(ctx, px, py, pw, ph, 999);
    ctx.fill();
    ctx.fillStyle = colors.fg;
    ctx.fillText(pill, px + 14, py + 22);
  });

  const footerY = cardY + cardH - 40;
  ctx.font = '500 22px "Manrope", ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = "#7a7568";
  ctx.fillText(`${STILLOPEN_CREDIT}  ·  stillopen-sigma.vercel.app`, left, footerY);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Failed to encode PNG"));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}

function openIntent(text: string) {
  const intent = `https://x.com/intent/post?text=${encodeURIComponent(text)}`;
  window.open(intent, "_blank", "noopener,noreferrer");
}

async function copyPng(blob: Blob): Promise<boolean> {
  try {
    if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) return false;
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    return true;
  } catch {
    return false;
  }
}

export type ShareOnXOutcome = "intent" | "intent-copied";

/**
 * Open X compose immediately with prefilled text. Copy the results PNG so it
 * can be pasted into the draft. The tweet URL is a share page whose OG image
 * is the same card (X intent cannot attach media via query params).
 */
export async function shareOnX(name: string, results: ShareResultRow[]): Promise<ShareOnXOutcome> {
  const text = buildTweetText(name, results);
  openIntent(text);
  try {
    const blob = await generateShareCardPng(name, results);
    const copied = await copyPng(blob);
    return copied ? "intent-copied" : "intent";
  } catch {
    return "intent";
  }
}
