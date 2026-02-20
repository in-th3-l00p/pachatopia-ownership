import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  terras: defineTable({
    tokenId: v.number(),
    lat: v.number(),
    lng: v.number(),
    widthCm: v.number(),
    heightCm: v.number(),
    status: v.union(
      v.literal("available"),
      v.literal("owned"),
      v.literal("reserved"),
    ),
    terrain: v.string(),
    crops: v.array(v.string()),
    owner: v.optional(v.string()),
  })
    .index("by_status", ["status"])
    .index("by_tokenId", ["tokenId"]),
})
