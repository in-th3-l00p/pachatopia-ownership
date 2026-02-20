import { useState } from "react"
import { useAccount, useWriteContract } from "wagmi"
import { useMutation } from "convex/react"
import { parseEther, formatEther } from "viem"
import type { Tile } from "@/data/tiles"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { PACHA_TERRA_ABI, PACHA_TERRA_ADDRESS } from "@/lib/contract"
import { api } from "../../convex/_generated/api"

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  available: "default",
  owned: "secondary",
  reserved: "outline",
}

const TERRAIN_OPTIONS = ["Forest", "Hillside", "Valley", "Riverbank", "Plateau"]
const CROP_OPTIONS = [
  "Arabica Coffee",
  "Cacao",
  "Plantain",
  "Avocado",
  "Sugarcane",
  "Yuca",
  "Fruit Trees",
  "Herbs",
  "Corn",
]

interface TilePropertiesProps {
  tile: Tile
  onAction?: () => void
}

export function TileProperties({ tile, onAction }: TilePropertiesProps) {
  const { address } = useAccount()

  const isOwner =
    !!address &&
    !!tile.owner &&
    tile.owner.toLowerCase() === address.toLowerCase()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-heading text-xl font-semibold">{tile.name}</h2>
          <p className="text-muted-foreground text-sm font-mono">{tile.id}</p>
        </div>
        <Badge variant={STATUS_VARIANT[tile.status]}>{tile.status}</Badge>
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

      {/* Price display */}
      {tile.price != null && tile.price > 0n && (
        <>
          <Separator />
          <div>
            <p className="text-muted-foreground text-sm">Price</p>
            <p className="font-semibold text-lg">
              {formatEther(tile.price)} ETH
            </p>
          </div>
        </>
      )}

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

      {tile.owner && (
        <>
          <Separator />
          <div>
            <p className="text-muted-foreground text-sm">Owner</p>
            <p className="font-mono text-sm mt-0.5 break-all">{tile.owner}</p>
          </div>
        </>
      )}

      {/* Actions */}
      <Separator />

      {tile.status === "available" && !isOwner && !!address && (
        <BuyAction tile={tile} onAction={onAction} />
      )}

      {isOwner && tile.status === "owned" && (
        <ListAction tile={tile} onAction={onAction} />
      )}

      {isOwner && tile.status === "available" && (
        <DelistAction tile={tile} onAction={onAction} />
      )}

      {isOwner && <EditMetadataAction tile={tile} />}

      {!address && tile.status === "available" && (
        <p className="text-sm text-muted-foreground text-center">
          Connect your wallet to purchase this parcel
        </p>
      )}
    </div>
  )
}

// ── Buy action ──

function BuyAction({
  tile,
  onAction,
}: {
  tile: Tile
  onAction?: () => void
}) {
  const { writeContractAsync, isPending } = useWriteContract()

  async function handleBuy() {
    if (tile.tokenId == null || tile.price == null) return

    try {
      await writeContractAsync({
        address: PACHA_TERRA_ADDRESS,
        abi: PACHA_TERRA_ABI,
        functionName: "buy",
        args: [BigInt(tile.tokenId)],
        value: tile.price,
      })
      toast.success("Parcel purchased successfully!")
      onAction?.()
    } catch (err) {
      toast.error(
        `Purchase failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      )
    }
  }

  return (
    <Button className="w-full" onClick={handleBuy} disabled={isPending}>
      {isPending
        ? "Purchasing..."
        : `Buy for ${tile.price != null ? formatEther(tile.price) : "?"} ETH`}
    </Button>
  )
}

// ── List action (set price & list for sale) ──

function ListAction({
  tile,
  onAction,
}: {
  tile: Tile
  onAction?: () => void
}) {
  const [priceEth, setPriceEth] = useState("")
  const { writeContractAsync, isPending } = useWriteContract()

  const minPrice = tile.price != null && tile.price > 0n ? tile.price : 0n
  const minPriceEth = minPrice > 0n ? formatEther(minPrice) : undefined

  async function handleList(e: React.FormEvent) {
    e.preventDefault()
    if (tile.tokenId == null || !priceEth) return

    let priceWei: bigint
    try {
      priceWei = parseEther(priceEth)
    } catch {
      toast.error("Invalid price format")
      return
    }

    if (priceWei <= 0n) {
      toast.error("Price must be greater than 0")
      return
    }

    if (priceWei <= minPrice) {
      toast.error(
        `Price must be higher than ${formatEther(minPrice)} ETH`,
      )
      return
    }

    try {
      await writeContractAsync({
        address: PACHA_TERRA_ADDRESS,
        abi: PACHA_TERRA_ABI,
        functionName: "list",
        args: [BigInt(tile.tokenId), priceWei],
      })
      toast.success("Parcel listed for sale!")
      setPriceEth("")
      onAction?.()
    } catch (err) {
      toast.error(
        `Listing failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      )
    }
  }

  return (
    <form onSubmit={handleList} className="flex flex-col gap-3">
      <div className="grid gap-2">
        <Label htmlFor="list-price">Selling Price (ETH)</Label>
        <Input
          id="list-price"
          type="number"
          step="any"
          min="0"
          placeholder={minPriceEth ? `Min: >${minPriceEth}` : "0.01"}
          value={priceEth}
          onChange={(e) => setPriceEth(e.target.value)}
        />
        {minPriceEth && (
          <p className="text-xs text-muted-foreground">
            Must be higher than {minPriceEth} ETH (price floor)
          </p>
        )}
      </div>
      <Button
        type="submit"
        className="w-full"
        disabled={isPending || !priceEth}
      >
        {isPending ? "Listing..." : "List for Sale"}
      </Button>
    </form>
  )
}

// ── Delist action ──

function DelistAction({
  tile,
  onAction,
}: {
  tile: Tile
  onAction?: () => void
}) {
  const { writeContractAsync, isPending } = useWriteContract()

  async function handleDelist() {
    if (tile.tokenId == null) return

    try {
      await writeContractAsync({
        address: PACHA_TERRA_ADDRESS,
        abi: PACHA_TERRA_ABI,
        functionName: "delist",
        args: [BigInt(tile.tokenId)],
      })
      toast.success("Parcel removed from sale")
      onAction?.()
    } catch (err) {
      toast.error(
        `Delisting failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      )
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground text-center">
        Your parcel is listed for sale
      </p>
      <Button
        variant="outline"
        className="w-full"
        onClick={handleDelist}
        disabled={isPending}
      >
        {isPending ? "Removing..." : "Remove from Sale"}
      </Button>
    </div>
  )
}

// ── Edit metadata action (owner only) ──

function EditMetadataAction({ tile }: { tile: Tile }) {
  const [editing, setEditing] = useState(false)
  const [terrain, setTerrain] = useState(tile.terrain)
  const [selectedCrops, setSelectedCrops] = useState<string[]>(tile.crops)
  const [saving, setSaving] = useState(false)
  const upsertMeta = useMutation(api.terras.upsert)

  function toggleCrop(crop: string) {
    setSelectedCrops((prev) =>
      prev.includes(crop) ? prev.filter((c) => c !== crop) : [...prev, crop],
    )
  }

  async function handleSave() {
    if (tile.tokenId == null) return
    setSaving(true)
    try {
      await upsertMeta({
        tokenId: tile.tokenId,
        terrain,
        crops: selectedCrops.length > 0 ? selectedCrops : ["None"],
      })
      toast.success("Metadata updated!")
      setEditing(false)
    } catch (err) {
      toast.error(
        `Update failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      )
    } finally {
      setSaving(false)
    }
  }

  if (!editing) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => setEditing(true)}
      >
        Edit Metadata
      </Button>
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border p-3">
      <p className="text-sm font-medium">Edit Metadata</p>

      <div className="grid gap-2">
        <Label htmlFor="edit-terrain">Terrain</Label>
        <select
          id="edit-terrain"
          value={terrain}
          onChange={(e) => setTerrain(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {TERRAIN_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-2">
        <Label>Crops</Label>
        <div className="flex flex-wrap gap-1.5">
          {CROP_OPTIONS.map((crop) => (
            <button
              key={crop}
              type="button"
              onClick={() => toggleCrop(crop)}
              className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
                selectedCrops.includes(crop)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-transparent text-muted-foreground border-input hover:bg-muted"
              }`}
            >
              {crop}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => setEditing(false)}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          className="flex-1"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  )
}
