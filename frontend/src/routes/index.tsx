import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import type { Tile } from "@/data/tiles"
import { useTerras } from "@/hooks/useTerras"
import { TileMap } from "@/components/TileMap"
import { MapLegend } from "@/components/MapLegend"
import { ParcelSidebar } from "@/components/ParcelSidebar"

export const Route = createFileRoute("/")({
  component: MapPage,
})

function MapPage() {
  const [selectedTile, setSelectedTile] = useState<Tile | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { tiles, isLoading, refetch } = useTerras()

  function handleSelectTile(tile: Tile) {
    setSelectedTile(tile)
    setDrawerOpen(true)
  }

  return (
    <div className="h-full w-full flex flex-col lg:flex-row overflow-hidden">
      {/* Map */}
      <div className="relative flex-1 min-h-0">
        <TileMap
          tiles={tiles}
          selectedTile={selectedTile}
          onSelectTile={handleSelectTile}
        />

        {/* Legend overlay */}
        <div className="absolute bottom-3 left-3 z-[1000] pointer-events-auto">
          <MapLegend />
        </div>

        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-background/90 backdrop-blur rounded-lg px-3 py-2 shadow-md border text-xs text-muted-foreground">
            Loading tiles from contract...
          </div>
        )}

        {/* Tap hint on mobile */}
        {!selectedTile && !isLoading && tiles.length > 0 && (
          <div className="absolute bottom-3 right-3 z-[1000] lg:hidden bg-background/90 backdrop-blur rounded-lg px-3 py-2 shadow-md border text-xs text-muted-foreground">
            Tap a parcel to view details
          </div>
        )}
      </div>

      <ParcelSidebar
        tiles={tiles}
        selectedTile={selectedTile}
        drawerOpen={drawerOpen}
        onDrawerOpenChange={setDrawerOpen}
        onAction={refetch}
      />
    </div>
  )
}
