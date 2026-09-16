/**
 * Server-side Ethereum mainnet payment verification for Stillopen.
 * Uses a public JSON-RPC endpoint (no Etherscan key required).
 */
import {
  CRYPTO_PAY_ADDRESS,
  CRYPTO_PAY_AMOUNT_USD,
  ERC20_TRANSFER_TOPIC,
  ETH_USD_TOLERANCE,
  MIN_USDC_UNITS,
  normalizeAddress,
  parseTxHash,
  USDC_ETH_ADDRESS,
} from "@/lib/cryptoPay";

const RPC_URLS = [
  process.env.ETH_RPC_URL,
  "https://ethereum.publicnode.com",
  "https://cloudflare-eth.com",
  "https://rpc.ankr.com/eth",
].filter(Boolean) as string[];

export type VerifyOk = {
  ok: true;
  txHash: string;
  asset: "USDC" | "ETH";
  amountLabel: string;
};

export type VerifyFail = {
  ok: false;
  message: string;
};

export type VerifyResult = VerifyOk | VerifyFail;

type RpcReceipt = {
  status?: string;
  to?: string | null;
  logs?: Array<{
    address: string;
    topics: string[];
    data: string;
  }>;
} | null;

type RpcTx = {
  to?: string | null;
  value?: string;
} | null;

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  let lastError: Error | null = null;
  for (const url of RPC_URLS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      });
      if (!res.ok) {
        lastError = new Error(`RPC HTTP ${res.status}`);
        continue;
      }
      const json = (await res.json()) as { result?: T; error?: { message?: string } };
      if (json.error) {
        lastError = new Error(json.error.message || "RPC error");
        continue;
      }
      return json.result as T;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw lastError || new Error("All Ethereum RPCs failed");
}

async function ethUsdPrice(): Promise<number> {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
    { headers: { Accept: "application/json" } },
  );
  if (!res.ok) throw new Error(`Price HTTP ${res.status}`);
  const data = (await res.json()) as { ethereum?: { usd?: number } };
  const usd = data.ethereum?.usd;
  if (!usd || !Number.isFinite(usd) || usd <= 0) throw new Error("Bad ETH price");
  return usd;
}

function topicAddress(topic: string): string {
  // topics are 32-byte hex; address is last 20 bytes
  return normalizeAddress("0x" + topic.slice(-40));
}

function parseHexBigInt(hex: string): bigint {
  if (!hex || hex === "0x") return 0n;
  return BigInt(hex);
}

function formatEth(wei: bigint): string {
  const whole = wei / 10n ** 18n;
  const frac = (wei % 10n ** 18n).toString().padStart(18, "0").slice(0, 6).replace(/0+$/, "");
  return frac ? `${whole}.${frac} ETH` : `${whole} ETH`;
}

function formatUsdc(units: bigint): string {
  const whole = units / 10n ** 6n;
  const frac = (units % 10n ** 6n).toString().padStart(6, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac} USDC` : `${whole} USDC`;
}

/**
 * Verify a mainnet tx paid at least ~$9 USDC or ETH to CRYPTO_PAY_ADDRESS.
 */
export async function verifyCryptoPayment(txInput: string): Promise<VerifyResult> {
  const txHash = parseTxHash(txInput);
  if (!txHash) {
    return {
      ok: false,
      message: "Paste a full tx hash (0x…) or an Etherscan tx link.",
    };
  }

  const payTo = normalizeAddress(CRYPTO_PAY_ADDRESS);
  const usdc = normalizeAddress(USDC_ETH_ADDRESS);

  let receipt: RpcReceipt;
  let tx: RpcTx;
  try {
    [receipt, tx] = await Promise.all([
      rpc<RpcReceipt>("eth_getTransactionReceipt", [txHash]),
      rpc<RpcTx>("eth_getTransactionByHash", [txHash]),
    ]);
  } catch {
    return {
      ok: false,
      message: "Could not reach Ethereum. Try again in a minute.",
    };
  }

  if (!receipt || !tx) {
    return {
      ok: false,
      message: "Transaction not found on Ethereum mainnet yet. Wait for confirmation, then retry.",
    };
  }

  if (receipt.status !== "0x1") {
    return { ok: false, message: "That transaction failed on-chain. It does not count as payment." };
  }

  // USDC Transfer logs to pay address
  let usdcReceived = 0n;
  for (const log of receipt.logs || []) {
    if (normalizeAddress(log.address) !== usdc) continue;
    if (!log.topics?.[0] || normalizeAddress(log.topics[0]) !== normalizeAddress(ERC20_TRANSFER_TOPIC)) {
      continue;
    }
    if (log.topics.length < 3) continue;
    const to = topicAddress(log.topics[2]);
    if (to !== payTo) continue;
    usdcReceived += parseHexBigInt(log.data);
  }

  if (usdcReceived >= MIN_USDC_UNITS) {
    return {
      ok: true,
      txHash,
      asset: "USDC",
      amountLabel: formatUsdc(usdcReceived),
    };
  }

  // Native ETH to pay address
  const txTo = tx.to ? normalizeAddress(tx.to) : "";
  const valueWei = parseHexBigInt(tx.value || "0x0");
  if (txTo === payTo && valueWei > 0n) {
    let ethUsd: number;
    try {
      ethUsd = await ethUsdPrice();
    } catch {
      return {
        ok: false,
        message: "Could not price ETH right now. Pay with USDC, or try again shortly.",
      };
    }
    const weiPerEth = 10n ** 18n;
    // requiredWei = ($9 * tolerance) / ethUsd * 1e18
    const requiredUsd = CRYPTO_PAY_AMOUNT_USD * ETH_USD_TOLERANCE;
    const requiredWei = BigInt(Math.ceil((requiredUsd / ethUsd) * 1e18));
    if (valueWei >= requiredWei) {
      return {
        ok: true,
        txHash,
        asset: "ETH",
        amountLabel: formatEth(valueWei),
      };
    }
    return {
      ok: false,
      message: `ETH payment is under $${CRYPTO_PAY_AMOUNT_USD} (got ${formatEth(valueWei)} at ~$${ethUsd.toFixed(0)}/ETH). Send at least ~$${CRYPTO_PAY_AMOUNT_USD} worth.`,
    };
  }

  if (usdcReceived > 0n) {
    return {
      ok: false,
      message: `USDC to ${CRYPTO_PAY_ADDRESS.slice(0, 10)}… was only ${formatUsdc(usdcReceived)}. Need at least ${CRYPTO_PAY_AMOUNT_USD} USDC.`,
    };
  }

  return {
    ok: false,
    message: `No $${CRYPTO_PAY_AMOUNT_USD} USDC or ETH payment to nazeeh.eth (${CRYPTO_PAY_ADDRESS.slice(0, 10)}…) found in that tx.`,
  };
}
