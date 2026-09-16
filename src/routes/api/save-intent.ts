import { createFileRoute } from "@tanstack/react-router";
import { CRYPTO_PAY_ENS } from "@/lib/cryptoPay";
import { verifyCryptoPayment } from "@/lib/verifyPayment";

type Body = {
  email?: string;
  name?: string;
  txHash?: string;
  txLink?: string;
  paymentMethod?: string;
};

function bad(message: string, status = 400) {
  return Response.json({ ok: false, paid: false, message }, { status });
}

export const Route = createFileRoute("/api/save-intent")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: Body;
        try {
          body = (await request.json()) as Body;
        } catch {
          return bad("Invalid JSON.");
        }

        const email = typeof body.email === "string" ? body.email.trim() : "";
        const name = typeof body.name === "string" ? body.name.trim().toLowerCase() : "";
        const txInput =
          (typeof body.txLink === "string" && body.txLink.trim()) ||
          (typeof body.txHash === "string" && body.txHash.trim()) ||
          "";

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
          return bad("Enter a valid email.");
        }
        if (!name || name.length > 63 || !/^[a-z0-9-]+$/.test(name)) {
          return bad("Invalid name.");
        }
        if (!txInput) {
          return bad("Transaction link is required. Paste your Etherscan tx URL or 0x hash.");
        }

        const verified = await verifyCryptoPayment(txInput);
        if (!verified.ok) {
          return bad(verified.message);
        }

        return Response.json({
          ok: true,
          paid: true,
          paymentMethod: "crypto",
          asset: verified.asset,
          amountLabel: verified.amountLabel,
          txHash: verified.txHash,
          payTo: CRYPTO_PAY_ENS,
          name,
          message: `Payment verified on-chain (${verified.amountLabel}). We will email the shareable report for “${name}” to ${email}.`,
        });
      },
    },
  },
});
