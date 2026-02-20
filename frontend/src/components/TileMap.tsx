import { MapContainer, TileLayer, Polygon, useMap } from "react-leaflet"
import type { Tile } from "@/data/tiles"
import { MAP_CENTER } from "@/data/tiles"
import { useEffect } from "react"
import "leaflet/dist/leaflet.css"

const STATUS_COLORS: Record<string, { fill: string; stroke: string }> = {
  available: { fill: "#48995c", stroke: "#3a7a4a" },
  owned: { fill: "#ffb13b", stroke: "#e09520" },
  reserved: { fill: "#885138", stroke: "#6b3f2b" },
  pending_buy: { fill: "#6b7cf6", stroke: "#4f5cd4" },
}

function FitToTiles({ tiles }: { tiles: Tile[] }) {
  const map = useMap()
  useEffect(() => {
    if (tiles.length === 0) return
    const allCoords = tiles.flatMap((t) => t.coordinates)
    const lats = allCoords.map((c) => c[0])
    const lngs = allCoords.map((c) => c[1])
    map.fitBounds(
      [
        [Math.min(...lats) - 0.001, Math.min(...lngs) - 0.001],
        [Math.max(...lats) + 0.001, Math.max(...lngs) + 0.001],
      ],
      { animate: false }
    )
  }, [map, tiles])
  return null
}

interface TileMapProps {
  tiles: Tile[]
  selectedTile: Tile | null
  onSelectTile: (tile: Tile) => void
}

export function TileMap({ tiles, selectedTile, onSelectTile }: TileMapProps) {
  return (
    <MapContainer
      center={MAP_CENTER}
      zoom={16}
      minZoom={14}
      maxZoom={19}
      maxBounds={[
        [MAP_CENTER[0] - 0.02, MAP_CENTER[1] - 0.02],
        [MAP_CENTER[0] + 0.02, MAP_CENTER[1] + 0.02],
      ]}
      maxBoundsViscosity={1.0}
      className="h-full w-full"
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      />
      <FitToTiles tiles={tiles} />
      {tiles.map((tile) => {
        const isSelected = selectedTile?.id === tile.id
        const colors = STATUS_COLORS[tile.status]
        return (
          <Polygon
            key={tile.id}
            positions={tile.coordinates}
            pathOptions={{
              color: isSelected ? "#ffffff" : colors.stroke,
              fillColor: colors.fill,
              fillOpacity: isSelected ? 0.6 : 0.35,
              weight: isSelected ? 3 : 1.5,
            }}
            eventHandlers={{
              click: () => onSelectTile(tile),
            }}
          />
        )
      })}
    </MapContainer>
  )
}
