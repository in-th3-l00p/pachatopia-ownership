import type { Tile } from "@/data/tiles"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  available: "default",
  sponsored: "secondary",
  reserved: "outline",
}

interface TileTableProps {
  tiles: Tile[]
}

export function TileTable({ tiles }: TileTableProps) {
  if (tiles.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        No tiles minted yet.
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Token ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="hidden sm:table-cell">Lat</TableHead>
            <TableHead className="hidden sm:table-cell">Lng</TableHead>
            <TableHead className="hidden md:table-cell">Area</TableHead>
            <TableHead className="hidden md:table-cell">Terrain</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tiles.map((tile) => (
            <TableRow key={tile.id}>
              <TableCell className="font-mono text-xs">
                #{tile.tokenId}
              </TableCell>
              <TableCell className="font-medium">{tile.name}</TableCell>
              <TableCell className="hidden sm:table-cell font-mono text-xs">
                {tile.center[0].toFixed(4)}
              </TableCell>
              <TableCell className="hidden sm:table-cell font-mono text-xs">
                {tile.center[1].toFixed(4)}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {tile.area} m²
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {tile.terrain}
              </TableCell>
              <TableCell>
                <Badge
                  variant={STATUS_VARIANT[tile.status]}
                  className="text-xs"
                >
                  {tile.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
