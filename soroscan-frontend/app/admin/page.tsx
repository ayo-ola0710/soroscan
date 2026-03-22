"use client"

import * as React from "react"
import { 
  Database, 
  HardDrive, 
  Activity, 
  ShieldCheck, 
  Webhook, 
  AlertTriangle, 
  Server, 
  RefreshCw,
  Layers
} from "lucide-react"
import { Navbar } from "@/components/terminal/landing/Navbar"
import { Footer } from "@/components/terminal/landing/Footer"
import { Button } from "@/components/terminal/Button"
import { MetricsCard } from "./components/MetricsCard"
import { EventChart } from "./components/EventChart"
import { WebhookStats } from "./components/WebhookStats"
import { ErrorLog } from "./components/ErrorLog"
import { fetchSystemMetrics, SystemMetricsData } from "@/components/ingest/graphql"
import { useToast } from "@/context/ToastContext"

export default function AdminDashboard() {
  const [data, setData] = React.useState<SystemMetricsData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const loadData = React.useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    
    try {
      const result = await fetchSystemMetrics()
      setData(result)
      setError(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "UNAUTHORIZED_ACCESS: Admin role required."
      console.error("Failed to fetch admin metrics:", err)
      setError(message)
      if (message.includes("Admin access required")) {
        // Handle 401/403 state
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  React.useEffect(() => {
    loadData()
    // Poll every 30 seconds
    const interval = setInterval(() => loadData(true), 30000)
    return () => clearInterval(interval)
  }, [loadData])

  // Mock data for the chart (last 24h)
  const chartData = React.useMemo(() => {
    if (!data) return Array(24).fill(0).map((_, i) => ({ label: `${i}:00`, value: 0 }))
    
    // In a real app, this would come from the backend. 
    // Mocking a trend based on total events for visualization.
    return Array(24).fill(0).map((_, i) => ({
      label: `${(i + 1)}h ago`,
      value: Math.floor(Math.random() * 500) + 100
    })).reverse()
  }, [data])

  if (error) {
    return (
      <div className="min-h-screen font-terminal-mono bg-terminal-black text-terminal-green flex flex-col">
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6">
          <div className="border border-terminal-danger p-8 max-w-md bg-terminal-danger/5">
            <AlertTriangle size={48} className="text-terminal-danger mx-auto mb-4 animate-pulse" />
            <h2 className="text-xl font-bold text-terminal-danger mb-2">ACCESS_DENIED</h2>
            <p className="text-xs text-terminal-gray mb-6 uppercase tracking-widest">
              {error}
            </p>
            <Button variant="secondary" onClick={() => window.location.href = "/"}>
              RETURN_TO_BASE
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const metrics = data?.systemMetrics

  return (
    <div className="min-h-screen font-terminal-mono selection:bg-terminal-green selection:text-terminal-black bg-terminal-black">
      <Navbar />

      <main className="container mx-auto px-6 md:px-8 py-10 space-y-8 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-terminal-green/20 pb-6">
          <div>
            <div className="text-[10px] text-terminal-cyan tracking-widest mb-1 items-center flex gap-2">
              <ShieldCheck size={10} />
              [ADMIN_OVERSIGHT_V1.0]
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-terminal-green uppercase">
              System Dashboard
            </h1>
            <p className="text-terminal-gray text-[10px] mt-1 uppercase tracking-widest">
              Last Synced: {metrics?.lastSynced ? new Date(metrics.lastSynced).toLocaleString() : "NEVER"}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => loadData(true)}
              className={refreshing ? "animate-spin" : ""}
              disabled={refreshing}
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "REFRESHING..." : "FORCE_SYNC"}
            </Button>
          </div>
        </div>

        {/* Top Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricsCard 
            title="Events Today" 
            value={metrics?.eventsIndexedToday ?? 0} 
            icon={Activity} 
            loading={loading}
          />
          <MetricsCard 
            title="Total Events" 
            value={metrics?.eventsIndexedTotal ?? 0} 
            icon={HardDrive} 
            color="cyan"
            loading={loading}
          />
          <MetricsCard 
            title="Webhook Health" 
            value={`${Math.round(metrics?.webhookSuccessRate ?? 0)}%`} 
            subValue="Last 24h Success Rate"
            icon={Webhook} 
            color={metrics && metrics.webhookSuccessRate < 90 ? "warning" : "green"}
            loading={loading}
          />
          <MetricsCard 
            title="Active Contracts" 
            value={metrics?.activeContracts ?? 0} 
            icon={Layers} 
            color="gray"
            loading={loading}
          />
        </div>

        {/* Charts & Stats Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <EventChart 
              title="Ingestion Timeline" 
              data={chartData} 
              loading={loading} 
            />
          </div>
          <div>
            <WebhookStats 
              successRate={metrics?.webhookSuccessRate ?? 0} 
              avgTime={metrics?.avgWebhookDeliveryTime ?? 0}
              loading={loading}
            />
          </div>
        </div>

        {/* Logs & System Health */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 min-h-[400px]">
            <ErrorLog 
              errors={data?.recentErrors ?? []} 
              loading={loading} 
            />
          </div>
          <div className="space-y-6">
            {/* System Status Panel */}
            <div className="border border-terminal-green/30 p-6 space-y-6 bg-terminal-black/50">
              <h3 className="text-xs font-bold text-terminal-green tracking-widest uppercase mb-4">[SYSTEM_STATUS]</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-terminal-green/5 p-3 border border-terminal-green/10">
                  <div className="flex items-center gap-3">
                    <Database size={16} className="text-terminal-green" />
                    <span className="text-[10px] text-terminal-gray uppercase">Database</span>
                  </div>
                  <span className="text-[10px] text-terminal-green font-bold">[{metrics?.dbStatus ?? "ONLINE"}]</span>
                </div>

                <div className="flex justify-between items-center bg-terminal-green/5 p-3 border border-terminal-green/10">
                  <div className="flex items-center gap-3">
                    <Server size={16} className="text-terminal-green" />
                    <span className="text-[10px] text-terminal-gray uppercase">Redis Cache</span>
                  </div>
                  <span className="text-[10px] text-terminal-green font-bold">[{metrics?.redisStatus ?? "ONLINE"}]</span>
                </div>

                {/* Feature Flags Toggle Logic (Optional UI) */}
                <div className="pt-4 border-t border-terminal-green/20">
                  <h4 className="text-[9px] text-terminal-gray tracking-widest uppercase mb-3">Feature Flags</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-terminal-green/80">LIVE_INGESTION_V2</span>
                      <div className="w-8 h-4 bg-terminal-green/20 border border-terminal-green rounded-full relative cursor-pointer opacity-50">
                        <div className="absolute top-0.5 left-0.5 w-2.5 h-2.5 bg-terminal-green rounded-full shadow-glow-green" />
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-terminal-green/80">WEBHOOK_RETRY_BACKOFF</span>
                      <div className="w-8 h-4 bg-terminal-green/20 border border-terminal-green rounded-full relative cursor-pointer opacity-50">
                         <div className="absolute top-0.5 left-4.5 w-2.5 h-2.5 bg-terminal-green rounded-full shadow-glow-green" style={{ left: 'calc(100% - 14px)' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Ingestion Progress (Mock) */}
            <div className="border border-terminal-green/30 p-6 bg-terminal-green/5">
              <h3 className="text-xs font-bold text-terminal-green tracking-widest uppercase mb-4">[INDEXING_PROGRESS]</h3>
              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="flex justify-between text-[8px] text-terminal-gray uppercase mb-1">
                    <span>Ledger Sync</span>
                    <span>99.9%</span>
                  </div>
                  <div className="h-1 w-full bg-terminal-green/10 rounded-full overflow-hidden">
                    <div className="h-full bg-terminal-green shadow-glow-green w-[99.9%]" />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[8px] text-terminal-gray uppercase mb-1">
                    <span>Backfill Workers</span>
                    <span>Active (3/3)</span>
                  </div>
                  <div className="h-1 w-full bg-terminal-green/10 rounded-full overflow-hidden">
                    <div className="h-full bg-terminal-green shadow-glow-green w-[100%]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <div className="container mx-auto px-6 md:px-8 max-w-7xl pb-12">
        <Footer />
      </div>

      {/* Retro Deco */}
      <div className="fixed inset-0 pointer-events-none z-[-1] opacity-[0.03]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,65,0.15)_0,transparent_70%)]" />
      </div>
    </div>
  )
}
