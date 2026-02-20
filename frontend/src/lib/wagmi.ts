import { getDefaultConfig } from "@rainbow-me/rainbowkit"
import { http } from "wagmi"
import { mainnet, sepolia, foundry } from "wagmi/chains"

const rpcUrl = import.meta.env.VITE_RPC_URL ?? "http://127.0.0.1:8545"

export const wagmiConfig = getDefaultConfig({
  appName: "Pachatopia",
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? "PLACEHOLDER",
  chains: [foundry, sepolia, mainnet],
  transports: {
    [foundry.id]: http(rpcUrl),
    [sepolia.id]: http(),
    [mainnet.id]: http(),
  },
})

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig
  }
}
