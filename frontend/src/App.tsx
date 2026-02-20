import { useState } from "react"
import { tiles } from "@/data/tiles"
import type { Tile } from "@/data/tiles"
import { TileMap } from "@/components/TileMap"
import { TileProperties } from "@/components/TileProperties"
import { MapLegend } from "@/components/MapLegend"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"

function App() {
  const [selectedTile, setSelectedTile] = useState<Tile | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  function handleSelectTile(tile: Tile) {
    setSelectedTile(tile)
    setDrawerOpen(true)
  }

  return (
    <div className="h-svh w-full flex flex-col lg:flex-row overflow-hidden">
      {/* Map — takes full viewport on mobile, flex-1 on desktop */}
      <div className="relative flex-1 min-h-0">
        <TileMap
          tiles={tiles}
          selectedTile={selectedTile}
          onSelectTile={handleSelectTile}
        />

        {/* Top bar overlay */}
        <div className="absolute top-0 inset-x-0 z-[1000] p-3 flex items-start justify-between pointer-events-none">
          <div className="pointer-events-auto bg-background/90 backdrop-blur rounded-lg px-4 py-2 shadow-md border">
            <h1 className="font-heading text-lg font-bold tracking-tight">
              Pachatopia
            </h1>
            <p className="text-muted-foreground text-xs">
              El Mundo Es Uno Solo
            </p>
          </div>
        </div>

        {/* Legend overlay */}
        <div className="absolute bottom-3 left-3 z-[1000] pointer-events-auto">
          <MapLegend />
        </div>

        {/* Tap hint on mobile when nothing selected */}
        {!selectedTile && (
          <div className="absolute bottom-3 right-3 z-[1000] lg:hidden bg-background/90 backdrop-blur rounded-lg px-3 py-2 shadow-md border text-xs text-muted-foreground">
            Tap a parcel to view details
          </div>
        )}
      </div>

      {/* Desktop sidebar — hidden on mobile */}
      <aside className="hidden lg:flex w-[360px] flex-col border-l bg-background">
        <div className="p-4 border-b">
          <h2 className="font-heading text-lg font-semibold">Parcel Details</h2>
          <p className="text-muted-foreground text-sm">
            Select a parcel on the map
          </p>
        </div>
        <ScrollArea className="flex-1">
          {selectedTile ? (
            <div className="p-4">
              <TileProperties tile={selectedTile} />
            </div>
          ) : (
            <div className="p-4">
              <EmptyState />
            </div>
          )}
        </ScrollArea>
        <div className="p-4 border-t">
          <TileStats />
        </div>
      </aside>

      {/* Mobile drawer — hidden on desktop */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="lg:hidden max-h-[70vh]">
          <DrawerHeader>
            <DrawerTitle className="font-heading">
              {selectedTile ? selectedTile.name : "Parcel Details"}
            </DrawerTitle>
          </DrawerHeader>
          <ScrollArea className="flex-1 overflow-auto">
            <div className="px-4 pb-6">
              {selectedTile ? (
                <TileProperties tile={selectedTile} />
              ) : (
                <EmptyState />
              )}
            </div>
          </ScrollArea>
        </DrawerContent>
      </Drawer>
    </div>
  )
}

function EmptyState() {
  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground font-normal text-center">
          No parcel selected
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center text-xs text-muted-foreground">
        Click on a highlighted parcel on the map to see its details, terrain
        type, crops, and sponsorship status.
      </CardContent>
    </Card>
  )
}

function TileStats() {
  const available = tiles.filter((t) => t.status === "available").length
  const sponsored = tiles.filter((t) => t.status === "sponsored").length
  const reserved = tiles.filter((t) => t.status === "reserved").length
  const totalArea = tiles.reduce((s, t) => s + t.area, 0)

  return (
    <div className="grid grid-cols-2 gap-2 text-xs">
      <div className="rounded-md bg-muted p-2">
        <p className="text-muted-foreground">Available</p>
        <p className="font-semibold text-sm">{available}</p>
      </div>
      <div className="rounded-md bg-muted p-2">
        <p className="text-muted-foreground">Sponsored</p>
        <p className="font-semibold text-sm">{sponsored}</p>
      </div>
      <div className="rounded-md bg-muted p-2">
        <p className="text-muted-foreground">Reserved</p>
        <p className="font-semibold text-sm">{reserved}</p>
      </div>
      <div className="rounded-md bg-muted p-2">
        <p className="text-muted-foreground">Total Area</p>
        <p className="font-semibold text-sm">{(totalArea / 1000).toFixed(1)}k m²</p>
      </div>
    </div>
  )
}

export default App
