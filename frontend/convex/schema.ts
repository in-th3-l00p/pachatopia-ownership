import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  terras: defineTable({
    tokenId: v.number(),
    terrain: v.string(),
    crops: v.array(v.string()),
  }).index("by_tokenId", ["tokenId"]),
})
