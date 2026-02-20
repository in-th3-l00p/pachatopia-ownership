import { query, mutation } from "./_generated/server"
import { v } from "convex/values"

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("terras").collect()
  },
})

export const getByTokenId = query({
  args: { tokenId: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("terras")
      .withIndex("by_tokenId", (q) => q.eq("tokenId", args.tokenId))
      .unique()
  },
})

export const upsert = mutation({
  args: {
    tokenId: v.number(),
    terrain: v.string(),
    crops: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("terras")
      .withIndex("by_tokenId", (q) => q.eq("tokenId", args.tokenId))
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, {
        terrain: args.terrain,
        crops: args.crops,
      })
      return existing._id
    }

    return await ctx.db.insert("terras", args)
  },
})
