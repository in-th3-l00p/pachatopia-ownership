import { useState } from "react"
import { useWriteContract } from "wagmi"
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
import { PACHA_TERRA_ABI, PACHA_TERRA_ADDRESS } from "@/lib/contract"

interface MintTileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function MintTileDialog({
  open,
  onOpenChange,
  onSuccess,
}: MintTileDialogProps) {
  const [lat, setLat] = useState("")
  const [lng, setLng] = useState("")
  const [widthCm, setWidthCm] = useState("")
  const [heightCm, setHeightCm] = useState("")

  const { writeContractAsync, isPending } = useWriteContract()

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

    try {
      await writeContractAsync({
        address: PACHA_TERRA_ADDRESS,
        abi: PACHA_TERRA_ABI,
        functionName: "mint",
        args: [
          Math.round(parseFloat(lat) * 1e6),
          Math.round(parseFloat(lng) * 1e6),
          parseInt(widthCm),
          parseInt(heightCm),
        ],
      })

      toast.success("Tile minted successfully!")
      resetForm()
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      toast.error(
        `Failed to mint tile: ${err instanceof Error ? err.message : "Unknown error"}`,
      )
    }
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
