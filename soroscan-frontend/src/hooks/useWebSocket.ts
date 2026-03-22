"use client"

import { useState, useEffect, useCallback, useRef } from "react"

export interface SorobanEvent {
  id: string
  ts: string
  contract: string
  type: string
  data: Record<string, unknown>
  status: "PROCESSED" | "INGESTING" | "ERROR"
}

export type ConnectionStatus = "CONNECTING" | "CONNECTED" | "DISCONNECTED" | "ERROR"

export function useWebSocket(contractId: string) {
  const [events, setEvents] = useState<SorobanEvent[]>([])
  const [status, setStatus] = useState<ConnectionStatus>("DISCONNECTED")
  const ws = useRef<WebSocket | null>(null)
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null)

  const connectRef = useRef<(() => void) | null>(null)

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return

    // Wrap in microtask to avoid synchronous setState warning during effect
    Promise.resolve().then(() => {
      setStatus("CONNECTING")
    })
    
    // Using environment variable or default localhost
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000"
    const socket = new WebSocket(`${wsUrl}/ws/events/${contractId}/`)

    socket.onopen = () => {
      setStatus("CONNECTED")
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current)
        reconnectTimeout.current = null
      }
    }

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as SorobanEvent
        setEvents((prev) => [data, ...prev].slice(0, 100))
      } catch (err) {
        console.error("Failed to parse WebSocket message:", err)
      }
    }

    socket.onclose = (event) => {
      setStatus("DISCONNECTED")
      // Attempt to reconnect after 5 seconds if not closed cleanly
      if (!event.wasClean) {
        reconnectTimeout.current = setTimeout(() => {
          connectRef.current?.()
        }, 5000)
      }
    }

    socket.onerror = (err) => {
      console.error("WebSocket error:", err)
      setStatus("ERROR")
    }

    ws.current = socket
  }, [contractId])

  useEffect(() => {
    connectRef.current = connect
  }, [connect])

  useEffect(() => {
    connect()
    return () => {
      if (ws.current) {
        ws.current.close()
      }
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current)
      }
    }
  }, [connect])

  const clearEvents = useCallback(() => {
    setEvents([])
  }, [])

  return { 
    events, 
    status, 
    isConnected: status === "CONNECTED",
    reconnect: connect,
    clearEvents
  }
}
