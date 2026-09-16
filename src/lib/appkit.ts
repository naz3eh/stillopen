import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { mainnet } from "@reown/appkit/networks";
import { REOWN_PROJECT_ID } from "@/lib/reownProjectId";

const networks = [mainnet] as [typeof mainnet, ...typeof mainnet[]];

export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId: REOWN_PROJECT_ID,
  ssr: true,
});

createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId: REOWN_PROJECT_ID,
  metadata: {
    name: "Stillopen",
    description: "Check if the name is still open",
    url: "https://stillopen.naz3eh.com",
    icons: ["https://stillopen.naz3eh.com/favicon.svg"],
  },
  features: {
    analytics: false,
    email: false,
    socials: false,
    swaps: false,
    onramp: false,
  },
  themeMode: "dark",
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;
