import { getDefaultConfig } from "@rainbow-me/rainbowkit"
import { mainnet, sepolia } from "wagmi/chains"

export const wagmiConfig = getDefaultConfig({
  appName: "Pachatopia",
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? "PLACEHOLDER",
  chains: [sepolia, mainnet],
})

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig
  }
}
