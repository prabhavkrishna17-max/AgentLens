import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Activity, AlertCircle, Clock, CheckCircle2, ChevronRight } from 'lucide-react';
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

  const { data: analytics } = useQuery({
    queryKey: ['analytics', activeProjectId, timeframe],
    queryFn: async () => {
      const res = await apiFetch(`/api/projects/${activeProjectId}/analytics?timeframe=${timeframe}`);
      if (!res.ok) throw new Error('Network error');
      return res.json();
    },
    enabled: !!activeProjectId,
    refetchInterval: 5000
  });

  const { data: runsData, isLoading } = useQuery({
    queryKey: ['runs', activeProjectId],
    queryFn: async () => {
      const res = await apiFetch(`/api/runs?project_id=${activeProjectId}&limit=5`);
      if (!res.ok) throw new Error('Network error');
      return res.json();
    },
    enabled: !!activeProjectId,
    refetchInterval: 5000
  });

  const runs = runsData?.items || [];
  const hasData = analytics && analytics.total_runs > 0;

  if (loadingProjects || (hasProjects && isLoading)) return <div className="p-8 text-primary font-mono animate-pulse flex h-screen items-center justify-center">Loading dashboard...</div>;

  if (!hasProjects && !loadingProjects) {
    return <Onboarding />;
  }
  
  const maxRuns = analytics?.runs_over_time?.length > 0 ? Math.max(...analytics.runs_over_time.map((r: any) => r.count)) : 0;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto w-full flex flex-col gap-6 md:gap-8 mb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold mb-2">Overview</h2>
          <p className="text-muted-foreground font-mono text-sm">Real-time observability overview</p>
        </div>
        
        {hasData && (
          <div className="flex bg-accent/20 p-1 rounded-md border border-border">
            <button onClick={() => setTimeframe('24h')} className={`px-4 py-1.5 text-xs font-mono rounded ${timeframe === '24h' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>24H</button>
            <button onClick={() => setTimeframe('7d')} className={`px-4 py-1.5 text-xs font-mono rounded ${timeframe === '7d' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>7D</button>
            <button onClick={() => setTimeframe('30d')} className={`px-4 py-1.5 text-xs font-mono rounded ${timeframe === '30d' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>30D</button>
          </div>
        )}
      </div>

      {!hasData ? (
        <div className="p-16 mt-8 border border-border bg-accent/10 rounded-2xl flex flex-col items-center justify-center text-center shadow-lg">
          <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mb-6">
            <Activity className="w-8 h-8 text-muted-foreground opacity-50" />
          </div>
          <h3 className="text-2xl font-semibold tracking-tight mb-3">Your agent hasn't sent an execution yet.</h3>
          <p className="text-muted-foreground mb-8 max-w-md text-lg">
            Connect your agent to start seeing execution traces, failures and performance data.
          </p>
          <div className="flex gap-4">
            <Link to="/app/integrate" className="bg-primary text-primary-foreground px-6 py-3 rounded-md font-medium hover:bg-primary/90 transition-colors shadow-sm">
              Connect Agent
            </Link>
            <a href="https://github.com/rmyndharis/agentlens" target="_blank" rel="noreferrer" className="bg-accent/50 border border-border text-foreground px-6 py-3 rounded-md font-medium hover:bg-accent transition-colors shadow-sm">
              View SDK
            </a>
          </div>
        </div>
      ) : (
        <>
          {/* Analytics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="p-4 md:p-6 border border-border bg-accent/20 rounded-xl">
              <div className="flex items-center gap-2 text-muted-foreground mb-4">
                <Activity className="w-4 h-4" />
                <span className="text-xs uppercase font-mono font-semibold">Total Executions</span>
              </div>
              <div className="text-3xl md:text-4xl font-bold tracking-tight">{analytics.total_runs}</div>
            </div>
            <div className="p-4 md:p-6 border border-border bg-accent/20 rounded-xl">
              <div className="flex items-center gap-2 text-muted-foreground mb-4">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-xs uppercase font-mono font-semibold">Success Rate</span>
              </div>
              <div className="text-3xl md:text-4xl font-bold tracking-tight text-green-500">{analytics.success_rate}%</div>
            </div>
            <div className="p-4 md:p-6 border border-border bg-accent/20 rounded-xl">
              <div className="flex items-center gap-2 text-muted-foreground mb-4">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <span className="text-xs uppercase font-mono font-semibold">Failure Rate</span>
              </div>
              <div className="text-3xl md:text-4xl font-bold tracking-tight text-destructive">{analytics.failure_rate}%</div>
            </div>
            <div className="p-4 md:p-6 border border-border bg-accent/20 rounded-xl">
              <div className="flex items-center gap-2 text-muted-foreground mb-4">
                <Clock className="w-4 h-4" />
                <span className="text-xs uppercase font-mono font-semibold">Avg Duration</span>
              </div>
              <div className="text-3xl md:text-4xl font-bold tracking-tight">{analytics.avg_duration_seconds}s</div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="col-span-1 lg:col-span-2 p-4 md:p-6 border border-border bg-accent/10 rounded-xl flex flex-col">
               <h3 className="text-sm font-mono uppercase tracking-widest text-muted-foreground mb-6">Runs Over Time</h3>
               
               {analytics.runs_over_time?.length > 0 ? (
                 <div className="flex-1 flex items-end gap-2 h-48 mt-auto pt-8">
                   {analytics.runs_over_time.map((point: any, i: number) => {
                     const height = maxRuns > 0 ? (point.count / maxRuns) * 100 : 0;
                     return (
                       <div key={i} className="flex-1 flex flex-col justify-end group relative h-full">
                         <div 
                           className="w-full bg-primary/40 hover:bg-primary transition-colors rounded-t-sm" 
                           style={{ height: `${Math.max(height, 2)}%` }}
                         />
                         <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-xs py-1 px-2 rounded pointer-events-none whitespace-nowrap z-10">
                            {point.count} runs<br/>
                            <span className="text-[10px] text-gray-400">{point.timestamp}</span>
                         </div>
                       </div>
                     );
                   })}
                 </div>
               ) : (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground font-mono text-sm">
                    Not enough executions to show a trend.
                  </div>
               )}
            </div>
            
            <div className="p-4 md:p-6 border border-border bg-accent/10 rounded-xl">
               <h3 className="text-sm font-mono uppercase tracking-widest text-muted-foreground mb-6">Failure Analytics</h3>
               {analytics.failure_categories?.length > 0 ? (
                 <div className="flex flex-col gap-4">
                   {analytics.failure_categories.map((cat: any, i: number) => (
                     <div key={i}>
                       <div className="flex justify-between text-sm mb-1">
                         <span className="font-medium truncate pr-4">{cat.category || 'Unknown'}</span>
                         <span className="font-mono text-muted-foreground">{cat.count}</span>
                       </div>
                       <div className="w-full h-1.5 bg-accent/50 rounded-full overflow-hidden">
                         <div className="h-full bg-destructive" style={{ width: `${(cat.count / Math.max(...analytics.failure_categories.map((c: any) => c.count))) * 100}%` }}></div>
                       </div>
                     </div>
                   ))}
                 </div>
               ) : (
                 <div className="flex flex-col items-center justify-center h-full text-center py-8">
                    <AlertCircle className="w-8 h-8 text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground font-mono text-sm mb-4">Diagnose failed runs to unlock failure patterns.</p>
                    <Link to="/app/traces?status=failed" className="text-xs bg-accent hover:bg-accent/80 text-foreground px-4 py-2 rounded font-medium transition-colors">
                      View failed runs
                    </Link>
                 </div>
               )}
            </div>
          </div>

          {/* Recent Runs */}
          <div>
            <div className="flex items-center justify-between mb-4 mt-8">
              <h3 className="text-xl font-bold flex items-center gap-2">
                 Recent Traces
              </h3>
              <Link to="/app/traces" className="text-sm font-mono text-muted-foreground hover:text-primary flex items-center">
                View all <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
            <div className="grid gap-3">
            {runs?.map((run: any) => (
              <Link to={`/app/trace/${run.id}`} key={run.id} className="block group">
                <div className="p-4 md:p-6 border border-border bg-accent/30 rounded-lg hover:border-primary transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                  <div>
                    <div className="font-semibold text-base md:text-lg group-hover:text-primary transition-colors truncate">{run.task}</div>
                    <div className="text-xs md:text-sm text-muted-foreground mt-1 flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-secondary/50 rounded-md font-mono text-[10px] md:text-xs truncate">{run.agent_name}</span>
                    </div>
                    <div className="text-[10px] md:text-xs font-mono text-muted-foreground mt-2 truncate">{run.id}</div>
                  </div>
                  <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-mono border ${
                      run.status === 'success' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
                      run.status === 'failed' ? 'bg-destructive/10 text-destructive border-destructive/20' : 
                      'bg-primary/10 text-primary border-primary/20'
                    }`}>
                      {(run.status || 'running').toUpperCase()}
                    </span>
                    {run.duration !== undefined && run.duration !== null && <span className="text-xs text-muted-foreground font-mono">{run.duration.toFixed(2)}s</span>}
                  </div>
                </div>
              </Link>
            ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
