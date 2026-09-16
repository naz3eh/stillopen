import { createFileRoute } from "@tanstack/react-router";
import { CRYPTO_PAY_ENS, normalizeAddress } from "@/lib/cryptoPay";
import { verifyCryptoPayment } from "@/lib/verifyPayment";

type Body = {
  email?: string;
  name?: string;
  txHash?: string;
  walletAddress?: string;
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
        const txHash = typeof body.txHash === "string" ? body.txHash.trim() : "";
        const walletAddress =
          typeof body.walletAddress === "string" ? normalizeAddress(body.walletAddress) : "";

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
          return bad("Enter a valid email.");
        }
        if (!name || name.length > 63 || !/^[a-z0-9-]+$/.test(name)) {
          return bad("Invalid name.");
        }
        if (!walletAddress || !/^0x[a-f0-9]{40}$/.test(walletAddress)) {
          return bad("Connect your wallet and pay from it first.");
        }
        if (!txHash) {
          return bad("Pay $9 USDC from your wallet first, then we verify that transaction.");
        }

        const verified = await verifyCryptoPayment(txHash, walletAddress);
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
          from: verified.from,
          payTo: CRYPTO_PAY_ENS,
          name,
          message: `Payment verified on-chain (${verified.amountLabel}). We will email the shareable report for “${name}” to ${email}.`,
        });
      },
    },
  },
});
