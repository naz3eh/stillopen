import { useCallback, useEffect, useState } from "react";
import {
  createPublicClient,
  createWalletClient,
  custom,
  erc20Abi,
  http,
  type Address,
  type Hash,
} from "viem";
import { mainnet } from "viem/chains";
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

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
};

function getEthereum(): EthereumProvider | null {
  if (typeof window === "undefined") return null;
  const eth = (window as unknown as { ethereum?: EthereumProvider }).ethereum;
  return eth ?? null;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  email: string;
  setEmail: (v: string) => void;
};

export function PayModal({ open, onOpenChange, name, email, setEmail }: Props) {
  const [address, setAddress] = useState<Address | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [payHash, setPayHash] = useState<Hash | null>(null);
  const [message, setMessage] = useState("");
  const [submittedFor, setSubmittedFor] = useState<string | null>(null);

  const refreshChain = useCallback(async () => {
    const eth = getEthereum();
    if (!eth) return;
    const hex = (await eth.request({ method: "eth_chainId" })) as string;
    setChainId(Number.parseInt(hex, 16));
  }, []);

  useEffect(() => {
    if (!open) {
      setMessage("");
      setPayHash(null);
      setSubmittedFor(null);
      setBusy(false);
    }
  }, [open]);

  useEffect(() => {
    const eth = getEthereum();
    if (!eth?.on) return;
    const onAccounts = (accounts: unknown) => {
      const list = accounts as string[];
      setAddress(list?.[0] ? (list[0] as Address) : null);
    };
    const onChain = (hex: unknown) => {
      setChainId(Number.parseInt(String(hex), 16));
    };
    eth.on("accountsChanged", onAccounts);
    eth.on("chainChanged", onChain);
    return () => {
      eth.removeListener?.("accountsChanged", onAccounts);
      eth.removeListener?.("chainChanged", onChain);
    };
  }, []);

  async function handleConnect() {
    const eth = getEthereum();
    if (!eth) {
      setMessage("No browser wallet found. Install MetaMask or Rabby, then retry.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
      if (!accounts?.[0]) {
        setMessage("No account returned from wallet.");
        return;
      }
      setAddress(accounts[0] as Address);
      await refreshChain();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not connect wallet.");
    } finally {
      setBusy(false);
    }
  }

  function handleDisconnect() {
    setAddress(null);
    setPayHash(null);
    setSubmittedFor(null);
    setMessage("");
  }

  async function ensureMainnet(eth: EthereumProvider) {
    const hex = (await eth.request({ method: "eth_chainId" })) as string;
    const id = Number.parseInt(hex, 16);
    setChainId(id);
    if (id === mainnet.id) return;
    try {
      await eth.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x1" }],
      });
      setChainId(mainnet.id);
    } catch (e) {
      const err = e as { code?: number };
      if (err?.code === 4902) {
        await eth.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: "0x1",
              chainName: "Ethereum Mainnet",
              nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
              rpcUrls: ["https://ethereum.publicnode.com"],
              blockExplorerUrls: ["https://etherscan.io"],
            },
          ],
        });
        setChainId(mainnet.id);
        return;
      }
      throw e instanceof Error ? e : new Error("Switch to Ethereum mainnet in your wallet.");
    }
  }

  async function handlePay() {
    const trimmedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail) || trimmedEmail.length > 255) {
      setMessage("Enter a valid email for the report first.");
      return;
    }
    const eth = getEthereum();
    if (!eth || !address) {
      setMessage("Connect your wallet first.");
      return;
    }

    setBusy(true);
    setMessage("");
    setPayHash(null);
    setSubmittedFor(null);
    try {
      await ensureMainnet(eth);
      const walletClient = createWalletClient({
        account: address,
        chain: mainnet,
        transport: custom(eth),
      });
      const hash = await walletClient.writeContract({
        address: USDC_ETH_ADDRESS,
        abi: erc20Abi,
        functionName: "transfer",
        args: [CRYPTO_PAY_ADDRESS as Address, MIN_USDC_UNITS],
        chain: mainnet,
        account: address,
      });
      setPayHash(hash);
      setMessage("Waiting for confirmation…");

      const publicClient = createPublicClient({
        chain: mainnet,
        transport: http("https://ethereum.publicnode.com"),
      });
      await publicClient.waitForTransactionReceipt({ hash });

      setMessage("Payment landed. Verifying on-chain…");
      const res = await fetch("/api/save-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmedEmail,
          name,
          txHash: hash,
          walletAddress: address,
          paymentMethod: "crypto",
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        message?: string;
        paid?: boolean;
      } | null;
      if (!res.ok || !data?.paid) {
        setMessage(data?.message || "Payment could not be verified. Try again.");
        return;
      }
      setSubmittedFor(hash);
      setMessage(data.message || "Payment verified. Report email coming.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Payment failed.";
      setMessage(msg.slice(0, 220));
    } finally {
      setBusy(false);
    }
  }

  const short = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "";
  const onMainnet = chainId === mainnet.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-border bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-left text-xl font-bold text-foreground">
            Pay {"$"}
            {CRYPTO_PAY_AMOUNT_USD} for “{name}”
          </DialogTitle>
          <DialogDescription className="text-left text-sm text-muted-foreground">
            Connect your wallet and send {"$"}
            {CRYPTO_PAY_AMOUNT_USD} USDC on Ethereum to {CRYPTO_PAY_ENS}. We verify that exact
            payment on-chain before emailing the report.
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
            Old transaction links are not accepted. You must send a fresh payment from the connected
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

          {!address ? (
            <button
              type="button"
              onClick={handleConnect}
              disabled={busy}
              className="w-full rounded-lg border-2 border-open px-5 py-3 text-base font-bold tracking-wide text-open uppercase transition-colors hover:bg-open hover:text-primary-foreground disabled:opacity-60"
            >
              {busy ? "Connecting…" : "Connect wallet"}
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2">
                <p className="font-mono text-xs text-muted-foreground">
                  Connected <span className="text-foreground">{short}</span>
                  {chainId != null && !onMainnet ? " · wrong network" : ""}
                </p>
                <button
                  type="button"
                  onClick={handleDisconnect}
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
                {busy
                  ? payHash
                    ? "Confirming…"
                    : "Confirm in wallet…"
                  : submittedFor
                    ? "Paid"
                    : `Pay $${CRYPTO_PAY_AMOUNT_USD} USDC`}
              </button>
            </div>
          )}

          {payHash && (
            <p className="break-all font-mono text-[10px] text-muted-foreground">Tx: {payHash}</p>
          )}

          {message && (
            <p className="text-sm text-muted-foreground" role="status">
              {message}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
