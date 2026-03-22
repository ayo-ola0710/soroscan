import * as React from "react"
import { CheckCircle2, AlertTriangle, Activity } from "lucide-react"

interface WebhookStatsProps {
  successRate: number
  avgTime: number
  loading?: boolean
}

export function WebhookStats({ successRate, avgTime, loading = false }: WebhookStatsProps) {
  return (
    <div className="border border-terminal-green/30 p-6 flex flex-col h-full bg-terminal-black">
      <h3 className="text-xs font-bold text-terminal-green tracking-widest uppercase mb-6">[WEBHOOK_HEALTH]</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">
        {/* Success Rate Gauge */}
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="relative w-32 h-32 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                className="text-terminal-green/10"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={351.8}
                strokeDashoffset={351.8 - (351.8 * successRate) / 100}
                className={`${successRate > 90 ? "text-terminal-green" : successRate > 70 ? "text-terminal-warning" : "text-terminal-danger"} transition-all duration-1000`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold font-terminal-mono">
                {loading ? "--" : Math.round(successRate)}%
              </span>
              <span className="text-[8px] text-terminal-gray uppercase">Success</span>
            </div>
          </div>
          <div className="text-[10px] text-terminal-gray tracking-widest uppercase">DELIVERY_RATE</div>
        </div>

        {/* Latency / Stats */}
        <div className="flex flex-col justify-center space-y-6">
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px] text-terminal-gray">
              <span>AVG_LATENCY</span>
              <Activity size={12} className="text-terminal-cyan" />
            </div>
            <div className="text-xl font-bold font-terminal-mono text-terminal-cyan">
              {loading ? "--- ms" : `${avgTime} ms`}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[10px]">
              <CheckCircle2 size={12} className="text-terminal-green" />
              <span className="text-terminal-gray uppercase">System Status: </span>
              <span className="text-terminal-green font-bold">[OPERATIONAL]</span>
            </div>
            <div className="flex items-center gap-2 text-[10px]">
              <AlertTriangle size={12} className="text-terminal-warning" />
              <span className="text-terminal-gray uppercase">Retries Last 24h: </span>
              <span className="text-terminal-warning font-bold">12</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
