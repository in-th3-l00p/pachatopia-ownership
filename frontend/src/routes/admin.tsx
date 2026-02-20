import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { tiles } from "@/data/tiles"
import { TileTable } from "@/components/admin/TileTable"
import { MintTileDialog } from "@/components/admin/MintTileDialog"
import { Button } from "@/components/ui/button"

export const Route = createFileRoute("/admin")({
  component: AdminPage,
})

function AdminPage() {
  const [mintOpen, setMintOpen] = useState(false)

  // Mock: use demo tiles that have a tokenId (i.e. "owned" ones)
  const mintedTiles = tiles.filter((t) => t.tokenId != null)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h1 className="font-heading text-xl font-bold">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Manage minted terra parcels
          </p>
        </div>
        <Button onClick={() => setMintOpen(true)}>
          Mint Tile
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <TileTable tiles={mintedTiles} />
      </div>

      <MintTileDialog open={mintOpen} onOpenChange={setMintOpen} />
    </div>
  )
}
