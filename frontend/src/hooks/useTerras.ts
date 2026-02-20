import { useCallback, useEffect, useMemo, useRef } from "react"
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useReadContracts,
  useWatchContractEvent,
} from "wagmi"
import { useQuery, useMutation } from "convex/react"
import { PACHA_TERRA_ABI, PACHA_TERRA_ADDRESS } from "@/lib/contract"
import { activeChain } from "@/lib/wagmi"
import { cmToLatDeg, cmToLngDeg } from "@/lib/geo"
import { api } from "../../convex/_generated/api"
import type { Tile, TileStatus } from "@/data/tiles"
import type { LatLngTuple } from "leaflet"

const DISPLAY_SIZE_DEG = 0.003

const DEFAULT_TERRAINS = ["Forest", "Hillside", "Valley", "Riverbank", "Plateau"]
const DEFAULT_CROP_SETS = [
  ["Arabica Coffee", "Plantain"],
  ["Cacao", "Avocado"],
  ["Sugarcane", "Yuca"],
  ["Arabica Coffee"],
  ["Fruit Trees", "Herbs"],
  ["Cacao", "Plantain", "Corn"],
]

function getStatus(
  listed: boolean,
  owner: string,
  connectedAddress?: string,
): TileStatus {
  if (listed) return "available"
  if (
    connectedAddress &&
    owner.toLowerCase() === connectedAddress.toLowerCase()
  )
    return "owned"
  return "reserved"
}

export function useTerras() {
  const { address: connectedAddress } = useAccount()
  const publicClient = usePublicClient()
  const enabled =
    !!PACHA_TERRA_ADDRESS && PACHA_TERRA_ADDRESS !== ("0x" as `0x${string}`)

  // ── Convex reactive data ────────────────────────────────────────────────
  const convexTerras = useQuery(api.terras.list)
  const pendingTxs = useQuery(api.pendingTxs.list)
  const removeByTokenId = useMutation(api.pendingTxs.removeByTokenId)
  const syncChainState = useMutation(api.terras.syncChainState)
  const batchSyncChainState = useMutation(api.terras.batchSyncChainState)

  // Map of tokenId → full Convex document (includes optional chain state)
  const convexByTokenId = useMemo(() => {
    const map = new Map<
      number,
      {
        terrain: string
        crops: string[]
        owner?: string
        listed?: boolean
        priceWei?: string
      }
    >()
    if (convexTerras) {
      for (const t of convexTerras) {
        map.set(t.tokenId, t)
      }
    }
    return map
  }, [convexTerras])

  // Map of tokenId → in-flight action
  const pendingByTokenId = useMemo(() => {
    const map = new Map<number, "buy" | "list" | "delist">()
    if (pendingTxs) {
      for (const tx of pendingTxs) {
        map.set(tx.tokenId, tx.action)
      }
    }
    return map
  }, [pendingTxs])

  // ── Chain reads (source of truth for coordinates + verification) ────────
  const {
    data: totalSupply,
    isLoading: isLoadingSupply,
    refetch: refetchSupply,
  } = useReadContract({
    address: PACHA_TERRA_ADDRESS,
    abi: PACHA_TERRA_ABI,
    functionName: "totalSupply",
    query: { enabled },
  })

  const count = totalSupply ? Number(totalSupply) : 0

  const batchCalls = useMemo(() => {
    if (count === 0) return []
    return Array.from({ length: count }, (_, i) => [
      {
        address: PACHA_TERRA_ADDRESS,
        abi: PACHA_TERRA_ABI,
        functionName: "getTerra" as const,
        args: [BigInt(i)] as const,
        chainId: activeChain.id,
      },
      {
        address: PACHA_TERRA_ADDRESS,
        abi: PACHA_TERRA_ABI,
        functionName: "ownerOf" as const,
        args: [BigInt(i)] as const,
        chainId: activeChain.id,
      },
    ]).flat()
  }, [count])

  const {
    data: batchResults,
    isLoading: isLoadingBatch,
    refetch: refetchBatch,
  } = useReadContracts({
    contracts: batchCalls,
    query: { enabled: count > 0 },
  })

  // ── Stable refs so callbacks never become stale ─────────────────────────
  const refetchBatchRef = useRef(refetchBatch)
  refetchBatchRef.current = refetchBatch
  const refetchSupplyRef = useRef(refetchSupply)
  refetchSupplyRef.current = refetchSupply
  const removeByTokenIdRef = useRef(removeByTokenId)
  removeByTokenIdRef.current = removeByTokenId
  const syncChainStateRef = useRef(syncChainState)
  syncChainStateRef.current = syncChainState
  const batchSyncChainStateRef = useRef(batchSyncChainState)
  batchSyncChainStateRef.current = batchSyncChainState
  const publicClientRef = useRef(publicClient)
  publicClientRef.current = publicClient
  const countRef = useRef(count)
  countRef.current = count

  // ── Initial sync: on every chain batch read, push full state to Convex ──
  // Chain is authoritative — this overwrites any stale Convex data.
  useEffect(() => {
    if (!batchResults || batchResults.length === 0) return

    const tilesToSync: {
      tokenId: number
      owner: string
      listed: boolean
      priceWei: string
    }[] = []

    for (let i = 0; i < count; i++) {
      const terraResult = batchResults[i * 2]
      const ownerResult = batchResults[i * 2 + 1]
      if (
        terraResult?.status !== "success" ||
        ownerResult?.status !== "success"
      )
        continue

      const terra = terraResult.result as {
        listed: boolean
        price: bigint
      }
      const owner = ownerResult.result as string

      tilesToSync.push({
        tokenId: i,
        owner: owner.toLowerCase(),
        listed: terra.listed,
        priceWei: terra.price.toString(),
      })
    }

    if (tilesToSync.length > 0) {
      batchSyncChainStateRef.current({ tiles: tilesToSync })
    }
  }, [batchResults, count])

  // ── Targeted verification: read a single tile from chain → sync Convex ──
  // Called after every event to guarantee Convex matches on-chain truth.
  const verifyAndSyncTile = useCallback(async (tokenId: number) => {
    const client = publicClientRef.current
    if (!client) return

    try {
      const [terra, owner] = await Promise.all([
        client.readContract({
          address: PACHA_TERRA_ADDRESS,
          abi: PACHA_TERRA_ABI,
          functionName: "getTerra",
          args: [BigInt(tokenId)],
        }),
        client.readContract({
          address: PACHA_TERRA_ADDRESS,
          abi: PACHA_TERRA_ABI,
          functionName: "ownerOf",
          args: [BigInt(tokenId)],
        }),
      ])

      const t = terra as unknown as { listed: boolean; price: bigint }
      await syncChainStateRef.current({
        tokenId,
        owner: (owner as string).toLowerCase(),
        listed: t.listed,
        priceWei: t.price.toString(),
      })
    } catch (err) {
      console.error("verifyAndSyncTile failed for tokenId", tokenId, err)
    }
  }, [])

  // ── Contract event handlers ─────────────────────────────────────────────
  // Each handler: clear pending tx → verify from chain (blockchain > Convex)
  //               → also trigger wagmi batch refetch for coordinate data.

  const onTerraBought = useCallback(
    (logs: { args: { tokenId?: bigint } }[]) => {
      for (const log of logs) {
        if (log.args.tokenId == null) continue
        const tokenId = Number(log.args.tokenId)
        removeByTokenIdRef.current({ tokenId })
        verifyAndSyncTile(tokenId)
      }
      refetchBatchRef.current()
    },
    [verifyAndSyncTile],
  )

  const onListed = useCallback(
    (logs: { args: { tokenId?: bigint } }[]) => {
      for (const log of logs) {
        if (log.args.tokenId == null) continue
        const tokenId = Number(log.args.tokenId)
        removeByTokenIdRef.current({ tokenId })
        verifyAndSyncTile(tokenId)
      }
      refetchBatchRef.current()
    },
    [verifyAndSyncTile],
  )

  const onDelisted = useCallback(
    (logs: { args: { tokenId?: bigint } }[]) => {
      for (const log of logs) {
        if (log.args.tokenId == null) continue
        const tokenId = Number(log.args.tokenId)
        removeByTokenIdRef.current({ tokenId })
        verifyAndSyncTile(tokenId)
      }
      refetchBatchRef.current()
    },
    [verifyAndSyncTile],
  )

  const onTerraCreated = useCallback(() => {
    refetchSupplyRef.current()
  }, [])

  useWatchContractEvent({
    address: PACHA_TERRA_ADDRESS,
    abi: PACHA_TERRA_ABI,
    eventName: "TerraBought",
    onLogs: onTerraBought,
    enabled,
  })

  useWatchContractEvent({
    address: PACHA_TERRA_ADDRESS,
    abi: PACHA_TERRA_ABI,
    eventName: "Listed",
    onLogs: onListed,
    enabled,
  })

  useWatchContractEvent({
    address: PACHA_TERRA_ADDRESS,
    abi: PACHA_TERRA_ABI,
    eventName: "Delisted",
    onLogs: onDelisted,
    enabled,
  })

  useWatchContractEvent({
    address: PACHA_TERRA_ADDRESS,
    abi: PACHA_TERRA_ABI,
    eventName: "TerraCreated",
    onLogs: onTerraCreated,
    enabled,
  })

  // ── Build tile list ─────────────────────────────────────────────────────
  // Coordinates: always from chain (immutable after minting).
  // Owner / listed / price: Convex first (reactive, event-driven cache),
  //   falling back to chain batch data when Convex has no record yet.
  // Blockchain is authoritative — Convex is kept in sync via the syncs above.
  const tiles: Tile[] = useMemo(() => {
    if (!batchResults || batchResults.length === 0) return []

    const result: Tile[] = []
    for (let i = 0; i < count; i++) {
      const terraResult = batchResults[i * 2]
      const ownerResult = batchResults[i * 2 + 1]

      if (
        terraResult?.status !== "success" ||
        ownerResult?.status !== "success"
      )
        continue

      const chainTerra = terraResult.result as unknown as {
        lat: number
        lng: number
        widthCm: number
        heightCm: number
        listed: boolean
        price: bigint
      }
      const chainOwner = (ownerResult.result as string).toLowerCase()

      // Coordinates (immutable — always from chain)
      const latDeg = Number(chainTerra.lat) / 1e6
      const lngDeg = Number(chainTerra.lng) / 1e6
      const widthCm = Number(chainTerra.widthCm)
      const heightCm = Number(chainTerra.heightCm)
      const heightDeg = Math.max(cmToLatDeg(heightCm), DISPLAY_SIZE_DEG)
      const widthDeg = Math.max(cmToLngDeg(widthCm, latDeg), DISPLAY_SIZE_DEG)

      const coordinates: LatLngTuple[] = [
        [latDeg, lngDeg],
        [latDeg + heightDeg, lngDeg],
        [latDeg + heightDeg, lngDeg + widthDeg],
        [latDeg, lngDeg + widthDeg],
      ]

      const row = Math.floor(i / 6)
      const col = i % 6

      // Mutable state: Convex (live) > chain batch (fallback before first sync)
      const convexData = convexByTokenId.get(i)
      const owner = convexData?.owner ?? chainOwner
      const listed = convexData?.listed ?? chainTerra.listed
      const priceWei = convexData?.priceWei ?? chainTerra.price.toString()

      // Metadata
      const terrain =
        convexData?.terrain ?? DEFAULT_TERRAINS[i % DEFAULT_TERRAINS.length]
      const crops =
        convexData?.crops ?? DEFAULT_CROP_SETS[i % DEFAULT_CROP_SETS.length]

      // Status
      const baseStatus = getStatus(listed, owner, connectedAddress)
      const pending = pendingByTokenId.get(i)
      let status: TileStatus = baseStatus
      if (pending === "buy" && baseStatus === "available") {
        status = "pending_buy"
      } else if (
        pending === "list" &&
        (baseStatus === "owned" || baseStatus === "reserved")
      ) {
        status = "pending_list"
      } else if (pending === "delist" && baseStatus === "available") {
        status = "pending_delist"
      }

      result.push({
        id: `terra-${i}`,
        name: `Parcel ${String.fromCharCode(65 + row)}${col + 1}`,
        coordinates,
        center: [latDeg + heightDeg / 2, lngDeg + widthDeg / 2],
        area: (widthCm * heightCm) / 10_000,
        status,
        terrain,
        crops,
        owner,
        tokenId: i,
        price: BigInt(priceWei),
      })
    }

    return result
  }, [batchResults, count, connectedAddress, convexByTokenId, pendingByTokenId])

  const isLoading = isLoadingSupply || isLoadingBatch

  async function refetch() {
    await refetchSupply()
    await refetchBatch()
  }

  return { tiles, isLoading, totalSupply: count, refetch }
}
