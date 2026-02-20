interface LegendItem {
  color: string
  label: string
}

const items: LegendItem[] = [
  { color: "#48995c", label: "Available" },
  { color: "#ffb13b", label: "Sponsored" },
  { color: "#885138", label: "Reserved" },
]

export function MapLegend() {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-background/90 backdrop-blur px-3 py-2 shadow-md border text-xs">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span
            className="inline-block size-3 rounded-sm"
            style={{ backgroundColor: item.color }}
          />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  )
}
