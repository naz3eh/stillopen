export type ShareStatus = "taken" | "open" | "unknown";

export interface ShareResultRow {
  label: string;
  kind: "domain" | "github";
  status: ShareStatus;
}

export const STILLOPEN_URL = "https://stillopen-sigma.vercel.app";
export const STILLOPEN_CREDIT = "@sablemakes";

function statusWord(status: ShareStatus): string {
  if (status === "taken") return "Taken";
  if (status === "open") return "Open";
  return "Unknown";
}

function shortLabel(row: ShareResultRow): string {
  if (row.kind === "github") return "GitHub";
  const match = /\.(com|io|dev|app|co)$/i.exec(row.label);
  return match ? `.${match[1]!.toLowerCase()}` : row.label;
}

/** Pre-written tweet for the X intent URL. Honest: Open = public lookup found nothing. */
export function buildTweetText(name: string, results: ShareResultRow[]): string {
  const summary = results.map((r) => `${shortLabel(r)} ${statusWord(r.status)}`).join(" · ");

  return [
    `I checked “${name}” on Stillopen:`,
    "",
    summary,
    "",
    "Open = public lookup found nothing.",
    "",
    STILLOPEN_URL,
    `via ${STILLOPEN_CREDIT}`,
  ].join("\n");
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

function safeFilename(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  return `stillopen-${slug || "name"}.png`;
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

  // Page background
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

  // Wordmark: Still + open
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

  // Rows container border
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

  // Footer
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

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke after a tick so the download can start
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function openIntent(text: string) {
  const intent = `https://x.com/intent/post?text=${encodeURIComponent(text)}`;
  window.open(intent, "_blank", "noopener,noreferrer");
}

export type ShareOnXOutcome = "shared" | "intent" | "aborted";

/**
 * Prefer navigator.share with the PNG when supported; otherwise download the
 * PNG and open the X intent URL (media cannot be attached via query params).
 */
export async function shareOnX(name: string, results: ShareResultRow[]): Promise<ShareOnXOutcome> {
  const text = buildTweetText(name, results);
  const blob = await generateShareCardPng(name, results);
  const filename = safeFilename(name);
  const file = new File([blob], filename, { type: "image/png" });

  try {
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.canShare === "function" &&
      typeof navigator.share === "function" &&
      navigator.canShare({ files: [file] })
    ) {
      await navigator.share({
        text,
        url: STILLOPEN_URL,
        files: [file],
      });
      return "shared";
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return "aborted";
    }
    // Fall through to download + intent
  }

  downloadBlob(blob, filename);
  openIntent(text);
  return "intent";
}
