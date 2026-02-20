import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState, useEffect } from "react"
import { useTerras } from "@/hooks/useTerras"
import { useIsAdmin } from "@/hooks/useIsAdmin"
import { TileTable } from "@/components/admin/TileTable"
import { MintTileMapView } from "@/components/admin/MintTileMapView"
import { Button } from "@/components/ui/button"

export const Route = createFileRoute("/admin")({
  component: AdminPage,
})

function AdminPage() {
  const { isAdmin, isLoading: isCheckingRole } = useIsAdmin()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isCheckingRole && !isAdmin) {
      navigate({ to: "/" })
    }
  }, [isAdmin, isCheckingRole, navigate])

  if (isCheckingRole) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        Checking permissions...
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return <AdminDashboard />
}

function AdminDashboard() {
  const [mintMode, setMintMode] = useState(false)
  const { tiles, isLoading, refetch } = useTerras()

  function handleMintSuccess() {
    refetch()
    setMintMode(false)
  }

  if (mintMode) {
    return (
      <MintTileMapView
        tiles={tiles}
        onCancel={() => setMintMode(false)}
        onSuccess={handleMintSuccess}
      />
    )
  }

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
        <Button onClick={() => setMintMode(true)}>Mint Tile</Button>
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
    </div>
  )
}
