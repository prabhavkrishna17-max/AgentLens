import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import TraceViewer from './TraceViewer';
import DiagnosisPanel from './DiagnosisPanel';
import { 
  ArrowLeft, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Terminal,
  Activity
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function TracePage() {
  const { runId } = useParams();
  const [searchParams] = useSearchParams();
  const shouldAutoOpenDiagnosis = searchParams.get('diagnose') === 'true';
  const [isDiagnosisOpen, setIsDiagnosisOpen] = useState(shouldAutoOpenDiagnosis);

  useEffect(() => {
    if (shouldAutoOpenDiagnosis) {
      setIsDiagnosisOpen(true);
    }
  }, [shouldAutoOpenDiagnosis]);

  const { data: run } = useQuery({
    queryKey: ['run', runId],
    queryFn: async () => {
      const res = await apiFetch(`/api/runs/${runId}`);
      if (!res.ok) throw new Error('Network error');
      return res.json();
    },
    enabled: !!runId,
    refetchInterval: (query) => {
      const s = ((query.state.data as any)?.status || '').toLowerCase();
      return s === 'running' ? 1000 : false;
    }
  });

  if (!runId) {
    return (
      <div className="p-8 text-center text-sm font-mono text-muted-foreground">
        Invalid Run ID
      </div>
    );
  }

  const runStatus = (run?.status || '').toLowerCase();
  const isFailed = runStatus === 'failed';
  const isSuccess = runStatus === 'success' || runStatus === 'completed';

  const getStatusBadge = () => {
    if (isSuccess) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>SUCCESS</span>
        </span>
      );
    }
    if (isFailed) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-mono font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>FAILED</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-mono font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20">
        <Activity className="w-3.5 h-3.5 animate-pulse" />
        <span>RUNNING</span>
      </span>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] -mx-4 -my-6 sm:-mx-6 sm:-my-8 bg-background overflow-hidden">
      
      {/* Run Detail Header */}
      <header className="px-4 sm:px-6 py-3 border-b border-border/80 bg-background/95 flex flex-col gap-2 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          {/* Left: Back Link & Run Identity */}
          <div className="flex items-center gap-3">
            <Link 
              to="/app/traces" 
              className="p-1.5 rounded-md hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
              title="Back to Runs"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="flex items-center gap-2.5">
              <span className="font-bold text-sm tracking-tight text-foreground font-mono">
                Run #{runId.slice(0, 8)}
              </span>
              {getStatusBadge()}
            </div>

            {run?.agent_name && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 bg-accent/40 border border-border/60 rounded text-xs font-mono text-muted-foreground">
                <Terminal className="w-3 h-3 text-primary" />
                <span>{run.agent_name}</span>
              </span>
            )}

            {run?.duration !== undefined && run.duration !== null && (
              <span className="hidden md:inline-flex items-center gap-1 text-xs font-mono text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>{run.duration.toFixed(2)}s</span>
              </span>
            )}
          </div>

          {/* Right: Actions (Diagnose button if failed) */}
          <div className="flex items-center gap-2">
            {isFailed && (
              <button
                type="button"
                onClick={() => setIsDiagnosisOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-md hover:bg-primary/90 transition-colors shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Diagnose Failure</span>
              </button>
            )}
            
            <Link
              to={`/app/compare?run1=${runId}`}
              className="px-2.5 py-1.5 rounded-md border border-border/70 text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors hidden lg:inline-block"
            >
              Compare
            </Link>
          </div>
        </div>

        {/* Task Summary Banner */}
        {run?.task && (
          <div className="flex items-center justify-between text-xs text-muted-foreground bg-accent/15 px-3 py-1.5 rounded border border-border/50">
            <div className="truncate max-w-2xl font-mono">
              <span className="text-foreground/70 font-semibold mr-1.5">Task:</span>
              <span className="text-foreground">{run.task}</span>
            </div>
            {isFailed && run.error?.message && (
              <button 
                onClick={() => setIsDiagnosisOpen(true)}
                className="text-rose-400 hover:text-rose-300 font-mono text-[11px] truncate max-w-sm ml-2 flex items-center gap-1"
              >
                <span>Error: {run.error.message}</span>
                <span className="underline ml-1">Diagnose</span>
              </button>
            )}
          </div>
        )}
      </header>
      
      {/* Execution Trace Viewer Canvas */}
      <main className="flex-1 overflow-hidden relative">
        <TraceViewer runId={runId} runStatus={run?.status} />
        <DiagnosisPanel 
          runId={runId} 
          projectId={run?.project_id} 
          isOpen={isDiagnosisOpen} 
          onClose={() => setIsDiagnosisOpen(false)} 
        />
      </main>
    </div>
  );
}
