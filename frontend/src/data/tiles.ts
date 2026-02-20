import type { LatLngTuple } from "leaflet"

export type TileStatus = "available" | "sponsored" | "reserved"

export interface Tile {
  id: string
  name: string
  coordinates: LatLngTuple[]
  center: LatLngTuple
  area: number // m²
  status: TileStatus
  terrain: string
  crops: string[]
  sponsor?: string
  tokenId?: number
}

// Demo tiles around Antioquia, Colombia (Pachatopia's location)
const BASE_LAT = 6.702
const BASE_LNG = -75.505

function rect(
  row: number,
  col: number,
  size = 0.003
): LatLngTuple[] {
  const lat = BASE_LAT + row * size
  const lng = BASE_LNG + col * size
  return [
    [lat, lng],
    [lat + size, lng],
    [lat + size, lng + size],
    [lat, lng + size],
  ]
}

function center(coords: LatLngTuple[]): LatLngTuple {
  const lat = coords.reduce((s, c) => s + c[0], 0) / coords.length
  const lng = coords.reduce((s, c) => s + c[1], 0) / coords.length
  return [lat, lng]
}

const terrains = ["Forest", "Hillside", "Valley", "Riverbank", "Plateau"]
const cropSets = [
  ["Arabica Coffee", "Plantain"],
  ["Cacao", "Avocado"],
  ["Sugarcane", "Yuca"],
  ["Arabica Coffee"],
  ["Fruit Trees", "Herbs"],
  ["Cacao", "Plantain", "Corn"],
]

export const tiles: Tile[] = Array.from({ length: 24 }, (_, i) => {
  const row = Math.floor(i / 6)
  const col = i % 6
  const coords = rect(row, col)
  const status: TileStatus = i < 8 ? "sponsored" : i < 16 ? "available" : "reserved"

  return {
    id: `tile-${String(i + 1).padStart(3, "0")}`,
    name: `Parcel ${String.fromCharCode(65 + row)}${col + 1}`,
    coordinates: coords,
    center: center(coords),
    area: 900 + Math.floor(Math.random() * 200),
    status,
    terrain: terrains[i % terrains.length],
    crops: cropSets[i % cropSets.length],
    sponsor: status === "sponsored" ? `0x${Math.random().toString(16).slice(2, 10)}...` : undefined,
    tokenId: status === "sponsored" ? 1000 + i : undefined,
  }
})

export const MAP_CENTER: LatLngTuple = [
  BASE_LAT + 0.006,
  BASE_LNG + 0.009,
]
