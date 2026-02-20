import { useCallback, useMemo, useRef } from "react"
import { useAccount, useReadContract, useReadContracts, useWatchContractEvent } from "wagmi"
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
    !!PACHA_TERRA_ADDRESS && PACHA_TERRA_ADDRESS !== ("0x" as `0x${string}`);

  // Fetch metadata from Convex
  const convexTerras = useQuery(api.terras.list)
  // Fetch pending transactions from Convex (reactive)
  const pendingTxs = useQuery(api.pendingTxs.list)
  const removeByTokenId = useMutation(api.pendingTxs.removeByTokenId)

  const metaByTokenId = useMemo(() => {
    const map = new Map<number, { terrain: string; crops: string[] }>()
    if (convexTerras) {
      for (const t of convexTerras) {
        map.set(t.tokenId, { terrain: t.terrain, crops: t.crops })
      }
    }
    return map
  }, [convexTerras])

  // Map of tokenId → pending action
  const pendingByTokenId = useMemo(() => {
    const map = new Map<number, "buy" | "list" | "delist">()
    if (pendingTxs) {
      for (const tx of pendingTxs) {
        map.set(tx.tokenId, tx.action)
      }
    }
    return map
  }, [pendingTxs])

  const {
    data: totalSupply,
    isLoading: isLoadingSupply,
    refetch: refetchSupply,
  } = useReadContract({
    address: PACHA_TERRA_ADDRESS,
    abi: PACHA_TERRA_ABI,
    functionName: "totalSupply",
    query: { enabled },
  });

  const count = totalSupply ? Number(totalSupply) : 0

  const batchCalls = useMemo(() => {
    if (count === 0)
      return [];
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
    ]).flat();
  }, [count])

  const {
    data: batchResults,
    isLoading: isLoadingBatch,
    refetch: refetchBatch,
  } = useReadContracts({
    contracts: batchCalls,
    query: { enabled: count > 0 },
  })

  // Keep stable refs to avoid re-registering event watchers on every render
  const refetchBatchRef = useRef(refetchBatch)
  refetchBatchRef.current = refetchBatch
  const refetchSupplyRef = useRef(refetchSupply)
  refetchSupplyRef.current = refetchSupply
  const removeByTokenIdRef = useRef(removeByTokenId)
  removeByTokenIdRef.current = removeByTokenId

  const onTerraBought = useCallback((logs: { args: { tokenId?: bigint } }[]) => {
    for (const log of logs) {
      if (log.args.tokenId != null) {
        removeByTokenIdRef.current({ tokenId: Number(log.args.tokenId) })
      }
    }
    refetchBatchRef.current()
  }, [])

  const onListed = useCallback((logs: { args: { tokenId?: bigint } }[]) => {
    for (const log of logs) {
      if (log.args.tokenId != null) {
        removeByTokenIdRef.current({ tokenId: Number(log.args.tokenId) })
      }
    }
    refetchBatchRef.current()
  }, [])

  const onDelisted = useCallback((logs: { args: { tokenId?: bigint } }[]) => {
    for (const log of logs) {
      if (log.args.tokenId != null) {
        removeByTokenIdRef.current({ tokenId: Number(log.args.tokenId) })
      }
    }
    refetchBatchRef.current()
  }, [])

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

  const tiles: Tile[] = useMemo(() => {
    if (!batchResults || batchResults.length === 0)
      return [];

    const result: Tile[] = []
    for (let i = 0; i < count; i++) {
      const terraResult = batchResults[i * 2];
      const ownerResult = batchResults[i * 2 + 1];

      if (
        terraResult?.status !== "success" ||
        ownerResult?.status !== "success"
      )
        continue;

      const terra = terraResult.result as unknown as {
        lat: number
        lng: number
        widthCm: number
        heightCm: number
        listed: boolean
        price: bigint
      };
      const owner = ownerResult.result as unknown as string;

      const latDeg = Number(terra.lat) / 1e6;
      const lngDeg = Number(terra.lng) / 1e6;
      const widthCm = Number(terra.widthCm);
      const heightCm = Number(terra.heightCm);
      const listed = terra.listed;

      const heightDeg = Math.max(cmToLatDeg(heightCm), DISPLAY_SIZE_DEG);
      const widthDeg = Math.max(cmToLngDeg(widthCm, latDeg), DISPLAY_SIZE_DEG);

      const coordinates: LatLngTuple[] = [
        [latDeg, lngDeg],
        [latDeg + heightDeg, lngDeg],
        [latDeg + heightDeg, lngDeg + widthDeg],
        [latDeg, lngDeg + widthDeg],
      ];

      const row = Math.floor(i / 6);
      const col = i % 6;

      const meta = metaByTokenId.get(i)

      const baseStatus = getStatus(listed, owner, connectedAddress)
      const pending = pendingByTokenId.get(i)
      let status: TileStatus = baseStatus
      if (pending === "buy" && baseStatus === "available") {
        status = "pending_buy"
      } else if (pending === "list" && (baseStatus === "owned" || baseStatus === "reserved")) {
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
        terrain: meta?.terrain ?? DEFAULT_TERRAINS[i % DEFAULT_TERRAINS.length],
        crops: meta?.crops ?? DEFAULT_CROP_SETS[i % DEFAULT_CROP_SETS.length],
        owner,
        tokenId: i,
        price: terra.price,
      });
    }

    return result
  }, [batchResults, count, connectedAddress, metaByTokenId, pendingByTokenId]);

  const isLoading = isLoadingSupply || isLoadingBatch;

  async function refetch() {
    await refetchSupply()
    await refetchBatch()
  };

  return { tiles, isLoading, totalSupply: count, refetch };
}
