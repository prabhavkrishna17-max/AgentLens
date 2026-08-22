import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, AlertTriangle, CheckCircle2, ChevronRight, Loader2, Search, X, TerminalSquare } from 'lucide-react';
import { useTraceStore } from '../../stores/traceStore';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/lib/api';

export default function DiagnosisPanel({ runId, projectId, isOpen, onClose }: { runId: string, projectId?: string, isOpen: boolean, onClose: () => void }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { setSelectedNodeId } = useTraceStore();
  const [analyzingState, setAnalyzingState] = useState(0); // 0: init, 1: reading, 2: correlating, 3: done

  const { data: diagnosis } = useQuery({
    queryKey: ['diagnosis', runId],
    queryFn: async () => {
      if (!projectId) return null;
      const res = await apiFetch(`/api/v1/projects/${projectId}/runs/${runId}/diagnosis`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error('Network error');
      return res.json();
    },
  });

  const diagnoseMutation = useMutation({
    mutationFn: async () => {
      setAnalyzingState(3);
      
      if (!projectId) throw new Error('Missing project ID');
      const res = await apiFetch(`/api/v1/projects/${projectId}/runs/${runId}/diagnose`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to diagnose');
      return res.json();
    },
    onSuccess: () => {
      setAnalyzingState(3);
      queryClient.invalidateQueries({ queryKey: ['diagnosis', runId] });
    },
    onError: () => {
      setAnalyzingState(0);
    }
  });

  const handleEvidenceClick = (stepId?: string) => {
    if (stepId) setSelectedNodeId(stepId);
  };
  
  const isPromptRelated = diagnosis?.root_cause?.toLowerCase().includes('prompt') || diagnosis?.explanation?.toLowerCase().includes('prompt');
  
  const extractPrompt = () => {
      // Find the first evidence that looks like a prompt or just return a default
      const promptEvidence = diagnosis?.evidence?.find((e: string) => e.includes('prompt:') || e.includes('Prompt:') || e.includes('input:'));
      if (promptEvidence) {
          return promptEvidence.split(/prompt:|input:/i)[1]?.trim() || "Example extracted prompt...";
      }
      return "Original prompt was not found in evidence. Please paste it here.";
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="absolute bottom-0 left-0 right-0 h-[60vh] bg-background border-t border-border shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-50 flex flex-col"
        >
          <div className="h-14 border-b border-border flex items-center justify-between px-6 shrink-0 bg-accent/30">
            <h2 className="font-semibold flex items-center gap-2 text-primary uppercase tracking-wider text-sm font-mono">
              <Activity className="w-5 h-5 text-primary" /> AI Diagnosis
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-accent rounded-md text-muted-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {!diagnosis && !diagnoseMutation.isPending && (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
                <AlertTriangle className="w-12 h-12 text-destructive mb-4 opacity-80" />
                <h3 className="text-xl font-bold mb-2">AI Root Cause Analysis</h3>
                <p className="text-muted-foreground text-sm mb-6">
                  AgentLens can analyze the execution trace, correlate errors across steps, and attempt to identify potential root causes using AI Inference (Gemini). <br/><br/>
                  <span className="text-xs opacity-70 italic">Note: AI analysis provides hypotheses based on available evidence, not absolute certainty.</span>
                </p>
                <button 
                  onClick={() => diagnoseMutation.mutate()}
                  className="bg-primary text-primary-foreground px-6 py-2 rounded-full font-medium hover:bg-primary/90 transition-colors shadow-lg flex items-center gap-2"
                >
                  <Activity className="w-4 h-4" /> Generate AI Diagnosis
                </button>
              </div>
            )}

            {diagnoseMutation.isPending && (
              <div className="h-full flex flex-col items-center justify-center max-w-sm mx-auto space-y-8">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-accent rounded-full border-t-primary animate-spin" />
                  <Activity className="w-6 h-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                </div>
                
                <div className="w-full space-y-4">
                  <div className={`flex items-center gap-3 transition-opacity duration-500 ${analyzingState >= 1 ? 'opacity-100' : 'opacity-30'}`}>
                    {analyzingState > 1 ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Loader2 className="w-5 h-5 animate-spin text-primary" />}
                    <span className="font-mono text-sm">Performing structural analysis...</span>
                  </div>
                  <div className={`flex items-center gap-3 transition-opacity duration-500 ${analyzingState >= 2 ? 'opacity-100' : 'opacity-30'}`}>
                    {analyzingState > 2 ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : analyzingState === 2 ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <div className="w-5 h-5 border border-border rounded-full" />}
                    <span className="font-mono text-sm">Correlating evidence & errors...</span>
                  </div>
                  <div className={`flex items-center gap-3 transition-opacity duration-500 ${analyzingState >= 3 ? 'opacity-100' : 'opacity-30'}`}>
                    {analyzingState > 3 ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : analyzingState === 3 ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <div className="w-5 h-5 border border-border rounded-full" />}
                    <span className="font-mono text-sm">Running AI Inference (Gemini)...</span>
                  </div>
                </div>
              </div>
            )}

            {diagnosis && !diagnoseMutation.isPending && (
              <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                
                {/* Header */}
                <div className="flex items-start justify-between border-b border-border pb-6">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2">
                      <span className="bg-destructive/10 text-destructive border border-destructive/20 px-3 py-1 rounded-full text-xs font-mono font-semibold uppercase">
                        {diagnosis.failure_category}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-mono font-semibold uppercase ${
                        diagnosis.severity === 'Critical' ? 'bg-red-500/10 text-red-500' :
                        diagnosis.severity === 'High' ? 'bg-orange-500/10 text-orange-500' : 'bg-yellow-500/10 text-yellow-500'
                      }`}>
                        {diagnosis.severity} SEVERITY
                      </span>
                      <span className="text-muted-foreground text-sm font-mono flex items-center gap-1 bg-accent px-2 py-1 rounded-md">
                        AI Inference Confidence: {(diagnosis.confidence_score * 100).toFixed(0)}%
                      </span>
                    </div>
                    <h3 className="text-3xl font-bold mt-4">{diagnosis.root_cause}</h3>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                  {/* Left Column: Explanation & Fixes */}
                  <div className="lg:col-span-2 space-y-8">
                    <div>
                      <h4 className="text-sm uppercase font-mono text-muted-foreground mb-3 font-semibold tracking-wider">Analysis</h4>
                      <p className="text-base leading-relaxed text-foreground/90">{diagnosis.explanation}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-sm uppercase font-mono text-muted-foreground mb-3 font-semibold tracking-wider">Suggested Fixes</h4>
                        <ul className="space-y-3">
                          {diagnosis.suggested_fixes?.map((fix: string, idx: number) => (
                            <li key={idx} className="flex gap-3 text-sm">
                              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                              <span className="leading-snug">{fix}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-sm uppercase font-mono text-muted-foreground mb-3 font-semibold tracking-wider">Prevention</h4>
                        <ul className="space-y-3">
                          {diagnosis.prevention_tips?.map((tip: string, idx: number) => (
                            <li key={idx} className="flex gap-3 text-sm">
                              <ChevronRight className="w-5 h-5 text-primary shrink-0" />
                              <span className="leading-snug">{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Evidence */}
                  <div className="space-y-6">
                    {isPromptRelated && (
                      <button 
                        onClick={() => navigate('/app/prompt-lab', { state: { capturedPrompt: extractPrompt() } })}
                        className="w-full flex items-center justify-between p-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors group shadow-lg"
                      >
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-mono uppercase font-semibold mb-1 opacity-80">Action Required</span>
                          <span className="text-sm font-semibold">Explore Prompt Fix</span>
                        </div>
                        <TerminalSquare className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      </button>
                    )}
                    
                    <div>
                      <h4 className="text-sm uppercase font-mono text-muted-foreground mb-3 font-semibold tracking-wider">Evidence Logs</h4>
                      <div className="space-y-3">
                        {diagnosis.evidence?.map((ev: string, idx: number) => (
                          <div key={idx} className="bg-accent/30 border border-border p-3 rounded-md text-sm font-mono">
                            {ev}
                          </div>
                        ))}
                      </div>
                    </div>

                    {diagnosis.step_id && (
                      <button 
                        onClick={() => handleEvidenceClick(diagnosis.step_id)}
                        className="w-full flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-md hover:bg-primary/10 transition-colors group"
                      >
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-mono uppercase text-primary font-semibold mb-1">Locate Failure</span>
                          <span className="text-sm">Inspect Failed Node</span>
                        </div>
                        <Search className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                      </button>
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
