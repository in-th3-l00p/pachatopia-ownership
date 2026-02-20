import { useAccount, useConnect, useDisconnect } from "wagmi"
import { Button } from "@/components/ui/button"

export function ConnectWallet() {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono text-muted-foreground hidden sm:inline">
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
        <Button variant="outline" size="sm" onClick={() => disconnect()}>
          Disconnect
        </Button>
      </div>
    )
  }

  return (
    <Button
      size="sm"
      onClick={() => connect({ connector: connectors[0] })}
    >
      Connect Wallet
    </Button>
  )
}
