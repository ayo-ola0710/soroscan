"use client"

import * as React from "react"
import { useWebSocket, SorobanEvent, ConnectionStatus } from "@/src/hooks/useWebSocket"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "./Table"
import { Button } from "./Button"
import { Input } from "./Input"
import { Copy, Pause, Play, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface LiveEventStreamProps {
  contractId: string
}

export function LiveEventStream({ contractId }: LiveEventStreamProps) {
  const { events, status, reconnect } = useWebSocket(contractId)
  const [isPaused, setIsPaused] = React.useState(false)
  const [newEventsCount, setNewEventsCount] = React.useState(0)
  const lastEventId = React.useRef<string | null>(null)
  const [filter, setFilter] = React.useState("")
  const [displayEvents, setDisplayEvents] = React.useState<SorobanEvent[]>([])
  const [lastCopiedId, setLastCopiedId] = React.useState<string | null>(null)

  // Update display events when live events change, unless paused
  React.useEffect(() => {
    if (!isPaused) {
      setDisplayEvents(events)
      setNewEventsCount(0)
      if (events.length > 0) {
        lastEventId.current = events[0].id
      }
    } else {
      // Calculate new events since pause
      if (events.length > 0 && lastEventId.current) {
        const index = events.findIndex(e => e.id === lastEventId.current)
        if (index !== -1) {
          setNewEventsCount(index)
        } else {
          // If we can't find the last event, it means we've received more than 100 new events
          setNewEventsCount(100)
        }
      }
    }
  }, [events, isPaused])

  const filteredEvents = React.useMemo(() => {
    if (!filter) return displayEvents
    return displayEvents.filter(ev => 
      ev.type.toLowerCase().includes(filter.toLowerCase()) ||
      ev.contract.toLowerCase().includes(filter.toLowerCase())
    )
  }, [displayEvents, filter])

  const handleCopy = (event: SorobanEvent) => {
    navigator.clipboard.writeText(JSON.stringify(event.data, null, 2))
    setLastCopiedId(event.id)
    setTimeout(() => setLastCopiedId(null), 2000)
  }

  const statusColor: Record<ConnectionStatus, string> = {
    CONNECTED: "text-terminal-green",
    CONNECTING: "text-terminal-warning",
    DISCONNECTED: "text-terminal-gray",
    ERROR: "text-terminal-danger",
  }

  return (
    <div className="space-y-4 font-terminal-mono border-terminal border-terminal-green p-1 bg-terminal-black/50 overflow-hidden relative">
      {/* Header / Status */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 border-b-terminal border-terminal-green/30 bg-terminal-green/5">
        <div className="flex items-center gap-3">
          <div className="text-terminal-cyan font-bold">LIVE_EVENT_STREAM</div>
          <div className="h-4 w-[1px] bg-terminal-green/30" />
          <div className={cn("flex items-center gap-2 text-xs", statusColor[status])}>
             <span className={cn("w-2 h-2 rounded-full", status === "CONNECTED" && "animate-pulse", 
               status === "CONNECTED" ? "bg-terminal-green" : 
               status === "CONNECTING" ? "bg-terminal-warning" : 
               status === "ERROR" ? "bg-terminal-danger" : "bg-terminal-gray"
             )} />
             {status}
          </div>
        </div>

        <div className="flex items-center gap-2">
           <Button 
             variant="secondary" 
             size="sm" 
             onClick={() => setIsPaused(!isPaused)}
             className="min-w-[100px]"
           >
             {isPaused ? <Play className="w-3 h-3 mr-2" /> : <Pause className="w-3 h-3 mr-2" />}
             {isPaused ? "RESUME" : "PAUSE"}
             {newEventsCount > 0 && isPaused && (
               <span className="absolute -top-1 -right-1 bg-terminal-danger text-terminal-black text-[8px] px-1 rounded-full animate-bounce font-bold">
                 {newEventsCount > 99 ? "99+" : newEventsCount}
               </span>
             )}
           </Button>
           {status !== "CONNECTED" && (
             <Button variant="primary" size="sm" onClick={reconnect}>
               RECONNECT
             </Button>
           )}
        </div>
      </div>

      {/* Filter / Info */}
      <div className="px-4 py-2 flex items-center justify-between gap-4 border-b-terminal border-terminal-green/10">
        <div className="flex-1 max-w-sm">
          <Input 
            placeholder="FILTER_BY_TYPE_OR_CONTRACT..." 
            className="h-8 text-xs"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <div className="text-[10px] text-terminal-gray">
          SHOWING {filteredEvents.length} OF {displayEvents.length} BUFF_EVENTS
          {isPaused && <span className="ml-2 text-terminal-warning animate-pulse">[PAUSED]</span>}
        </div>
      </div>

      {/* Stream Window */}
      <div className="max-h-[500px] overflow-y-auto scrollbar-terminal custom-scrollbar">
        <Table className="border-none">
          <TableHeader className="sticky top-0 z-20 bg-terminal-black">
            <TableRow className="bg-terminal-green/10 hover:bg-terminal-green/10">
              <TableHead className="w-[100px] text-[10px]">TIME</TableHead>
              <TableHead className="text-[10px]">TYPE</TableHead>
              <TableHead className="text-[10px]">CONTRACT</TableHead>
              <TableHead className="w-[80px] text-[10px] text-center">ACTION</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEvents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center text-terminal-gray/50 italic text-xs">
                  {status === "CONNECTING" ? "ESTABLISHING_CONNECTION..." : "NO_EVENTS_STREAMING"}
                </TableCell>
              </TableRow>
            ) : (
              filteredEvents.map((ev, i) => (
                <TableRow key={`${ev.id}-${i}`} className="group/row">
                  <TableCell className="text-[10px] whitespace-nowrap opacity-70">
                    {new Date(ev.ts).toLocaleTimeString([], { hour12: false })}
                  </TableCell>
                  <TableCell>
                    <span className="text-[10px] px-1.5 py-0.5 border border-terminal-green/30 bg-terminal-green/5">
                      {ev.type}
                    </span>
                  </TableCell>
                  <TableCell className="text-[10px] text-terminal-cyan">
                    {ev.contract.slice(0, 4)}...{ev.contract.slice(-4)}
                  </TableCell>
                  <TableCell className="flex justify-center">
                    <button 
                      onClick={() => handleCopy(ev)}
                      className="p-1 hover:text-terminal-green transition-colors"
                      title="Copy Data"
                    >
                      {lastCopiedId === ev.id ? (
                        <CheckCircle2 className="w-3 h-3 text-terminal-green" />
                      ) : (
                        <Copy className="w-3 h-3 opacity-30 group-hover/row:opacity-100" />
                      )}
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer Decoration */}
      <div className="p-2 border-t-terminal border-terminal-green/30 bg-terminal-green/5 text-[10px] flex justify-between text-terminal-gray/70">
        <div>SYS_BUF_OK: {events.length}/100</div>
        <div>SCAN_INTERVAL: REAL_TIME</div>
      </div>
    </div>
  )
}
