import { useEffect, useMemo, useRef } from "react"
import {
  useAccount,
  useReadContract,
  useReadContracts,
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
  const enabled =
    !!PACHA_TERRA_ADDRESS && PACHA_TERRA_ADDRESS !== ("0x" as `0x${string}`)

  // ── Convex reactive data ────────────────────────────────────────────────
  const convexTerras = useQuery(api.terras.list)
  const pendingTxs = useQuery(api.pendingTxs.list)
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

  // ── Chain reads (source of truth for coordinates) ────────────────────────
  // staleTime: Infinity — fetched once on mount, never auto-refetched.
  const {
    data: totalSupply,
    isLoading: isLoadingSupply,
    refetch: refetchSupply,
  } = useReadContract({
    address: PACHA_TERRA_ADDRESS,
    abi: PACHA_TERRA_ABI,
    functionName: "totalSupply",
    query: { enabled, staleTime: Infinity, refetchOnWindowFocus: false },
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
    query: { enabled: count > 0, staleTime: Infinity, refetchOnWindowFocus: false },
  })

  // ── Initial one-time sync: push full chain state to Convex on first load ──
  // Chain is authoritative — this overwrites any stale Convex data.
  // hasSyncedRef ensures we only do this once per page load (not on every render).
  const hasSyncedRef = useRef(false)
  const batchSyncChainStateRef = useRef(batchSyncChainState)
  batchSyncChainStateRef.current = batchSyncChainState

  useEffect(() => {
    if (hasSyncedRef.current) return
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
      hasSyncedRef.current = true
      batchSyncChainStateRef.current({ tiles: tilesToSync })
    }
  }, [batchResults, count])

  // ── Build tile list ─────────────────────────────────────────────────────
  // Coordinates: always from chain (immutable after minting).
  // Owner / listed / price: Convex first (reactive live cache),
  //   falling back to chain batch data when Convex has no record yet.
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
    hasSyncedRef.current = false
    await refetchSupply()
    await refetchBatch()
  }

  return { tiles, isLoading, totalSupply: count, refetch }
}
