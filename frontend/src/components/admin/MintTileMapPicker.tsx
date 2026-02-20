import {
  MapContainer,
  TileLayer,
  Polygon,
  Rectangle,
  Marker,
  Polyline,
  useMap,
  useMapEvents,
} from "react-leaflet"
import L from "leaflet"
import type { LatLngTuple } from "leaflet"
import type { Tile } from "@/data/tiles"
import { MAP_CENTER } from "@/data/tiles"
import { tileCorners, latDegToCm, lngDegToCm } from "@/lib/geo"
import { useEffect, useMemo, useRef, useState } from "react"
import "leaflet/dist/leaflet.css"

const STATUS_COLORS: Record<string, { fill: string; stroke: string }> = {
  available: { fill: "#48995c", stroke: "#3a7a4a" },
  owned: { fill: "#ffb13b", stroke: "#e09520" },
  reserved: { fill: "#885138", stroke: "#6b3f2b" },
}

const handleIcon = L.divIcon({
  className: "",
  html: '<div style="width:12px;height:12px;background:#38bdf8;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,.4);cursor:grab"></div>',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
})

const SNAP_PX = 10

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
      { animate: false },
    )
  }, [map, tiles])
  return null
}

function ClickHandler({
  onLocationSelect,
}: {
  onLocationSelect: (lat: number, lng: number) => void
}) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

// ── Draggable preview with live feedback and edge snapping ──

interface DraggablePreviewProps {
  lat: number
  lng: number
  widthCm: number
  heightCm: number
  existingTiles: Tile[]
  onTileChange: (
    lat: number,
    lng: number,
    widthCm: number,
    heightCm: number,
  ) => void
}

interface LiveRect {
  sw: LatLngTuple
  ne: LatLngTuple
}

function DraggablePreview({
  lat,
  lng,
  widthCm,
  heightCm,
  existingTiles,
  onTileChange,
}: DraggablePreviewProps) {
  const map = useMap()
  const markerRef0 = useRef<L.Marker>(null)
  const markerRef1 = useRef<L.Marker>(null)
  const markerRef2 = useRef<L.Marker>(null)
  const markerRef3 = useRef<L.Marker>(null)
  const markerRefs = [markerRef0, markerRef1, markerRef2, markerRef3]

  const [liveRect, setLiveRect] = useState<LiveRect | null>(null)
  const [activeSnaps, setActiveSnaps] = useState<{
    lats: number[]
    lngs: number[]
  }>({ lats: [], lngs: [] })

  // Corners from props (ground truth when not dragging)
  const baseCorners = useMemo(
    () => tileCorners(lat, lng, widthCm, heightCm),
    [lat, lng, widthCm, heightCm],
  )

  // Collect all unique edge lat/lng values from existing tiles
  const snapEdges = useMemo(() => {
    const lats = new Set<number>()
    const lngs = new Set<number>()
    for (const tile of existingTiles) {
      for (const coord of tile.coordinates) {
        lats.add(coord[0])
        lngs.add(coord[1])
      }
    }
    return { lats: [...lats], lngs: [...lngs] }
  }, [existingTiles])

  function snapPosition(rawLat: number, rawLng: number) {
    // Convert pixel threshold to degrees at the current zoom
    const center = map.getCenter()
    const cp = map.latLngToContainerPoint(center)
    const shifted = map.containerPointToLatLng(
      L.point(cp.x + SNAP_PX, cp.y - SNAP_PX),
    )
    const latThresh = Math.abs(shifted.lat - center.lat)
    const lngThresh = Math.abs(shifted.lng - center.lng)

    let sLat = rawLat
    let sLng = rawLng
    const snappedLats: number[] = []
    const snappedLngs: number[] = []

    // Find closest snap edge for lat
    let bestLatDist = Infinity
    for (const edge of snapEdges.lats) {
      const d = Math.abs(rawLat - edge)
      if (d < latThresh && d < bestLatDist) {
        bestLatDist = d
        sLat = edge
      }
    }
    if (sLat !== rawLat) snappedLats.push(sLat)

    // Find closest snap edge for lng
    let bestLngDist = Infinity
    for (const edge of snapEdges.lngs) {
      const d = Math.abs(rawLng - edge)
      if (d < lngThresh && d < bestLngDist) {
        bestLngDist = d
        sLng = edge
      }
    }
    if (sLng !== rawLng) snappedLngs.push(sLng)

    return { lat: sLat, lng: sLng, snappedLats, snappedLngs }
  }

  function computeRect(
    draggedLat: number,
    draggedLng: number,
    cornerIndex: number,
  ): { sw: LatLngTuple; ne: LatLngTuple } {
    const oppositeIndex = (cornerIndex + 2) % 4
    const fixed = baseCorners[oppositeIndex]
    const swLat = Math.min(draggedLat, fixed[0])
    const swLng = Math.min(draggedLng, fixed[1])
    const neLat = Math.max(draggedLat, fixed[0])
    const neLng = Math.max(draggedLng, fixed[1])
    return { sw: [swLat, swLng], ne: [neLat, neLng] }
  }

  function repositionMarkers(
    sw: LatLngTuple,
    ne: LatLngTuple,
    skipIndex: number,
  ) {
    // SW=0, NW=1, NE=2, SE=3
    const positions: LatLngTuple[] = [
      [sw[0], sw[1]],
      [ne[0], sw[1]],
      [ne[0], ne[1]],
      [sw[0], ne[1]],
    ]
    for (let i = 0; i < 4; i++) {
      if (i !== skipIndex) {
        markerRefs[i].current?.setLatLng(positions[i])
      }
    }
  }

  function handleDrag(cornerIndex: number) {
    const marker = markerRefs[cornerIndex].current
    if (!marker) return
    const pos = marker.getLatLng()
    const { lat: sLat, lng: sLng, snappedLats, snappedLngs } = snapPosition(
      pos.lat,
      pos.lng,
    )

    // Snap the marker visually
    if (sLat !== pos.lat || sLng !== pos.lng) {
      marker.setLatLng([sLat, sLng])
    }

    const rect = computeRect(sLat, sLng, cornerIndex)
    setLiveRect(rect)
    setActiveSnaps({ lats: snappedLats, lngs: snappedLngs })
    repositionMarkers(rect.sw, rect.ne, cornerIndex)
  }

  function handleDragEnd(cornerIndex: number) {
    const marker = markerRefs[cornerIndex].current
    if (!marker) return
    const pos = marker.getLatLng()
    const { lat: sLat, lng: sLng } = snapPosition(pos.lat, pos.lng)
    const rect = computeRect(sLat, sLng, cornerIndex)

    const newHeightCm = Math.max(
      1,
      Math.round(latDegToCm(rect.ne[0] - rect.sw[0])),
    )
    const newWidthCm = Math.max(
      1,
      Math.round(lngDegToCm(rect.ne[1] - rect.sw[1], rect.sw[0])),
    )

    setLiveRect(null)
    setActiveSnaps({ lats: [], lngs: [] })
    onTileChange(rect.sw[0], rect.sw[1], newWidthCm, newHeightCm)
  }

  // Bounds for the rectangle display
  const displaySW: LatLngTuple = liveRect ? liveRect.sw : baseCorners[0]
  const displayNE: LatLngTuple = liveRect ? liveRect.ne : baseCorners[2]

  // Snap guide lines extend across the visible map
  const bounds = map.getBounds()
  const farWest = bounds.getWest() - 0.01
  const farEast = bounds.getEast() + 0.01
  const farSouth = bounds.getSouth() - 0.01
  const farNorth = bounds.getNorth() + 0.01

  return (
    <>
      <Rectangle
        bounds={[displaySW, displayNE]}
        pathOptions={{
          color: "#38bdf8",
          fillColor: "#38bdf8",
          fillOpacity: 0.3,
          weight: 2,
          dashArray: "6 4",
        }}
      />

      {/* Snap guide lines */}
      {activeSnaps.lats.map((snapLat) => (
        <Polyline
          key={`snap-lat-${snapLat}`}
          positions={[
            [snapLat, farWest],
            [snapLat, farEast],
          ]}
          pathOptions={{
            color: "#facc15",
            weight: 1,
            dashArray: "4 4",
            opacity: 0.8,
          }}
        />
      ))}
      {activeSnaps.lngs.map((snapLng) => (
        <Polyline
          key={`snap-lng-${snapLng}`}
          positions={[
            [farSouth, snapLng],
            [farNorth, snapLng],
          ]}
          pathOptions={{
            color: "#facc15",
            weight: 1,
            dashArray: "4 4",
            opacity: 0.8,
          }}
        />
      ))}

      {/* Corner handles */}
      {baseCorners.map((pos, i) => (
        <Marker
          key={i}
          ref={markerRefs[i]}
          position={pos}
          icon={handleIcon}
          draggable
          eventHandlers={{
            drag: () => handleDrag(i),
            dragend: () => handleDragEnd(i),
          }}
        />
      ))}
    </>
  )
}

// ── Main map component ──

interface MintTileMapPickerProps {
  tiles: Tile[]
  selectedLat: number | null
  selectedLng: number | null
  widthCm: number
  heightCm: number
  onLocationSelect: (lat: number, lng: number) => void
  onTileChange: (
    lat: number,
    lng: number,
    widthCm: number,
    heightCm: number,
  ) => void
}

export function MintTileMapPicker({
  tiles,
  selectedLat,
  selectedLng,
  widthCm,
  heightCm,
  onLocationSelect,
  onTileChange,
}: MintTileMapPickerProps) {
  const showPreview =
    selectedLat !== null &&
    selectedLng !== null &&
    widthCm > 0 &&
    heightCm > 0

  return (
    <MapContainer
      center={MAP_CENTER}
      zoom={16}
      className="h-full w-full"
      style={{ cursor: "crosshair" }}
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
      <FitToTiles tiles={tiles} />
      <ClickHandler onLocationSelect={onLocationSelect} />

      {tiles.map((tile) => {
        const colors = STATUS_COLORS[tile.status]
        return (
          <Polygon
            key={tile.id}
            positions={tile.coordinates}
            pathOptions={{
              color: colors.stroke,
              fillColor: colors.fill,
              fillOpacity: 0.2,
              weight: 1,
            }}
          />
        )
      })}

      {showPreview && (
        <DraggablePreview
          lat={selectedLat!}
          lng={selectedLng!}
          widthCm={widthCm}
          heightCm={heightCm}
          existingTiles={tiles}
          onTileChange={onTileChange}
        />
      )}
    </MapContainer>
  )
}
