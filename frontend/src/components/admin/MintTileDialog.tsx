import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

interface MintTileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MintTileDialog({ open, onOpenChange }: MintTileDialogProps) {
  const [lat, setLat] = useState("")
  const [lng, setLng] = useState("")
  const [widthCm, setWidthCm] = useState("")
  const [heightCm, setHeightCm] = useState("")
  const [isPending, setIsPending] = useState(false)

  function resetForm() {
    setLat("")
    setLng("")
    setWidthCm("")
    setHeightCm("")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!lat || !lng || !widthCm || !heightCm) {
      toast.error("All fields are required")
      return
    }

    setIsPending(true)

    // Mock mint — replace with actual wagmi writeContract call:
    //
    // import { writeContract } from "wagmi/actions"
    // import { wagmiConfig } from "@/lib/wagmi"
    //
    // await writeContract(wagmiConfig, {
    //   address: PACHA_TERRA_ADDRESS,
    //   abi: pachaTerraAbi,
    //   functionName: "mint",
    //   args: [
    //     Math.round(parseFloat(lat) * 1e6),  // int32 lat (microdegrees)
    //     Math.round(parseFloat(lng) * 1e6),  // int32 lng (microdegrees)
    //     parseInt(widthCm),                   // uint32 widthCm
    //     parseInt(heightCm),                  // uint32 heightCm
    //   ],
    // })

    await new Promise((resolve) => setTimeout(resolve, 1000))

    setIsPending(false)
    toast.success("Tile minted successfully (mock)")
    resetForm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Mint New Tile</DialogTitle>
          <DialogDescription>
            Enter the coordinates and dimensions for the new terra parcel.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="lat">Latitude</Label>
              <Input
                id="lat"
                type="number"
                step="any"
                placeholder="6.702"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lng">Longitude</Label>
              <Input
                id="lng"
                type="number"
                step="any"
                placeholder="-75.505"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="widthCm">Width (cm)</Label>
              <Input
                id="widthCm"
                type="number"
                min="1"
                placeholder="3000"
                value={widthCm}
                onChange={(e) => setWidthCm(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="heightCm">Height (cm)</Label>
              <Input
                id="heightCm"
                type="number"
                min="1"
                placeholder="3000"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Minting..." : "Mint"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
