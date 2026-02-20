import { query, mutation } from "./_generated/server"
import { v } from "convex/values"

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("terras").collect()
  },
})

export const getByStatus = query({
  args: { status: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("terras")
      .withIndex("by_status", (q) => q.eq("status", args.status as "available" | "owned" | "reserved"))
      .collect()
  },
})

export const mint = mutation({
  args: {
    tokenId: v.number(),
    lat: v.number(),
    lng: v.number(),
    widthCm: v.number(),
    heightCm: v.number(),
    terrain: v.string(),
    crops: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // TODO: verify wallet signature to ensure caller has ADMIN_ROLE
    return await ctx.db.insert("terras", {
      ...args,
      status: "available",
    })
  },
})
