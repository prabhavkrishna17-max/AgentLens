import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle, 
  Activity
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function HistoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const page = parseInt(searchParams.get('page') || '0', 10);
  const statusFilter = searchParams.get('status') || 'all';
  
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchInput);
  
  const limit = 15;

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      if (searchInput !== searchParams.get('search')) {
        updateParams({ search: searchInput, page: '0' });
      }
    }, 400);
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

  const { data: runsData, isLoading } = useQuery({
    queryKey: ['runs', activeProjectId, page, statusFilter, debouncedSearch],
    queryFn: async () => {
      let url = `/api/runs?project_id=${activeProjectId}&limit=${limit}&skip=${page * limit}&sort_by=latest`;
      if (statusFilter !== 'all') {
        url += `&status=${statusFilter}`;
      }
      if (debouncedSearch) {
        url += `&search=${encodeURIComponent(debouncedSearch)}`;
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

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'success' || s === 'completed') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3 h-3" />
          <span>SUCCESS</span>
        </span>
      );
    }
    if (s === 'failed') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-mono font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <AlertCircle className="w-3 h-3" />
          <span>FAILED</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-mono font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20">
        <Activity className="w-3 h-3 animate-pulse" />
        <span>RUNNING</span>
      </span>
    );
  };

  const formatTimestamp = (isoString?: string) => {
    if (!isoString) return '-';
    try {
      const date = new Date(isoString);
      return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return '-';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="border-b border-border/60 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Runs</h1>
        <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
          History of all recorded agent executions and traces.
        </p>
      </div>

      {/* Filter Row: Simple segmented filter & Search input */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        
        {/* Simple Status Filter Pills */}
        <div className="flex items-center bg-accent/25 p-1 rounded-md border border-border/80 text-xs font-mono">
          {(['all', 'success', 'failed'] as const).map((filterVal) => (
            <button
              key={filterVal}
              onClick={() => updateParams({ status: filterVal, page: '0' })}
              className={`px-3 py-1 rounded transition-colors ${
                statusFilter === filterVal
                  ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {filterVal.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search task, agent, error..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full bg-accent/20 border border-border/80 rounded-md pl-9 pr-3 py-1.5 text-xs font-mono text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/80 transition-colors"
          />
        </div>
      </div>

      {/* Runs Table */}
      <div className="border border-border/80 rounded-lg overflow-hidden bg-accent/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-accent/25 border-b border-border/80 text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Agent</th>
                <th className="px-4 py-3 font-medium">Task</th>
                <th className="px-4 py-3 font-medium">Duration</th>
                <th className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading && !runs.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground font-mono text-xs">
                    Loading runs...
                  </td>
                </tr>
              )}

              {!isLoading && runs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground font-mono text-xs">
                    No runs found matching your criteria.
                  </td>
                </tr>
              )}

              {runs.map((run: any) => (
                <tr 
                  key={run.id}
                  className="hover:bg-accent/20 transition-colors group cursor-pointer"
                >
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <Link to={`/app/trace/${run.id}`} className="block">
                      {getStatusBadge(run.status)}
                    </Link>
                  </td>

                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <Link to={`/app/trace/${run.id}`} className="block">
                      <span className="px-2 py-0.5 bg-accent/50 border border-border/60 rounded text-[11px] font-mono text-foreground font-medium">
                        {run.agent_name}
                      </span>
                    </Link>
                  </td>

                  <td className="px-4 py-3.5">
                    <Link to={`/app/trace/${run.id}`} className="block">
                      <div className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {run.task}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate max-w-sm">
                        {run.id}
                      </div>
                    </Link>
                  </td>

                  <td className="px-4 py-3.5 whitespace-nowrap font-mono text-muted-foreground">
                    <Link to={`/app/trace/${run.id}`} className="block">
                      {run.duration !== undefined && run.duration !== null ? `${run.duration.toFixed(2)}s` : '-'}
                    </Link>
                  </td>

                  <td className="px-4 py-3.5 whitespace-nowrap font-mono text-muted-foreground">
                    <Link to={`/app/trace/${run.id}`} className="block">
                      {formatTimestamp(run.started_at)}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {total > limit && (
          <div className="h-12 border-t border-border/80 bg-accent/20 flex items-center justify-between px-4 shrink-0 text-xs">
            <div className="text-muted-foreground font-mono text-[11px]">
              Showing {page * limit + 1} - {Math.min((page + 1) * limit, total)} of {total}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => updateParams({ page: Math.max(0, page - 1).toString() })}
                disabled={page === 0}
                className="p-1 rounded border border-border/70 text-muted-foreground hover:text-foreground hover:bg-accent/40 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => updateParams({ page: Math.min(totalPages - 1, page + 1).toString() })}
                disabled={page >= totalPages - 1}
                className="p-1 rounded border border-border/70 text-muted-foreground hover:text-foreground hover:bg-accent/40 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
