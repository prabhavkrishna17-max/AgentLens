import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function HistoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const page = parseInt(searchParams.get('page') || '0', 10);
  const status = searchParams.get('status') || 'all';
  const environment = searchParams.get('environment') || 'all';
  const agent = searchParams.get('agent') || 'all';
  const dateRange = searchParams.get('dateRange') || 'all';
  const sortBy = searchParams.get('sortBy') || 'latest';
  
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchInput);
  
  const limit = 15;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      if (searchInput !== searchParams.get('search')) {
        updateParams({ search: searchInput, page: '0' });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const updateParams = (newParams: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([key, value]) => {
      if (value && value !== 'all' && value !== '') {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    setSearchParams(params);
  };

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await apiFetch('/api/projects');
      if (!res.ok) throw new Error('Network error');
      return res.json();
    },
  });
  const activeProjectId = projects?.[0]?.id;

  const { data: runsData, isLoading, isFetching } = useQuery({
    queryKey: ['runs', activeProjectId, page, status, environment, agent, dateRange, sortBy, debouncedSearch],
    queryFn: async () => {
      let url = `/api/runs?project_id=${activeProjectId}&limit=${limit}&skip=${page * limit}&sort_by=${sortBy}`;
      if (status !== 'all') url += `&status=${status}`;
      if (environment !== 'all') url += `&environment=${environment}`;
      if (agent !== 'all') url += `&agent=${agent}`;
      if (debouncedSearch) url += `&search=${encodeURIComponent(debouncedSearch)}`;
      
      if (dateRange !== 'all') {
        const now = new Date();
        if (dateRange === 'today') {
            now.setHours(0,0,0,0);
            url += `&start_date=${now.toISOString()}`;
        } else if (dateRange === '7d') {
            now.setDate(now.getDate() - 7);
            url += `&start_date=${now.toISOString()}`;
        } else if (dateRange === '30d') {
            now.setDate(now.getDate() - 30);
            url += `&start_date=${now.toISOString()}`;
        }
      }
      
      const res = await apiFetch(url);
      if (!res.ok) throw new Error('Network error');
      return res.json();
    },
    enabled: !!activeProjectId,
  });

  const runs = (runsData as any)?.items || [];
  const total = (runsData as any)?.total || 0;
  const totalPages = Math.ceil(total / limit);

  // Extract unique agents from current data for the dropdown (ideally this comes from an aggregation API, but this is fine for now)
  const availableAgents = Array.from(new Set(runs.map((r: any) => r.agent_name)));
  if (agent !== 'all' && !availableAgents.includes(agent)) {
      availableAgents.push(agent);
  }

  return (
    <div className="p-8 max-w-7xl mx-auto w-full flex flex-col h-full overflow-hidden">
      <div className="mb-6 flex items-end justify-between shrink-0">
        <div>
          <h2 className="text-3xl font-bold mb-2">History</h2>
          <p className="text-muted-foreground font-mono text-sm">View and search past agent executions.</p>
        </div>
        
        <div className="flex gap-4 items-center">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              placeholder={isFetching ? "Searching..." : "Search task, agent, error..."}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="bg-accent/30 border border-border rounded-md pl-9 pr-4 py-2 text-sm outline-none focus:border-primary transition-colors w-64 font-mono"
            />
          </div>
          <div className="flex gap-2">
              <select 
                value={status}
                onChange={(e) => updateParams({ status: e.target.value, page: '0' })}
                className="bg-accent/30 border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary transition-colors font-mono"
              >
                <option value="all">Status: All</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
                <option value="running">Running</option>
              </select>
              
              <select 
                value={environment}
                onChange={(e) => updateParams({ environment: e.target.value, page: '0' })}
                className="bg-accent/30 border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary transition-colors font-mono"
              >
                <option value="all">Env: All</option>
                <option value="development">Development</option>
                <option value="staging">Staging</option>
                <option value="production">Production</option>
              </select>
              
              <select 
                value={agent}
                onChange={(e) => updateParams({ agent: e.target.value, page: '0' })}
                className="bg-accent/30 border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary transition-colors font-mono max-w-[150px] truncate"
              >
                <option value="all">Agent: All</option>
                {availableAgents.map((a: any) => (
                    <option key={a} value={a}>{a}</option>
                ))}
              </select>

              <select 
                value={dateRange}
                onChange={(e) => updateParams({ dateRange: e.target.value, page: '0' })}
                className="bg-accent/30 border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary transition-colors font-mono"
              >
                <option value="all">Date: All time</option>
                <option value="today">Today</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
              </select>

              <select 
                value={sortBy}
                onChange={(e) => updateParams({ sortBy: e.target.value, page: '0' })}
                className="bg-accent/30 border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary transition-colors font-mono"
              >
                <option value="latest">Sort: Latest</option>
                <option value="oldest">Sort: Oldest</option>
                <option value="duration">Sort: Duration</option>
                <option value="status">Sort: Status</option>
              </select>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-accent/20 border border-border rounded-lg overflow-hidden flex flex-col">
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-left border-collapse relative">
            <thead className="bg-accent/50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-xs uppercase font-mono text-muted-foreground tracking-wider font-semibold border-b border-border">Status</th>
                <th className="px-6 py-3 text-xs uppercase font-mono text-muted-foreground tracking-wider font-semibold border-b border-border">Task</th>
                <th className="px-6 py-3 text-xs uppercase font-mono text-muted-foreground tracking-wider font-semibold border-b border-border">Agent</th>
                <th className="px-6 py-3 text-xs uppercase font-mono text-muted-foreground tracking-wider font-semibold border-b border-border">Env</th>
                <th className="px-6 py-3 text-xs uppercase font-mono text-muted-foreground tracking-wider font-semibold border-b border-border">Duration</th>
                <th className="px-6 py-3 text-xs uppercase font-mono text-muted-foreground tracking-wider font-semibold border-b border-border">Started</th>
                <th className="px-6 py-3 text-xs uppercase font-mono text-muted-foreground tracking-wider font-semibold border-b border-border text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && !runs.length && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground font-mono">Loading history...</td>
                </tr>
              )}
              {!isLoading && runs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground font-mono">No executions found matching your criteria.</td>
                </tr>
              )}
              {runs.map((run: any) => (
                <tr key={run.id} className="hover:bg-accent/30 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-md text-xs font-mono border ${
                      run.status === 'success' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
                      run.status === 'failed' ? 'bg-destructive/10 text-destructive border-destructive/20' : 
                      'bg-primary/10 text-primary border-primary/20'
                    }`}>
                      {(run.status || 'running').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Link to={`/app/trace/${run.id}`} className="block">
                      <div className="font-semibold text-sm group-hover:text-primary transition-colors">{run.task}</div>
                      <div className="text-xs text-muted-foreground font-mono mt-1 truncate max-w-xs">{run.id}</div>
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-xs px-2 py-1 bg-secondary/50 rounded-md font-mono">{run.agent_name}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-xs px-2 py-1 bg-secondary/20 border border-border rounded-md font-mono capitalize text-muted-foreground">{run.environment}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-muted-foreground">
                    {run.duration !== undefined && run.duration !== null ? `${run.duration.toFixed(2)}s` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-muted-foreground">
                    {run.started_at ? new Date(run.started_at).toLocaleString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Link to={`/app/compare?run1=${run.id}`} className="text-xs font-mono bg-accent/50 hover:bg-accent text-foreground px-3 py-1.5 rounded-md transition-colors mr-2">
                        Compare
                      </Link>
                      <Link to={`/app/trace/${run.id}`} className="text-xs font-mono bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1.5 rounded-md transition-colors">
                        View
                      </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="h-14 border-t border-border bg-accent/30 flex items-center justify-between px-6 shrink-0">
          <div className="text-sm text-muted-foreground font-mono">
            Showing {Math.min(page * limit + 1, total)} to {Math.min((page + 1) * limit, total)} of {total} entries
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => updateParams({ page: Math.max(0, page - 1).toString() })}
              disabled={page === 0}
              className="p-2 border border-border rounded-md hover:bg-accent disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={() => updateParams({ page: Math.min(totalPages - 1, page + 1).toString() })}
              disabled={page >= totalPages - 1}
              className="p-2 border border-border rounded-md hover:bg-accent disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
