import { createFileRoute } from "@tanstack/react-router";
import { CRYPTO_PAY_ENS } from "@/lib/cryptoPay";

type Body = {
  email?: string;
  name?: string;
  txHash?: string;
  paymentMethod?: string;
};

function bad(message: string, status = 400) {
  return Response.json({ ok: false, message }, { status });
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
        const txHash = typeof body.txHash === "string" ? body.txHash.trim() : "";

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
          return bad("Enter a valid email.");
        }
        if (!name || name.length > 63 || !/^[a-z0-9-]+$/.test(name)) {
          return bad("Invalid name.");
        }
        if (txHash && !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
          return bad("Tx hash looks invalid. Paste a full 0x… hash, or leave it blank.");
        }

        // Manual fulfill for now. Do not claim payment succeeded.
        const message = txHash
          ? `Got it. Pay to ${CRYPTO_PAY_ENS} if you have not already. We will email the shareable report after confirming the payment. Not automatic yet.`
          : `Got it. Send $9 in USDC (Ethereum) or ETH to ${CRYPTO_PAY_ENS}, then reply with the tx hash if you can. We will email the shareable report after confirming. Not automatic yet.`;

        return Response.json({
          ok: true,
          paid: false,
          paymentMethod: "crypto",
          payTo: CRYPTO_PAY_ENS,
          name,
          message,
        });
      },
    },
  },
});
