import type { LatLngTuple } from "leaflet"

export function cmToLatDeg(cm: number): number {
  return cm / 11_132_000
}

export function cmToLngDeg(cm: number, latDeg: number): number {
  const latRad = (latDeg * Math.PI) / 180
  return cm / (11_132_000 * Math.cos(latRad))
}

export function latDegToCm(deg: number): number {
  return deg * 11_132_000
}

export function lngDegToCm(deg: number, latDeg: number): number {
  const latRad = (latDeg * Math.PI) / 180
  return deg * 11_132_000 * Math.cos(latRad)
}

export function tileCorners(
  lat: number,
  lng: number,
  widthCm: number,
  heightCm: number,
): [LatLngTuple, LatLngTuple, LatLngTuple, LatLngTuple] {
  const hDeg = cmToLatDeg(heightCm)
  const wDeg = cmToLngDeg(widthCm, lat)
  return [
    [lat, lng],
    [lat + hDeg, lng],
    [lat + hDeg, lng + wDeg],
    [lat, lng + wDeg],
  ]
}
