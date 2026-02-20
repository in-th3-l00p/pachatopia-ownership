import { useAccount, useReadContract } from "wagmi"
import { PACHA_TERRA_ABI, PACHA_TERRA_ADDRESS } from "@/lib/contract"

export function useIsAdmin() {
  const { address } = useAccount()

  const enabled =
    !!address &&
    !!PACHA_TERRA_ADDRESS &&
    PACHA_TERRA_ADDRESS !== ("0x" as `0x${string}`)

  const { data: adminRole } = useReadContract({
    address: PACHA_TERRA_ADDRESS,
    abi: PACHA_TERRA_ABI,
    functionName: "ADMIN_ROLE",
    query: { enabled },
  })

  const { data: hasRole, isLoading } = useReadContract({
    address: PACHA_TERRA_ADDRESS,
    abi: PACHA_TERRA_ABI,
    functionName: "hasRole",
    args: adminRole && address ? [adminRole, address] : undefined,
    query: { enabled: !!adminRole && !!address },
  })

  return { isAdmin: !!hasRole, isLoading }
}
