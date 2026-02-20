import type { LatLngTuple } from "leaflet"

export type TileStatus = "available" | "owned" | "reserved" | "pending_buy" | "pending_list" | "pending_delist"

export interface Tile {
  id: string
  name: string
  coordinates: LatLngTuple[]
  center: LatLngTuple
  area: number
  status: TileStatus
  terrain: string
  crops: string[]
  owner?: string
  tokenId?: number
  price?: bigint
}

export const MAP_CENTER: LatLngTuple = [6.708, -75.496]
