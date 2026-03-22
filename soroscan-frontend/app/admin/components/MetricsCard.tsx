import * as React from "react"
import { LucideIcon } from "lucide-react"

interface MetricsCardProps {
  title: string
  value: string | number
  subValue?: string
  icon: LucideIcon
  color?: "green" | "cyan" | "danger" | "warning" | "gray"
  loading?: boolean
}

export function MetricsCard({
  title,
  value,
  subValue,
  icon: Icon,
  color = "green",
  loading = false,
}: MetricsCardProps) {
  const colorMap = {
    green: "text-terminal-green border-terminal-green/30",
    cyan: "text-terminal-cyan border-terminal-cyan/30",
    danger: "text-terminal-danger border-terminal-danger/30",
    warning: "text-terminal-warning border-terminal-warning/30",
    gray: "text-terminal-gray border-terminal-gray/30",
  }

  const bgMap = {
    green: "bg-terminal-green/5",
    cyan: "bg-terminal-cyan/5",
    danger: "bg-terminal-danger/5",
    warning: "bg-terminal-warning/5",
    gray: "bg-terminal-gray/5",
  }

  return (
    <div className={`border p-4 h-full flex flex-col justify-between transition-all hover:bg-terminal-green/5 ${colorMap[color]}`}>
      <div className="flex justify-between items-start mb-2">
        <div className="text-[10px] tracking-widest uppercase opacity-70">
          [{title}]
        </div>
        <Icon size={16} className={`${loading ? "animate-pulse" : ""}`} />
      </div>
      
      <div>
        <div className="text-2xl font-bold font-terminal-mono">
          {loading ? "---" : value}
        </div>
        {subValue && (
          <div className="text-[10px] text-terminal-gray mt-1 uppercase tracking-tighter">
            {subValue}
          </div>
        )}
      </div>
      
      {/* Visual deco line */}
      <div className={`h-0.5 w-full mt-4 ${bgMap[color]} relative`}>
        <div className={`absolute top-0 left-0 h-full w-1/3 ${color === 'green' ? 'bg-terminal-green' : color === 'cyan' ? 'bg-terminal-cyan' : 'bg-current'} opacity-50`} />
      </div>
    </div>
  )
}
