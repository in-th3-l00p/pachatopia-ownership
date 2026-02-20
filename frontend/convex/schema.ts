import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  terras: defineTable({
    tokenId: v.number(),
    terrain: v.string(),
    crops: v.array(v.string()),
  }).index("by_tokenId", ["tokenId"]),

  pendingTxs: defineTable({
    tokenId: v.number(),
    txHash: v.string(),
    action: v.union(v.literal("buy"), v.literal("list"), v.literal("delist")),
    userAddress: v.string(),
    createdAt: v.number(),
  })
    .index("by_tokenId", ["tokenId"])
    .index("by_txHash", ["txHash"]),
})
