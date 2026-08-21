import { useQuery } from '@tanstack/react-query';
import { BarChart, Activity, AlertCircle, Clock, CheckCircle2, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiFetch } from '@/lib/api';

export default function AnalyticsPage() {
  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await apiFetch('/api/projects');
      if (!res.ok) throw new Error('Network error');
      return res.json();
    },
  });
  
  const activeProjectId = projects?.[0]?.id;

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics', activeProjectId],
    queryFn: async () => {
      const res = await apiFetch(`/api/projects/${activeProjectId}/analytics`);
      if (!res.ok) throw new Error('Network error');
      return res.json();
    },
    enabled: !!activeProjectId,
    refetchInterval: 10000
  });

  const { data: runsData } = useQuery({
    queryKey: ['runs', activeProjectId, 0, 'all', ''],
    queryFn: async () => {
      const res = await apiFetch(`/api/runs?project_id=${activeProjectId}&limit=100`);
      if (!res.ok) throw new Error('Network error');
      return res.json();
    },
    enabled: !!activeProjectId,
  });

  const hasData = analytics && analytics.total_runs > 0;

  return (
    <div className="p-8 max-w-6xl mx-auto w-full">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Analytics</h2>
        <p className="text-muted-foreground font-mono text-sm">Execution trends and failure distributions.</p>
      </div>

      {!hasData && !isLoading ? (
        <div className="p-16 border border-border bg-accent/10 rounded-xl flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mb-6">
            <TrendingUp className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold mb-2">Insufficient Data</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            We need more telemetry to generate meaningful analytics. Run your agent a few times to start seeing execution trends, latency distributions, and failure categorizations.
          </p>
          <Link to="/app" className="bg-primary text-primary-foreground px-6 py-2 rounded-full font-medium hover:bg-primary/90 transition-colors">
            Go to Dashboard
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Top Line Metrics */}
          <div className="grid grid-cols-4 gap-4">
            <div className="p-6 border border-border bg-accent/20 rounded-xl">
              <div className="flex items-center gap-2 text-muted-foreground mb-4">
                <Activity className="w-4 h-4" />
                <span className="text-xs uppercase font-mono font-semibold">Execution Volume</span>
              </div>
              <div className="text-4xl font-bold tracking-tight">{analytics?.total_runs || 0}</div>
            </div>
            <div className="p-6 border border-border bg-accent/20 rounded-xl">
              <div className="flex items-center gap-2 text-muted-foreground mb-4">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-xs uppercase font-mono font-semibold">Success Rate</span>
              </div>
              <div className="text-4xl font-bold tracking-tight text-green-500">{analytics?.success_rate || 0}%</div>
            </div>
            <div className="p-6 border border-border bg-accent/20 rounded-xl">
              <div className="flex items-center gap-2 text-muted-foreground mb-4">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <span className="text-xs uppercase font-mono font-semibold">Failure Rate</span>
              </div>
              <div className="text-4xl font-bold tracking-tight text-destructive">{analytics?.failure_rate || 0}%</div>
            </div>
            <div className="p-6 border border-border bg-accent/20 rounded-xl">
              <div className="flex items-center gap-2 text-muted-foreground mb-4">
                <Clock className="w-4 h-4" />
                <span className="text-xs uppercase font-mono font-semibold">Avg Latency</span>
              </div>
              <div className="text-4xl font-bold tracking-tight">{analytics?.avg_duration_seconds || 0}s</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8">
            {/* Failure Categories */}
            <div className="p-6 border border-border bg-accent/10 rounded-xl">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-destructive" /> Failure Distribution
              </h3>
              {analytics?.failure_categories?.length > 0 ? (
                <div className="space-y-4">
                  {analytics.failure_categories.map((cat: any) => (
                    <div key={cat.category}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{cat.category}</span>
                        <span className="text-muted-foreground font-mono">{cat.count}</span>
                      </div>
                      <div className="h-2 bg-accent rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-destructive" 
                          style={{ width: `${(cat.count / analytics.total_runs) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground font-mono text-sm">No failures recorded yet. Excellent!</div>
              )}
            </div>

            {/* Most Active Agents */}
            <div className="p-6 border border-border bg-accent/10 rounded-xl">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <BarChart className="w-5 h-5" /> Agent Volume
              </h3>
              {runsData?.items ? (
                <div className="space-y-4">
                  {/* Derive agents from recent runs for the chart */}
                  {Object.entries(
                    runsData.items.reduce((acc: any, run: any) => {
                      acc[run.agent_name] = (acc[run.agent_name] || 0) + 1;
                      return acc;
                    }, {})
                  ).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5).map(([agent, count]: any) => (
                    <div key={agent}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-mono">{agent}</span>
                        <span className="text-muted-foreground font-mono">{count}</span>
                      </div>
                      <div className="h-2 bg-accent rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary" 
                          style={{ width: `${(count / Math.max(1, runsData.items.length)) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground font-mono text-sm">Loading agent data...</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
