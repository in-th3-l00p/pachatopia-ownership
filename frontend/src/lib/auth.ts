// Mock admin address (Hardhat/Anvil default account #0).
// Replace with your deployer address, or swap for an on-chain hasRole() check.
export const MOCK_ADMIN_ADDRESS =
  "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" as const

export function isAdmin(address: string | undefined): boolean {
  if (!address) return false
  return address.toLowerCase() === MOCK_ADMIN_ADDRESS.toLowerCase()
}

// Future: replace isAdmin with on-chain check:
//
// import { readContract } from "wagmi/actions"
// import { keccak256, toBytes } from "viem"
// import { wagmiConfig } from "./wagmi"
//
// const ADMIN_ROLE = keccak256(toBytes("ADMIN_ROLE"))
//
// export async function isAdminOnChain(address: `0x${string}`): Promise<boolean> {
//   return readContract(wagmiConfig, {
//     address: PACHA_TERRA_ADDRESS,
//     abi: pachaTerraAbi,
//     functionName: "hasRole",
//     args: [ADMIN_ROLE, address],
//   })
// }
