import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Loader2, 
  Search, 
  X, 
  Sparkles,
  MapPin,
  HelpCircle,
  Wrench
} from 'lucide-react';
import { useTraceStore } from '../../stores/traceStore';
import { apiFetch } from '@/lib/api';

export default function DiagnosisPanel({ 
  runId, 
  projectId, 
  isOpen, 
  onClose 
}: { 
  runId: string; 
  projectId?: string; 
  isOpen: boolean; 
  onClose: () => void; 
}) {
  const queryClient = useQueryClient();
  const { setSelectedNodeId } = useTraceStore();

  const { data: diagnosis } = useQuery({
    queryKey: ['diagnosis', runId],
    queryFn: async () => {
      if (!projectId) return null;
      const res = await apiFetch(`/api/v1/projects/${projectId}/runs/${runId}/diagnosis`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error('Network error');
      return res.json();
    },
    enabled: isOpen && !!projectId
  });

  const diagnoseMutation = useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error('Missing project ID');
      const res = await apiFetch(`/api/v1/projects/${projectId}/runs/${runId}/diagnose`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to generate diagnosis');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagnosis', runId] });
    },
  });

  useEffect(() => {
    if (isOpen && projectId && !diagnosis && !diagnoseMutation.isPending && !diagnoseMutation.isError && !diagnoseMutation.data) {
      diagnoseMutation.mutate();
    }
  }, [isOpen, projectId, diagnosis]);

  const handleInspectStep = (stepId?: string) => {
    if (stepId) {
      setSelectedNodeId(stepId);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="absolute inset-x-0 bottom-0 h-[75vh] md:h-[65vh] bg-background/98 border-t border-border shadow-2xl z-50 flex flex-col antialiased"
        >
          {/* Header */}
          <div className="h-13 px-4 sm:px-6 border-b border-border/80 flex items-center justify-between shrink-0 bg-accent/20">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="font-semibold text-xs sm:text-sm tracking-tight text-foreground font-mono uppercase">
                Failure Diagnosis
              </span>
              {diagnosis && (
                <span className="ml-2 text-[11px] font-mono text-muted-foreground bg-accent/50 px-2 py-0.5 rounded border border-border/60">
                  Confidence: {((diagnosis.confidence_score || 0.9) * 100).toFixed(0)}%
                </span>
              )}
            </div>

            <button 
              onClick={onClose} 
              className="p-1.5 hover:bg-accent/60 rounded-md text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close diagnosis panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Panel Content Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
            
            {/* Not Yet Generated */}
            {!diagnosis && !diagnoseMutation.isPending && (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto py-8">
                <AlertTriangle className="w-10 h-10 text-rose-400 mb-3 opacity-90" />
                <h3 className="text-lg font-bold text-foreground mb-2">Generate Failure Diagnosis</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mb-6 leading-relaxed">
                  Correlate step inputs, API errors, and runtime telemetry to identify what caused this agent failure and how to fix it.
                </p>

                {diagnoseMutation.isError && (
                  <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-md text-xs text-rose-300 font-mono text-left max-w-sm">
                    {diagnoseMutation.error?.message}
                  </div>
                )}

                <button 
                  onClick={() => diagnoseMutation.mutate()}
                  className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Run Failure Diagnosis</span>
                </button>
              </div>
            )}

            {/* Generating State */}
            {diagnoseMutation.isPending && (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto space-y-4 py-12">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-foreground">Analyzing Failure...</div>
                  <div className="text-xs font-mono text-muted-foreground">
                    Correlating execution trace and telemetry evidence
                  </div>
                </div>
              </div>
            )}

            {/* Diagnosis Result */}
            {diagnosis && !diagnoseMutation.isPending && (
              <div className="max-w-4xl mx-auto space-y-6">
                
                {/* Story Section 1: What & Where */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* What Happened */}
                  <div className="p-4 rounded-lg border border-border/80 bg-accent/15 space-y-1.5">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-medium">
                      <HelpCircle className="w-3.5 h-3.5 text-primary" />
                      <span>What Happened</span>
                    </div>
                    <div className="text-sm font-semibold text-foreground leading-snug">
                      {diagnosis.root_cause || 'Execution error during agent run.'}
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        {diagnosis.failure_category || 'System Fault'}
                      </span>
                      {diagnosis.severity && (
                        <span className="text-[10px] font-mono text-muted-foreground">
                          Severity: {diagnosis.severity}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Where Did It Happen */}
                  <div className="p-4 rounded-lg border border-border/80 bg-accent/15 space-y-1.5 flex flex-col justify-between">
                    <div>
                      <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-rose-400" />
                        <span>Where Did It Happen</span>
                      </div>
                      <div className="text-sm font-semibold text-foreground font-mono mt-1">
                        {diagnosis.step_name || (diagnosis.step_id ? `Step: ${diagnosis.step_id}` : 'Agent Execution Step')}
                      </div>
                    </div>

                    {diagnosis.step_id && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => handleInspectStep(diagnosis.step_id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-accent/40 hover:bg-accent/80 border border-border/70 text-xs font-mono text-foreground transition-colors"
                        >
                          <Search className="w-3.5 h-3.5 text-primary" />
                          <span>Inspect Failing Node in Graph</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Story Section 2: Why Did It Happen (Explanation) */}
                <div className="p-4 rounded-lg border border-border/80 bg-accent/10 space-y-2">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-medium">
                    Why Did It Happen
                  </div>
                  <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed font-sans">
                    {diagnosis.explanation || 'An unexpected runtime exception stopped agent progression.'}
                  </p>
                </div>

                {/* Story Section 3: Evidence & Suggested Fixes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Suggested Fixes */}
                  <div className="p-4 rounded-lg border border-border/80 bg-accent/10 space-y-2.5">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-medium">
                      <Wrench className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Suggested Fixes</span>
                    </div>
                    {diagnosis.suggested_fixes && diagnosis.suggested_fixes.length > 0 ? (
                      <ul className="space-y-2 text-xs">
                        {diagnosis.suggested_fixes.map((fix: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <span className="leading-snug text-foreground/90">{fix}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-xs text-muted-foreground italic">
                        Verify tool inputs and check API credentials.
                      </div>
                    )}
                  </div>

                  {/* Evidence Context */}
                  <div className="p-4 rounded-lg border border-border/80 bg-accent/10 space-y-2.5">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-medium">
                      Observed Evidence
                    </div>
                    {diagnosis.evidence && diagnosis.evidence.length > 0 ? (
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {diagnosis.evidence.map((ev: string, idx: number) => (
                          <div key={idx} className="p-2 rounded bg-background/80 border border-border/60 text-[11px] font-mono text-muted-foreground leading-snug">
                            {ev}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground italic">
                        No direct log traces were flagged.
                      </div>
                    )}
                  </div>

                </div>

              </div>
            )}

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
