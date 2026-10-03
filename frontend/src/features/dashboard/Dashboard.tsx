import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { 
  Activity, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ArrowRight, 
  PlayCircle,
  TrendingUp
} from 'lucide-react';
import Onboarding from '../onboarding/Onboarding';
import { apiFetch } from '@/lib/api';

export default function Dashboard() {
  const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d'>('7d');
  
  const { data: projects, isLoading: loadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await apiFetch('/api/projects');
      if (!res.ok) throw new Error('Network error');
      return res.json();
    },
  });

  const hasProjects = projects && projects.length > 0;
  const activeProjectId = hasProjects ? projects[0].id : null;

  const { data: analytics, isLoading: loadingAnalytics } = useQuery({
    queryKey: ['analytics', activeProjectId, timeframe],
    queryFn: async () => {
      const res = await apiFetch(`/api/projects/${activeProjectId}/analytics?timeframe=${timeframe}`);
      if (!res.ok) throw new Error('Network error');
      return res.json();
    },
    enabled: !!activeProjectId,
    refetchInterval: 4000
  });

  const { data: runsData } = useQuery({
    queryKey: ['runs', activeProjectId],
    queryFn: async () => {
      const res = await apiFetch(`/api/runs?project_id=${activeProjectId}&limit=8`);
      if (!res.ok) throw new Error('Network error');
      return res.json();
    },
    enabled: !!activeProjectId,
    refetchInterval: 4000
  });

  const runs = runsData?.items || [];
  const hasData = analytics && analytics.total_runs > 0;

  if (loadingProjects) {
    return (
      <div className="py-24 text-center font-mono text-xs text-muted-foreground animate-pulse">
        Loading dashboard...
      </div>
    );
  }

  const skippedOnboarding = localStorage.getItem('agentlens_skip_onboarding') === 'true';

  if (!hasProjects && !skippedOnboarding) {
    return <Onboarding />;
  }

  const failedRunsCount = analytics?.failed_runs !== undefined 
    ? analytics.failed_runs 
    : Math.round((analytics?.total_runs || 0) * ((analytics?.failure_rate || 0) / 100));

  const maxRuns = analytics?.runs_over_time?.length > 0 
    ? Math.max(...analytics.runs_over_time.map((r: any) => r.count)) 
    : 0;

  // Normalized status helper
  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'success' || s === 'completed') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3 h-3" />
          <span>SUCCESS</span>
        </span>
      );
    }
    if (s === 'failed') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <AlertCircle className="w-3 h-3" />
          <span>FAILED</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20">
        <Activity className="w-3 h-3 animate-pulse" />
        <span>RUNNING</span>
      </span>
    );
  };

  const formatRelativeTime = (isoString?: string) => {
    if (!isoString) return '-';
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
      if (diffSec < 60) return `${diffSec}s ago`;
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      return date.toLocaleDateString();
    } catch {
      return '-';
    }
  };

  return (
    <div className="space-y-6 md:space-y-8">
      
      {/* Top Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>AgentLens</span>
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Agent observability at a glance.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Timeframe Selector */}
          <div className="flex items-center bg-accent/30 p-1 rounded-md border border-border/80 text-xs font-mono">
            {(['24h', '7d', '30d'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`px-3 py-1 rounded transition-colors ${
                  timeframe === t 
                    ? 'bg-primary text-primary-foreground font-semibold shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>

          <Link
            to="/app/agent"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            <PlayCircle className="w-3.5 h-3.5" />
            <span>Run Agent</span>
          </Link>
        </div>
      </div>

      {!hasData && !loadingAnalytics ? (
        /* Empty State */
        <div className="py-16 px-6 border border-border/80 bg-accent/10 rounded-xl text-center flex flex-col items-center justify-center max-w-xl mx-auto">
          <div className="w-12 h-12 rounded-full bg-accent/40 border border-border/80 flex items-center justify-center mb-4 text-muted-foreground">
            <Activity className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-1">No execution traces yet</h2>
          <p className="text-xs md:text-sm text-muted-foreground max-w-sm mb-6">
            Execute a test run with the demo agent or connect your own agent using the AgentLens Python SDK.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/app/agent"
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              <PlayCircle className="w-4 h-4" />
              <span>Launch Demo Agent</span>
            </Link>
            <Link
              to="/app/integrate"
              className="px-4 py-2 bg-accent/40 hover:bg-accent/70 border border-border/80 text-foreground rounded-md text-xs font-medium transition-colors"
            >
              Connect Your Agent
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Compact Metrics Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            
            {/* Total Runs */}
            <div className="p-4 border border-border/80 bg-accent/15 rounded-lg">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-[11px] font-mono uppercase tracking-wider font-medium">Total Runs</span>
                <Activity className="w-4 h-4 opacity-60" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
                {analytics?.total_runs ?? 0}
              </div>
            </div>

            {/* Success Rate */}
            <div className="p-4 border border-border/80 bg-accent/15 rounded-lg">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-[11px] font-mono uppercase tracking-wider font-medium">Success Rate</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 opacity-80" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-emerald-400">
                {analytics?.success_rate ?? 0}%
              </div>
            </div>

            {/* Failed Runs */}
            <div className="p-4 border border-border/80 bg-accent/15 rounded-lg">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-[11px] font-mono uppercase tracking-wider font-medium">Failed Runs</span>
                <AlertCircle className="w-4 h-4 text-rose-400 opacity-80" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-rose-400">
                {failedRunsCount}
              </div>
            </div>

            {/* Avg Latency */}
            <div className="p-4 border border-border/80 bg-accent/15 rounded-lg">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-[11px] font-mono uppercase tracking-wider font-medium">Avg. Latency</span>
                <Clock className="w-4 h-4 opacity-60" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
                {analytics?.avg_duration_seconds !== undefined ? `${analytics.avg_duration_seconds}s` : '-'}
              </div>
            </div>
          </div>

          {/* Simple Runs Over Time Chart */}
          {analytics?.runs_over_time && analytics.runs_over_time.length > 0 && (
            <div className="p-4 sm:p-5 border border-border/80 bg-accent/10 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                    Runs Over Time ({timeframe.toUpperCase()})
                  </h2>
                </div>
                <span className="text-[11px] font-mono text-muted-foreground">
                  Peak: {maxRuns} {maxRuns === 1 ? 'run' : 'runs'}
                </span>
              </div>

              <div className="flex items-end gap-1.5 sm:gap-2 h-24 pt-4 border-b border-border/50">
                {analytics.runs_over_time.map((point: any, idx: number) => {
                  const heightPct = maxRuns > 0 ? (point.count / maxRuns) * 100 : 0;
                  return (
                    <div key={idx} className="flex-1 flex flex-col justify-end group relative h-full">
                      <div
                        className="w-full bg-primary/40 group-hover:bg-primary rounded-t-sm transition-colors cursor-pointer"
                        style={{ height: `${Math.max(heightPct, 6)}%` }}
                      />
                      <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/90 border border-border text-white text-[10px] font-mono py-1 px-2 rounded pointer-events-none whitespace-nowrap z-20 shadow-md">
                        {point.count} {point.count === 1 ? 'run' : 'runs'}
                        <div className="text-[9px] text-muted-foreground">{point.timestamp}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent Runs Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground">Recent Runs</h2>
                <p className="text-xs text-muted-foreground">Latest execution traces from your agents</p>
              </div>
              <Link
                to="/app/traces"
                className="text-xs font-mono text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
              >
                <span>View all</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Clean Table / List */}
            <div className="border border-border/80 rounded-lg overflow-hidden bg-accent/5">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-accent/25 border-b border-border/80 text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">Status</th>
                      <th className="px-4 py-2.5 font-medium">Task</th>
                      <th className="px-4 py-2.5 font-medium">Agent</th>
                      <th className="px-4 py-2.5 font-medium">Duration</th>
                      <th className="px-4 py-2.5 font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-sans">
                    {runs.map((run: any) => (
                      <tr 
                        key={run.id}
                        className="hover:bg-accent/20 transition-colors group cursor-pointer"
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Link to={`/app/trace/${run.id}`} className="block">
                            {getStatusBadge(run.status)}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <Link to={`/app/trace/${run.id}`} className="block">
                            <span className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
                              {run.task}
                            </span>
                            <span className="font-mono text-[10px] text-muted-foreground block truncate max-w-[200px] mt-0.5">
                              {run.id}
                            </span>
                          </Link>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Link to={`/app/trace/${run.id}`} className="block">
                            <span className="px-2 py-0.5 bg-accent/50 border border-border/60 rounded text-[11px] font-mono text-foreground/90">
                              {run.agent_name}
                            </span>
                          </Link>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-muted-foreground">
                          <Link to={`/app/trace/${run.id}`} className="block">
                            {run.duration !== undefined && run.duration !== null ? `${run.duration.toFixed(2)}s` : '-'}
                          </Link>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-muted-foreground">
                          <Link to={`/app/trace/${run.id}`} className="block">
                            {formatRelativeTime(run.started_at)}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
