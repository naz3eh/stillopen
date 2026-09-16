import { http, createConfig } from "wagmi";
import { mainnet } from "wagmi/chains";
import { injected } from "wagmi/connectors";

/** Browser wallets (MetaMask, Rabby, Brave, etc.). No WalletConnect project id required. */
export const wagmiConfig = createConfig({
  chains: [mainnet],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [mainnet.id]: http(),
  },
  ssr: true,
});
