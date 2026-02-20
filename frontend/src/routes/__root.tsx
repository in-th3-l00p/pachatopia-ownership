import { createRootRoute, Link, Outlet } from "@tanstack/react-router"
import { WagmiProvider } from "wagmi"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RainbowKitProvider } from "@rainbow-me/rainbowkit"
import { ConvexProvider, ConvexReactClient } from "convex/react"
import { wagmiConfig } from "@/lib/wagmi"
import { Toaster } from "@/components/ui/sonner"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import "@rainbow-me/rainbowkit/styles.css"

const queryClient = new QueryClient()
const convex = new ConvexReactClient(
  import.meta.env.VITE_CONVEX_URL as string,
)

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <ConvexProvider client={convex}>
            <div className="flex flex-col h-svh">
              <header className="flex items-center justify-between px-4 py-2 border-b bg-background/95 backdrop-blur z-[1001]">
                <nav className="flex items-center gap-4">
                  <Link
                    to="/"
                    className="font-heading text-lg font-bold tracking-tight"
                  >
                    Pachatopia
                  </Link>
                  <Link
                    to="/admin"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors [&.active]:text-foreground [&.active]:font-medium"
                  >
                    Admin
                  </Link>
                </nav>
                <ConnectButton
                  accountStatus={{ smallScreen: "avatar", largeScreen: "address" }}
                  showBalance={false}
                />
              </header>
              <main className="flex-1 min-h-0">
                <Outlet />
              </main>
            </div>
            <Toaster />
          </ConvexProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
