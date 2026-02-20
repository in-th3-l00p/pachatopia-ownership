export const PACHA_TERRA_ADDRESS = (import.meta.env.VITE_TERRA_ADDRESS ?? "0x") as `0x${string}`

export const PACHA_TERRA_ABI = [
  {
    type: "function",
    name: "totalSupply",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "tokenByIndex",
    inputs: [{ name: "index", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getTerra",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "lat", type: "int32" },
          { name: "lng", type: "int32" },
          { name: "widthCm", type: "uint32" },
          { name: "heightCm", type: "uint32" },
          { name: "listed", type: "bool" },
          { name: "price", type: "uint256" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "ownerOf",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "mint",
    inputs: [
      { name: "lat", type: "int32" },
      { name: "lng", type: "int32" },
      { name: "widthCm", type: "uint32" },
      { name: "heightCm", type: "uint32" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "buy",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "list",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "price", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "delist",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const
