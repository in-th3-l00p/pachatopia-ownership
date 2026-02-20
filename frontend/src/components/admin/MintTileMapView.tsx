import { useState } from "react"
import { useWriteContract } from "wagmi"
import { MintTileMapPicker } from "./MintTileMapPicker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { PACHA_TERRA_ABI, PACHA_TERRA_ADDRESS } from "@/lib/contract"
import type { Tile } from "@/data/tiles"

interface MintTileMapViewProps {
  tiles: Tile[]
  onCancel: () => void
  onSuccess: () => void
}

export function MintTileMapView({
  tiles,
  onCancel,
  onSuccess,
}: MintTileMapViewProps) {
  const [lat, setLat] = useState("")
  const [lng, setLng] = useState("")
  const [widthCm, setWidthCm] = useState("3000")
  const [heightCm, setHeightCm] = useState("3000")

  const { writeContractAsync, isPending } = useWriteContract()

  const parsedLat = lat !== "" ? parseFloat(lat) : null
  const parsedLng = lng !== "" ? parseFloat(lng) : null
  const parsedWidth = parseInt(widthCm) || 0
  const parsedHeight = parseInt(heightCm) || 0

  function handleLocationSelect(newLat: number, newLng: number) {
    setLat(newLat.toFixed(6))
    setLng(newLng.toFixed(6))
  }

  function handleTileChange(
    newLat: number,
    newLng: number,
    newWidthCm: number,
    newHeightCm: number,
  ) {
    setLat(newLat.toFixed(6))
    setLng(newLng.toFixed(6))
    setWidthCm(String(newWidthCm))
    setHeightCm(String(newHeightCm))
  }

  async function handleMint() {
    if (parsedLat === null || parsedLng === null) return

    try {
      await writeContractAsync({
        address: PACHA_TERRA_ADDRESS,
        abi: PACHA_TERRA_ABI,
        functionName: "mint",
        args: [
          Math.round(parsedLat * 1e6),
          Math.round(parsedLng * 1e6),
          parsedWidth,
          parsedHeight,
        ],
      })

      toast.success("Tile minted successfully!")
      onSuccess()
    } catch (err) {
      toast.error(
        `Failed to mint tile: ${err instanceof Error ? err.message : "Unknown error"}`,
      )
    }
  }

  return (
    <div className="flex flex-col lg:flex-row h-full">
      {/* Map area */}
      <div className="relative flex-1 min-h-[300px]">
        <MintTileMapPicker
          tiles={tiles}
          selectedLat={parsedLat}
          selectedLng={parsedLng}
          widthCm={parsedWidth}
          heightCm={parsedHeight}
          onLocationSelect={handleLocationSelect}
          onTileChange={handleTileChange}
        />
        {parsedLat === null && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-background/90 backdrop-blur rounded-lg px-4 py-2 shadow-md border text-sm text-muted-foreground">
            Click on the map to place a new tile
          </div>
        )}
      </div>

      {/* Sidebar */}
      <aside className="w-full lg:w-[360px] flex-shrink-0 border-t lg:border-t-0 lg:border-l bg-background flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h2 className="font-heading text-lg font-semibold">
              Mint New Tile
            </h2>
            <p className="text-muted-foreground text-sm">
              Click the map or enter coordinates
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        </div>

        <div className="p-4 flex flex-col gap-4 flex-1">
          {/* Coordinate inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="mint-lat">Latitude</Label>
              <Input
                id="mint-lat"
                type="number"
                step="any"
                placeholder="6.708"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mint-lng">Longitude</Label>
              <Input
                id="mint-lng"
                type="number"
                step="any"
                placeholder="-75.496"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
          </div>

          {/* Dimension inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="mint-widthCm">Width (cm)</Label>
              <Input
                id="mint-widthCm"
                type="number"
                min="1"
                value={widthCm}
                onChange={(e) => setWidthCm(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mint-heightCm">Height (cm)</Label>
              <Input
                id="mint-heightCm"
                type="number"
                min="1"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
              />
            </div>
          </div>

          {/* Area preview */}
          {parsedWidth > 0 && parsedHeight > 0 && (
            <div className="rounded-md bg-muted p-3 text-sm">
              <span className="text-muted-foreground">Area: </span>
              <span className="font-medium">
                {((parsedWidth * parsedHeight) / 10_000).toFixed(1)} m&sup2;
              </span>
            </div>
          )}

          <div className="flex-1" />

          {/* Mint button */}
          <Button
            className="w-full"
            disabled={
              parsedLat === null ||
              parsedLng === null ||
              isPending ||
              parsedWidth <= 0 ||
              parsedHeight <= 0
            }
            onClick={handleMint}
          >
            {isPending ? "Minting..." : "Confirm & Mint"}
          </Button>
        </div>
      </aside>
    </div>
  )
}
