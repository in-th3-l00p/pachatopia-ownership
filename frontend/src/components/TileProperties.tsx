import type { Tile } from "@/data/tiles"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  available: "default",
  sponsored: "secondary",
  reserved: "outline",
}

interface TilePropertiesProps {
  tile: Tile
}

export function TileProperties({ tile }: TilePropertiesProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-heading text-xl font-semibold">{tile.name}</h2>
          <p className="text-muted-foreground text-sm font-mono">{tile.id}</p>
        </div>
        <Badge variant={STATUS_VARIANT[tile.status]}>
          {tile.status}
        </Badge>
      </div>

      <Separator />

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-muted-foreground">Area</p>
          <p className="font-medium">{tile.area} m²</p>
        </div>
        <div>
          <p className="text-muted-foreground">Terrain</p>
          <p className="font-medium">{tile.terrain}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Coordinates</p>
          <p className="font-medium font-mono text-xs">
            {tile.center[0].toFixed(4)}, {tile.center[1].toFixed(4)}
          </p>
        </div>
        {tile.tokenId != null && (
          <div>
            <p className="text-muted-foreground">Token ID</p>
            <p className="font-medium font-mono">#{tile.tokenId}</p>
          </div>
        )}
      </div>

      <Separator />

      <div>
        <p className="text-muted-foreground text-sm mb-2">Crops</p>
        <div className="flex flex-wrap gap-1.5">
          {tile.crops.map((crop) => (
            <Badge key={crop} variant="outline" className="text-xs">
              {crop}
            </Badge>
          ))}
        </div>
      </div>

      {tile.sponsor && (
        <>
          <Separator />
          <div>
            <p className="text-muted-foreground text-sm">Sponsor</p>
            <p className="font-mono text-sm mt-0.5 break-all">{tile.sponsor}</p>
          </div>
        </>
      )}

      {tile.status === "available" && (
        <>
          <Separator />
          <Button className="w-full">Sponsor this Parcel</Button>
        </>
      )}
    </div>
  )
}
