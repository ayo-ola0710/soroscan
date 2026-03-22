import * as React from "react"

interface DataPoint {
  label: string
  value: number
}

interface EventChartProps {
  data: DataPoint[]
  loading?: boolean
  title: string
}

export function EventChart({ data, loading = false, title }: EventChartProps) {
  const maxVal = Math.max(...data.map(d => d.value), 1)

  return (
    <div className="border border-terminal-green/30 p-6 flex flex-col h-full bg-terminal-black">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xs font-bold text-terminal-green tracking-widest uppercase">[{title}]</h3>
        <div className="flex gap-2">
          <span className="w-2 h-2 bg-terminal-green opacity-50" />
          <span className="text-[10px] text-terminal-gray uppercase">Events/Hour</span>
        </div>
      </div>

      <div className="flex-1 flex items-end gap-1 min-h-[150px] relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-terminal-gray animate-pulse">
            LOADING_DATA...
          </div>
        ) : (
          <>
            {data.map((point, i) => {
              const height = (point.value / maxVal) * 100
              return (
                <div key={i} className="flex-1 flex flex-col items-center group">
                  <div 
                    className="w-full bg-terminal-green/40 border-t border-terminal-green group-hover:bg-terminal-green/60 transition-all relative"
                    style={{ height: `${height}%` }}
                  >
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-terminal-green font-bold opacity-0 group-hover:opacity-100 transition-opacity bg-terminal-black px-1 border border-terminal-green/50">
                      {point.value}
                    </div>
                  </div>
                  <div className="mt-2 text-[8px] text-terminal-gray rotate-45 origin-left whitespace-nowrap opacity-50">
                    {point.label}
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>

      {/* X-axis line */}
      <div className="h-px w-full bg-terminal-green/30 mt-8" />
    </div>
  )
}
