import { getDefaultConfig } from "@rainbow-me/rainbowkit"
import { http } from "wagmi"
import { mainnet, sepolia, foundry } from "wagmi/chains"

const chains = {
  foundry,
  sepolia,
  mainnet,
} as const

export const activeChain =
  chains[(import.meta.env.VITE_CHAIN as keyof typeof chains) ?? "foundry"] ??
  foundry

export const wagmiConfig = getDefaultConfig({
  appName: "Pachatopia",
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? "PLACEHOLDER",
  chains: [activeChain],
  transports: {
    [activeChain.id]: http(activeChain.id === foundry.id ? "http://127.0.0.1:8545" : undefined),
  },
})

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig
  }
}
