import { useEffect, useState } from "react";
import { useAppKit, useAppKitAccount, useDisconnect } from "@reown/appkit/react";
import {
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { mainnet } from "wagmi/chains";
import { erc20Abi, type Address, type Hash } from "viem";
import {
  CRYPTO_PAY_ADDRESS,
  CRYPTO_PAY_AMOUNT_USD,
  CRYPTO_PAY_ENS,
  MIN_USDC_UNITS,
  USDC_ETH_ADDRESS,
} from "@/lib/cryptoPay";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  email: string;
  setEmail: (v: string) => void;
};

export function PayModal({ open, onOpenChange, name, email, setEmail }: Props) {
  const { open: openAppKit } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { disconnect } = useDisconnect();
  const { switchChainAsync, isPending: switching } = useSwitchChain();
  const {
    writeContractAsync,
    data: payHash,
    isPending: paying,
    error: payError,
    reset: resetWrite,
  } = useWriteContract();
  const { isLoading: confirming, isSuccess: confirmed } = useWaitForTransactionReceipt({
    hash: payHash,
  });

  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittedFor, setSubmittedFor] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setMessage("");
      setSubmittedFor(null);
      resetWrite();
    }
  }, [open, resetWrite]);

  useEffect(() => {
    if (!confirmed || !payHash || !address || submittedFor === payHash) return;
    const trimmedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail) || trimmedEmail.length > 255) {
      setMessage("Enter a valid email before we can send the report.");
      return;
    }

    let cancelled = false;
    (async () => {
      setSubmitting(true);
      setMessage("Payment landed. Verifying on-chain…");
      try {
        const res = await fetch("/api/save-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: trimmedEmail,
            name,
            txHash: payHash,
            walletAddress: address,
            paymentMethod: "crypto",
          }),
        });
        const data = (await res.json().catch(() => null)) as {
          message?: string;
          paid?: boolean;
        } | null;
        if (cancelled) return;
        if (!res.ok || !data?.paid) {
          setMessage(data?.message || "Payment could not be verified. Try again.");
          return;
        }
        setSubmittedFor(payHash);
        setMessage(data.message || "Payment verified. Report email coming.");
      } catch {
        if (!cancelled) setMessage("Could not reach the server. Try again.");
      } finally {
        if (!cancelled) setSubmitting(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [confirmed, payHash, address, email, name, submittedFor]);

  async function handlePay() {
    const trimmedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail) || trimmedEmail.length > 255) {
      setMessage("Enter a valid email for the report first.");
      return;
    }
    if (!isConnected || !address) {
      setMessage("Connect a wallet first.");
      return;
    }
    setMessage("");
    setSubmittedFor(null);
    try {
      await switchChainAsync({ chainId: mainnet.id });
    } catch {
      // Wallet may already be on mainnet or reject; writeContract will fail clearly.
    }
    try {
      await writeContractAsync({
        address: USDC_ETH_ADDRESS,
        abi: erc20Abi,
        functionName: "transfer",
        args: [CRYPTO_PAY_ADDRESS as Address, MIN_USDC_UNITS],
        chainId: mainnet.id,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Payment failed.";
      setMessage(msg.slice(0, 220));
    }
  }

  const busy = switching || paying || confirming || submitting;
  const short = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-border bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-left text-xl font-bold text-foreground">
            Pay {"$"}
            {CRYPTO_PAY_AMOUNT_USD} for “{name}”
          </DialogTitle>
          <DialogDescription className="text-left text-sm text-muted-foreground">
            Connect any wallet (MetaMask, Coinbase, WalletConnect QR, and more), then send {"$"}
            {CRYPTO_PAY_AMOUNT_USD} USDC on Ethereum to {CRYPTO_PAY_ENS}. We verify that payment
            on-chain before emailing the report.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-muted/50 p-4">
          <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
            Pay with wallet
          </p>
          <p className="mt-2 text-sm text-foreground">
            {"$"}
            {CRYPTO_PAY_AMOUNT_USD} USDC → <span className="font-mono font-bold">{CRYPTO_PAY_ENS}</span>
          </p>
          <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{CRYPTO_PAY_ADDRESS}</p>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Old transaction links are not accepted. Connect and send a fresh payment from your
            wallet.
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label
              htmlFor="pay-email"
              className="mb-1 block font-mono text-xs tracking-widest text-muted-foreground uppercase"
            >
              Email for the report
            </label>
            <input
              id="pay-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              maxLength={255}
              className="w-full rounded-lg border border-input bg-background px-4 py-3 font-mono text-base text-foreground placeholder:text-muted-foreground/50 focus:border-open focus:outline-none"
            />
          </div>

          {!isConnected ? (
            <button
              type="button"
              onClick={() => {
                setMessage("");
                openAppKit({ view: "Connect" });
              }}
              disabled={busy}
              className="w-full rounded-lg border-2 border-open px-5 py-3 text-base font-bold tracking-wide text-open uppercase transition-colors hover:bg-open hover:text-primary-foreground disabled:opacity-60"
            >
              Connect wallet
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2">
                <p className="font-mono text-xs text-muted-foreground">
                  Connected <span className="text-foreground">{short}</span>
                </p>
                <button
                  type="button"
                  onClick={() => disconnect()}
                  className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase hover:text-foreground"
                >
                  Disconnect
                </button>
              </div>
              <button
                type="button"
                onClick={handlePay}
                disabled={busy || Boolean(submittedFor)}
                className="w-full rounded-lg border-2 border-open px-5 py-3 text-base font-bold tracking-wide text-open uppercase transition-colors hover:bg-open hover:text-primary-foreground disabled:opacity-60"
              >
                {paying
                  ? "Confirm in wallet…"
                  : confirming
                    ? "Waiting for confirmation…"
                    : submitting
                      ? "Verifying…"
                      : submittedFor
                        ? "Paid"
                        : `Pay $${CRYPTO_PAY_AMOUNT_USD} USDC`}
              </button>
              <button
                type="button"
                onClick={() => openAppKit({ view: "Account" })}
                className="w-full font-mono text-[10px] tracking-widest text-muted-foreground uppercase hover:text-foreground"
              >
                Wallet details
              </button>
            </div>
          )}

          {payHash && (
            <p className="break-all font-mono text-[10px] text-muted-foreground">
              Tx: {payHash as Hash}
            </p>
          )}

          {(message || payError) && (
            <p className="text-sm text-muted-foreground" role="status">
              {message || payError?.message?.slice(0, 200)}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
