import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import TraceViewer from './TraceViewer';
import DiagnosisPanel from './DiagnosisPanel';
import { ArrowLeft, Sparkles, Activity } from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function TracePage() {
  const { runId } = useParams();
  const [isDiagnosisOpen, setIsDiagnosisOpen] = useState(false);

  const { data: run } = useQuery({
    queryKey: ['run', runId],
    queryFn: async () => {
      const res = await apiFetch(`/api/runs/${runId}`);
      if (!res.ok) throw new Error('Network error');
      return res.json();
    },
    enabled: !!runId,
    refetchInterval: (query) => (query.state.data?.status === 'running' ? 1000 : false)
  });

  if (!runId) return <div>Invalid Run ID</div>;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <header className="h-16 border-b border-border flex items-center px-6 shrink-0 justify-between">
        <div className="flex items-center gap-4">
          <Link to="/app" className="p-2 hover:bg-accent rounded-md transition-colors text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex flex-col">
            <h1 className="font-semibold leading-tight">Execution Trace</h1>
            <span className="text-xs font-mono text-muted-foreground">{runId}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {run?.status === 'failed' && (
            <button
              onClick={() => setIsDiagnosisOpen(true)}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium hover:bg-primary/90 transition-colors shadow-lg"
            >
              <Sparkles className="w-4 h-4" /> Diagnose Failure
            </button>
          )}
        </div>
      </header>
      
      <main className="flex-1 overflow-hidden relative bg-grid-pattern">
        <div className="absolute top-6 left-6 z-10 bg-background/80 backdrop-blur border border-border px-3 py-1.5 rounded-md font-mono text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2 shadow-sm pointer-events-none">
          <Activity className="w-4 h-4" /> Structural Analysis
        </div>
        <TraceViewer runId={runId} runStatus={run?.status} />
        <DiagnosisPanel runId={runId} projectId={run?.project_id} isOpen={isDiagnosisOpen} onClose={() => setIsDiagnosisOpen(false)} />
      </main>
    </div>
  );
}
