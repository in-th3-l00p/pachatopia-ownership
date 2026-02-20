import { useState, useEffect, useRef } from "react"
import {
  useAccount,
  usePublicClient,
  useSimulateContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi"
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
  pending_buy: "outline",
  pending_list: "outline",
  pending_delist: "outline",
}

const STATUS_LABEL: Record<string, string> = {
  available: "available",
  owned: "owned",
  reserved: "reserved",
  pending_buy: "pending purchase",
  pending_list: "pending listing",
  pending_delist: "pending delist",
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
        <Badge variant={STATUS_VARIANT[tile.status]}>{STATUS_LABEL[tile.status] ?? tile.status}</Badge>
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
        <BuyAction tile={tile} />
      )}

      {tile.status === "pending_buy" && !isOwner && (
        <PendingBuyAction tile={tile} />
      )}

      {isOwner && tile.status === "owned" && (
        <ListAction tile={tile} onAction={onAction} />
      )}

      {isOwner && tile.status === "pending_list" && (
        <PendingAction label="Listing pending..." note="Transaction confirming on-chain" />
      )}

      {isOwner && tile.status === "available" && (
        <DelistAction tile={tile} onAction={onAction} />
      )}

      {isOwner && tile.status === "pending_delist" && (
        <PendingAction label="Delist pending..." note="Transaction confirming on-chain" />
      )}

      {isOwner && <EditMetadataAction tile={tile} />}

      {!address && (tile.status === "available" || tile.status === "pending_buy") && (
        <p className="text-sm text-muted-foreground text-center">
          Connect your wallet to purchase this parcel
        </p>
      )}
    </div>
  )
}

// ── Post-confirmation sync ──
// After the user's tx confirms, reads updated tile state from chain and
// pushes it to Convex (so all clients see the change reactively).

function useConfirmAndSync(
  txHash: `0x${string}` | undefined,
  tokenId: number | null | undefined,
) {
  const publicClient = usePublicClient()
  const syncChainState = useMutation(api.terras.syncChainState)
  const removeByTokenId = useMutation(api.pendingTxs.removeByTokenId)

  const { isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: !!txHash },
  })

  // Track which hash we've already synced to avoid double-firing
  const syncedHashRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (!isSuccess || !txHash || tokenId == null) return
    if (syncedHashRef.current === txHash) return
    syncedHashRef.current = txHash

    async function sync() {
      if (!publicClient) return
      try {
        const [terra, owner] = await Promise.all([
          publicClient.readContract({
            address: PACHA_TERRA_ADDRESS,
            abi: PACHA_TERRA_ABI,
            functionName: "getTerra",
            args: [BigInt(tokenId!)],
          }),
          publicClient.readContract({
            address: PACHA_TERRA_ADDRESS,
            abi: PACHA_TERRA_ABI,
            functionName: "ownerOf",
            args: [BigInt(tokenId!)],
          }),
        ])
        const t = terra as unknown as { listed: boolean; price: bigint }
        await syncChainState({
          tokenId: tokenId!,
          owner: (owner as string).toLowerCase(),
          listed: t.listed,
          priceWei: t.price.toString(),
        })
      } catch (err) {
        console.error("useConfirmAndSync failed for tokenId", tokenId, err)
      } finally {
        // Always clear the pending tx, even if the chain read failed
        try {
          await removeByTokenId({ tokenId: tokenId! })
        } catch {}
      }
    }

    sync()
  }, [isSuccess, txHash, tokenId, publicClient, syncChainState, removeByTokenId])
}

// ── Buy action ──

function BuyAction({ tile }: { tile: Tile }) {
  const { address } = useAccount()
  const addPending = useMutation(api.pendingTxs.add)
  const [pendingHash, setPendingHash] = useState<`0x${string}` | undefined>()

  useConfirmAndSync(pendingHash, tile.tokenId)

  const canSimulate = tile.tokenId != null && tile.price != null && tile.price > 0n

  const { data: simulation, error: simulateError } = useSimulateContract({
    address: PACHA_TERRA_ADDRESS,
    abi: PACHA_TERRA_ABI,
    functionName: "buy",
    args: [BigInt(tile.tokenId ?? 0)],
    value: tile.price ?? 0n,
    query: { enabled: canSimulate },
  })

  const { writeContractAsync, isPending } = useWriteContract()

  async function handleBuy() {
    if (!simulation || tile.tokenId == null || !address) return

    try {
      const txHash = await writeContractAsync(simulation.request)
      setPendingHash(txHash)
      await addPending({
        tokenId: tile.tokenId,
        txHash,
        action: "buy",
        userAddress: address,
      })
      toast.success("Purchase submitted — waiting for confirmation")
    } catch (err) {
      toast.error(
        `Purchase failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      )
    }
  }

  const revertReason = simulateError?.message?.match(/reverted with reason string '([^']+)'/)?.[1]

  return (
    <div className="flex flex-col gap-2">
      <Button
        className="w-full"
        onClick={handleBuy}
        disabled={isPending || !simulation}
      >
        {isPending
          ? "Submitting..."
          : `Buy for ${tile.price != null ? formatEther(tile.price) : "?"} ETH`}
      </Button>
      {simulateError && (
        <p className="text-xs text-destructive text-center">
          {revertReason ?? "Transaction would fail — tile may no longer be available"}
        </p>
      )}
    </div>
  )
}

// ── Pending buy action ──

function PendingBuyAction({ tile }: { tile: Tile }) {
  return (
    <div className="flex flex-col gap-2">
      <Button className="w-full" disabled>
        Purchase pending...
      </Button>
      {tile.price != null && tile.price > 0n && (
        <p className="text-xs text-muted-foreground text-center">
          {formatEther(tile.price)} ETH — transaction confirming on-chain
        </p>
      )}
    </div>
  )
}

// ── Generic pending action ──

function PendingAction({ label, note }: { label: string; note?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <Button className="w-full" variant="outline" disabled>
        {label}
      </Button>
      {note && (
        <p className="text-xs text-muted-foreground text-center">{note}</p>
      )}
    </div>
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
  const { address } = useAccount()
  const addPending = useMutation(api.pendingTxs.add)
  const [priceEth, setPriceEth] = useState("")
  const [pendingHash, setPendingHash] = useState<`0x${string}` | undefined>()
  const { writeContractAsync, isPending } = useWriteContract()

  useConfirmAndSync(pendingHash, tile.tokenId)

  async function handleList(e: React.FormEvent) {
    e.preventDefault()
    if (tile.tokenId == null || !priceEth || !address) return

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

    try {
      const txHash = await writeContractAsync({
        address: PACHA_TERRA_ADDRESS,
        abi: PACHA_TERRA_ABI,
        functionName: "list",
        args: [BigInt(tile.tokenId), priceWei],
      })
      setPendingHash(txHash)
      await addPending({ tokenId: tile.tokenId, txHash, action: "list", userAddress: address })
      toast.success("Listing submitted — waiting for confirmation")
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
          placeholder="0.01"
          value={priceEth}
          onChange={(e) => setPriceEth(e.target.value)}
        />
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
  const { address } = useAccount()
  const addPending = useMutation(api.pendingTxs.add)
  const [pendingHash, setPendingHash] = useState<`0x${string}` | undefined>()
  const { writeContractAsync, isPending } = useWriteContract()

  useConfirmAndSync(pendingHash, tile.tokenId)

  async function handleDelist() {
    if (tile.tokenId == null || !address) return

    try {
      const txHash = await writeContractAsync({
        address: PACHA_TERRA_ADDRESS,
        abi: PACHA_TERRA_ABI,
        functionName: "delist",
        args: [BigInt(tile.tokenId)],
      })
      setPendingHash(txHash)
      await addPending({ tokenId: tile.tokenId, txHash, action: "delist", userAddress: address })
      toast.success("Delist submitted — waiting for confirmation")
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
