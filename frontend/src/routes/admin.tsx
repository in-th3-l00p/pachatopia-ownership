import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { useTerras } from "@/hooks/useTerras"
import { TileTable } from "@/components/admin/TileTable"
import { MintTileDialog } from "@/components/admin/MintTileDialog"
import { Button } from "@/components/ui/button"

export const Route = createFileRoute("/admin")({
  component: AdminPage,
})

function AdminPage() {
  const [mintOpen, setMintOpen] = useState(false)
  const { tiles, isLoading, refetch } = useTerras()

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h1 className="font-heading text-xl font-bold">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading
              ? "Loading terra parcels..."
              : `${tiles.length} minted terra parcels`}
          </p>
        </div>
        <Button onClick={() => setMintOpen(true)}>Mint Tile</Button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Loading tiles from contract...
          </div>
        ) : (
          <TileTable tiles={tiles} />
        )}
      </div>

      <MintTileDialog
        open={mintOpen}
        onOpenChange={setMintOpen}
        onSuccess={refetch}
      />
    </div>
  )
}
