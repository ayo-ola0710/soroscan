import * as React from "react"
import { AlertCircle, Clock, Terminal } from "lucide-react"

interface ErrorItem {
  id: number | string
  timestamp: string
  level: "ERROR" | "WARNING" | "INFO"
  message: string
  context?: string
}

interface ErrorLogProps {
  errors: ErrorItem[]
  loading?: boolean
}

export function ErrorLog({ errors, loading = false }: ErrorLogProps) {
  return (
    <div className="border border-terminal-green/30 flex flex-col h-full bg-terminal-black font-terminal-mono">
      <div className="border-b border-terminal-green/30 p-3 flex justify-between items-center bg-terminal-green/5">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-terminal-green" />
          <h3 className="text-xs font-bold text-terminal-green tracking-widest uppercase">[SYSTEM_ERROR_LOG]</h3>
        </div>
        <div className="text-[10px] text-terminal-gray uppercase">LIVE_FEED</div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {loading ? (
          <div className="text-[10px] text-terminal-gray animate-pulse">
            TAILING_LOGS...
          </div>
        ) : errors.length === 0 ? (
          <div className="text-[10px] text-terminal-gray italic text-center py-8">
            NO_CONTENT_FOUND: system health is optimal.
          </div>
        ) : (
          errors.map((error) => (
            <div key={error.id} className={`border-l-2 p-3 bg-terminal-black hover:bg-terminal-green/5 transition-colors ${
              error.level === 'ERROR' ? 'border-terminal-danger' : 'border-terminal-warning'
            }`}>
              <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[8px] font-bold px-1 py-0.5 rounded ${
                    error.level === 'ERROR' ? 'bg-terminal-danger/20 text-terminal-danger' : 'bg-terminal-warning/20 text-terminal-warning'
                  }`}>
                    {error.level}
                  </span>
                  <span className="text-[10px] font-bold text-terminal-gray flex items-center gap-1">
                    <Clock size={10} />
                    {new Date(error.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <AlertCircle size={14} className={error.level === 'ERROR' ? 'text-terminal-danger' : 'text-terminal-warning'} />
              </div>
              <p className="text-[11px] text-terminal-green leading-relaxed mt-2">
                {error.message}
              </p>
              {error.context && (
                <div className="mt-2 text-[9px] text-terminal-gray border-t border-terminal-green/10 pt-1 font-mono break-all opacity-70">
                  CONTEXT: {error.context}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="border-t border-terminal-green/30 p-2 text-[8px] text-terminal-gray flex justify-between uppercase tracking-widest">
        <span>Cursor: 0.0.0</span>
        <span>encoding: utf-8</span>
      </div>
    </div>
  )
}
