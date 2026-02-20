import { getDefaultConfig } from "@rainbow-me/rainbowkit"
import { mainnet, sepolia, foundry } from "wagmi/chains"

export const wagmiConfig = getDefaultConfig({
  appName: "Pachatopia",
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? "PLACEHOLDER",
  chains: [foundry, sepolia, mainnet],
})

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig
  }
}
