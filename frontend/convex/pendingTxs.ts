import { query, mutation } from "./_generated/server"
import { v } from "convex/values"

const STALE_MS = 10 * 60 * 1000 // 10 minutes

export const list = query({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - STALE_MS
    return await ctx.db
      .query("pendingTxs")
      .filter((q) => q.gt(q.field("createdAt"), cutoff))
      .collect()
  },
})

export const add = mutation({
  args: {
    tokenId: v.number(),
    txHash: v.string(),
    action: v.union(v.literal("buy"), v.literal("list"), v.literal("delist")),
    userAddress: v.string(),
  },
  handler: async (ctx, args) => {
    // Remove any existing pending entries for this tokenId first
    const existing = await ctx.db
      .query("pendingTxs")
      .withIndex("by_tokenId", (q) => q.eq("tokenId", args.tokenId))
      .collect()
    for (const e of existing) {
      await ctx.db.delete(e._id)
    }

    return await ctx.db.insert("pendingTxs", {
      ...args,
      createdAt: Date.now(),
    })
  },
})

export const removeByTokenId = mutation({
  args: { tokenId: v.number() },
  handler: async (ctx, { tokenId }) => {
    const entries = await ctx.db
      .query("pendingTxs")
      .withIndex("by_tokenId", (q) => q.eq("tokenId", tokenId))
      .collect()
    for (const e of entries) {
      await ctx.db.delete(e._id)
    }
  },
})

export const removeByTxHash = mutation({
  args: { txHash: v.string() },
  handler: async (ctx, { txHash }) => {
    const entries = await ctx.db
      .query("pendingTxs")
      .withIndex("by_txHash", (q) => q.eq("txHash", txHash))
      .collect()
    for (const e of entries) {
      await ctx.db.delete(e._id)
    }
  },
})
