import type { Tile } from "@/data/tiles"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { TileProperties } from "@/components/TileProperties"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"

interface ParcelSidebarProps {
  tiles: Tile[]
  selectedTile: Tile | null
  drawerOpen: boolean
  onDrawerOpenChange: (open: boolean) => void
  onAction?: () => void
}

export function ParcelSidebar({
  tiles,
  selectedTile,
  drawerOpen,
  onDrawerOpenChange,
  onAction,
}: ParcelSidebarProps) {
  const isDesktop = useMediaQuery("(min-width: 1024px)")

  if (isDesktop) {
    return (
      <aside className="flex w-[360px] flex-col border-l bg-background">
        <div className="p-4 border-b">
          <h2 className="font-heading text-lg font-semibold">
            Parcel Details
          </h2>
          <p className="text-muted-foreground text-sm">
            Select a parcel on the map
          </p>
        </div>
        <ScrollArea className="flex-1">
          {selectedTile ? (
            <div className="p-4">
              <TileProperties tile={selectedTile} onAction={onAction} />
            </div>
          ) : (
            <div className="p-4">
              <EmptyState />
            </div>
          )}
        </ScrollArea>
        <div className="p-4 border-t">
          <TileStats tiles={tiles} />
        </div>
      </aside>
    )
  }

  return (
    <Drawer open={drawerOpen} onOpenChange={onDrawerOpenChange}>
      <DrawerContent className="max-h-[80vh]">
        <DrawerHeader>
          <DrawerTitle className="font-heading">
            {selectedTile ? selectedTile.name : "Parcel Details"}
          </DrawerTitle>
          <DrawerDescription>
            {selectedTile
              ? `Details for parcel ${selectedTile.id}`
              : "Select a parcel on the map"}
          </DrawerDescription>
        </DrawerHeader>
        <ScrollArea className="flex-1 overflow-auto">
          <div className="px-4 pb-6">
            {selectedTile ? (
              <TileProperties tile={selectedTile} onAction={onAction} />
            ) : (
              <EmptyState />
            )}
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
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
        type, crops, and ownership status.
      </CardContent>
    </Card>
  )
}

function TileStats({ tiles }: { tiles: Tile[] }) {
  const available = tiles.filter((t) => t.status === "available").length
  const owned = tiles.filter((t) => t.status === "owned").length
  const reserved = tiles.filter((t) => t.status === "reserved").length
  const totalArea = tiles.reduce((s, t) => s + t.area, 0)

  return (
    <div className="grid grid-cols-2 gap-2 text-xs">
      <div className="rounded-md bg-muted p-2">
        <p className="text-muted-foreground">Available</p>
        <p className="font-semibold text-sm">{available}</p>
      </div>
      <div className="rounded-md bg-muted p-2">
        <p className="text-muted-foreground">Owned</p>
        <p className="font-semibold text-sm">{owned}</p>
      </div>
      <div className="rounded-md bg-muted p-2">
        <p className="text-muted-foreground">Reserved</p>
        <p className="font-semibold text-sm">{reserved}</p>
      </div>
      <div className="rounded-md bg-muted p-2">
        <p className="text-muted-foreground">Total Area</p>
        <p className="font-semibold text-sm">
          {totalArea > 1000
            ? `${(totalArea / 1000).toFixed(1)}k m²`
            : `${totalArea} m²`}
        </p>
      </div>
    </div>
  )
}
