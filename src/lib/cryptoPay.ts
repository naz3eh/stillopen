/** Interim crypto checkout while Dodo Payments is pending. */
export const CRYPTO_PAY_ENS = "nazeeh.eth";
export const CRYPTO_PAY_ADDRESS = "0x0c12522fcda861460bf1bc223eca108144ee5df4";
export const CRYPTO_PAY_AMOUNT_USD = 9;
export const CRYPTO_PAY_ASSETS = "USDC (Ethereum) or ETH";

/** Ethereum mainnet USDC (Circle). */
export const USDC_ETH_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

/** keccak256("Transfer(address,address,uint256)") */
export const ERC20_TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

export const USDC_DECIMALS = 6;
export const MIN_USDC_UNITS = BigInt(CRYPTO_PAY_AMOUNT_USD) * 10n ** BigInt(USDC_DECIMALS);

/** Allow ~5% under $9 for ETH price drift / gas rounding. */
export const ETH_USD_TOLERANCE = 0.95;

const TX_HASH_RE = /0x[a-fA-F0-9]{64}/;

/** Accept a raw hash or a common explorer URL containing one. */
export function parseTxHash(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^0x[a-fA-F0-9]{64}$/.test(trimmed)) return trimmed.toLowerCase();
  const match = trimmed.match(TX_HASH_RE);
  return match ? match[0].toLowerCase() : null;
}

export function normalizeAddress(addr: string): string {
  return addr.trim().toLowerCase();
}
