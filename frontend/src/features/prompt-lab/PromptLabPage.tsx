import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TerminalSquare, History, Plus, Loader2, Copy, Check, ChevronRight, AlertCircle, Edit2, Play, Trash2, ArrowLeft } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '@/lib/api';

export default function PromptLabPage() {
  const queryClient = useQueryClient();
  const location = useLocation();
  
  const [originalPrompt, setOriginalPrompt] = useState('');
  const [targetModel, setTargetModel] = useState('Generic');
  const [isCopied, setIsCopied] = useState(false);
  const [currentRefinement, setCurrentRefinement] = useState<any>(null);
  const [analyzingState, setAnalyzingState] = useState(0); // 0: idle, 1: step1, 2: step2, 3: step3

  useEffect(() => {
    if (location.state?.capturedPrompt) {
      setOriginalPrompt(location.state.capturedPrompt);
    }
  }, [location.state]);

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await apiFetch('/api/projects');
      if (!res.ok) throw new Error('Network error');
      return res.json();
    }
  });

  const activeProjectId = projects?.[0]?.id;

  const { data: history, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['prompts', activeProjectId],
    queryFn: async () => {
      const res = await apiFetch(`/api/v1/projects/${activeProjectId}/prompts`);
      if (!res.ok) throw new Error('Network error');
      return res.json();
    },
    enabled: !!activeProjectId
  });

  const refineMutation = useMutation({
    mutationFn: async () => {
      if (!activeProjectId) throw new Error("No active project");
      
      setAnalyzingState(3);

      const res = await apiFetch('/api/v1/prompts/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: activeProjectId,
          target_model: targetModel,
          original_prompt: originalPrompt
        })
      });
      if (!res.ok) throw new Error("Failed to refine prompt");
      return res.json();
    },
    onSuccess: (data) => {
      setAnalyzingState(0);
      setCurrentRefinement(data);
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
    },
    onError: () => {
      setAnalyzingState(0);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/api/v1/prompts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
      setCurrentRefinement(null);
    }
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleUsePrompt = (prompt: string) => {
    setOriginalPrompt(prompt);
    setCurrentRefinement(null);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-8 max-w-7xl mx-auto w-full flex flex-col h-[calc(100vh-4rem)] overflow-hidden"
    >
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between shrink-0 gap-4">
        <div>
          <h2 className="text-3xl font-bold mb-2 flex items-center gap-2 tracking-tight">
            <TerminalSquare className="w-8 h-8" /> Prompt Lab
          </h2>
          <p className="text-muted-foreground font-mono text-sm">Refine an agent instruction for the model you're actually using.</p>
        </div>
        <button 
          onClick={() => {
            setOriginalPrompt('');
            setCurrentRefinement(null);
          }}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90 flex items-center gap-2 w-fit transition-transform active:scale-95"
        >
          <Plus className="w-4 h-4" /> New Prompt
        </button>
      </div>

      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Main Editor & Results */}
        <div className="lg:col-span-3 flex flex-col gap-6 overflow-y-auto pr-2 pb-10">
          
          <AnimatePresence mode="wait">
            {!currentRefinement ? (
              <motion.div 
                key="editor"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3 }}
                className="p-6 border border-border bg-accent/20 rounded-xl flex flex-col gap-4 shadow-sm backdrop-blur-sm"
              >
                {analyzingState > 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 space-y-6">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-accent rounded-full border-t-primary animate-spin" />
                    </div>
                    <div className="space-y-3 w-64">
                      <div className={`flex items-center gap-3 transition-opacity duration-300 ${analyzingState >= 1 ? 'opacity-100' : 'opacity-30'}`}>
                        <Check className="w-4 h-4 text-green-500" />
                        <span className="font-mono text-sm">Analyzing prompt structure...</span>
                      </div>
                      <div className={`flex items-center gap-3 transition-opacity duration-300 ${analyzingState >= 2 ? 'opacity-100' : 'opacity-30'}`}>
                        {analyzingState > 2 ? <Check className="w-4 h-4 text-green-500" /> : analyzingState === 2 ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <div className="w-4 h-4 rounded-full border border-border" />}
                        <span className="font-mono text-sm">Checking constraints & clarity...</span>
                      </div>
                      <div className={`flex items-center gap-3 transition-opacity duration-300 ${analyzingState >= 3 ? 'opacity-100' : 'opacity-30'}`}>
                        {analyzingState > 3 ? <Check className="w-4 h-4 text-green-500" /> : analyzingState === 3 ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <div className="w-4 h-4 rounded-full border border-border" />}
                        <span className="font-mono text-sm">Adapting to {targetModel}...</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-mono uppercase text-muted-foreground font-semibold tracking-wider">Prompt Editor</label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground">Target Agent:</span>
                        <select 
                          value={targetModel}
                          onChange={(e) => setTargetModel(e.target.value)}
                          className="bg-background border border-border rounded px-3 py-1.5 text-sm font-mono outline-none hover:border-primary/50 focus:border-primary transition-colors cursor-pointer"
                        >
                          <option value="Generic">Generic (Provider-neutral improvements)</option>
                          <option value="OpenAI">ChatGPT (Structured rules & explicit roles)</option>
                          <option value="Anthropic">Claude (Context-rich, clear boundaries)</option>
                          <option value="Gemini">Gemini (Structured tasks & grounding)</option>
                        </select>
                      </div>
                    </div>
                    
                    <textarea 
                      value={originalPrompt}
                      onChange={(e) => setOriginalPrompt(e.target.value)}
                      placeholder="You are a customer support agent...&#10;&#10;(Provide your agent instructions here)"
                      className="w-full h-48 lg:h-64 bg-background border border-border rounded-md p-4 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-mono text-sm resize-y shadow-inner"
                    />
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-muted-foreground">
                        {originalPrompt.length} chars • ~{Math.round(originalPrompt.length / 4)} tokens
                      </span>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setOriginalPrompt('')}
                          disabled={!originalPrompt}
                          className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
                        >
                          Clear
                        </button>
                        <button 
                          onClick={() => refineMutation.mutate()}
                          disabled={!originalPrompt || originalPrompt.trim().length === 0 || refineMutation.isPending}
                          className="bg-primary text-primary-foreground px-6 py-2 rounded-md font-medium hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50 transition-transform active:scale-95 shadow-md"
                        >
                          <Play className="w-4 h-4" />
                          Refine Prompt
                        </button>
                      </div>
                    </div>
                    {originalPrompt && <div className="text-xs text-muted-foreground italic flex items-center gap-1 mt-2 border-t border-border pt-4">
                      <AlertCircle className="w-3 h-3" /> Local deterministic Prompt Analysis running on {targetModel} profile.
                    </div>}
                  </>
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="results"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, staggerChildren: 0.1 }}
                className="flex flex-col gap-6"
              >
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    Refinement Results
                  </h3>
                  <button 
                    onClick={() => setCurrentRefinement(null)}
                    className="text-sm font-mono text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back to Editor
                  </button>
                </div>

                {/* Side-by-side or stacked Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="border border-border bg-accent/10 rounded-lg p-4 flex flex-col h-full shadow-sm"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-mono text-muted-foreground uppercase font-semibold tracking-wider">Original</span>
                      <span className="text-xs font-mono text-red-400">Score: {currentRefinement.quality_before}</span>
                    </div>
                    <div className="bg-background border border-border rounded p-4 flex-1 font-mono text-sm whitespace-pre-wrap overflow-y-auto max-h-80 opacity-80 leading-relaxed">
                      {currentRefinement.original_prompt}
                    </div>
                  </motion.div>

                  <motion.div 
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="border border-primary/30 bg-primary/5 rounded-lg p-4 flex flex-col h-full shadow-[0_0_15px_rgba(var(--primary),0.05)]"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-primary uppercase font-semibold tracking-wider">Refined</span>
                        <span className="text-[10px] uppercase bg-primary/10 text-primary px-1.5 py-0.5 rounded-sm">{currentRefinement.target_model}</span>
                      </div>
                      <span className="text-xs font-mono text-green-400">Score: {currentRefinement.quality_after}</span>
                    </div>
                    <div className="bg-background border border-primary/20 rounded p-4 flex-1 font-mono text-sm whitespace-pre-wrap overflow-y-auto max-h-80 text-foreground leading-relaxed shadow-inner">
                      {currentRefinement.refined_prompt}
                    </div>
                    <div className="mt-4 flex justify-end gap-3">
                      <button 
                        onClick={() => copyToClipboard(currentRefinement.refined_prompt)}
                        className="px-3 py-1.5 border border-border hover:bg-accent rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />} {isCopied ? 'Copied' : 'Copy'}
                      </button>
                      <button 
                        onClick={() => handleUsePrompt(currentRefinement.refined_prompt)}
                        className="px-4 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-xs flex items-center gap-1.5 transition-all active:scale-95 font-medium shadow-sm"
                      >
                        Use This Prompt
                      </button>
                    </div>
                  </motion.div>
                </div>

                {/* Why these changes */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 border border-border rounded-lg bg-accent/20 overflow-hidden shadow-sm"
                >
                  <div className="bg-accent/40 px-5 py-3 border-b border-border">
                    <h4 className="text-sm font-semibold flex items-center gap-2 tracking-tight">
                      <Edit2 className="w-4 h-4" /> Why this changed
                    </h4>
                  </div>
                  <div className="p-5 space-y-4">
                    {currentRefinement.changes && currentRefinement.changes.length > 0 ? (
                      currentRefinement.changes.map((change: any, i: number) => (
                        <div key={i} className="flex gap-4 text-sm group">
                          <ChevronRight className="w-4 h-4 text-primary shrink-0 mt-0.5 opacity-50 group-hover:opacity-100 transition-opacity" />
                          <div>
                            <div className="font-mono text-xs text-primary font-semibold uppercase tracking-wider mb-1">
                              {change.category}
                            </div>
                            <div className="text-foreground/90 font-medium mb-0.5">
                              {change.what_changed}
                            </div>
                            <p className="text-muted-foreground text-xs leading-relaxed">
                              {change.why}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No structural changes were deemed necessary for this model target. The prompt is already optimal.</p>
                    )}
                  </div>
                </motion.div>

                <p className="text-xs text-muted-foreground text-center font-mono italic opacity-70">
                  Prompt Quality Estimate is based on structural criteria (clarity, constraints, formatting) and deterministic heuristics.
                </p>

              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* History Sidebar */}
        <div className="lg:col-span-1 border-t lg:border-t-0 lg:border-l border-border pt-6 lg:pt-0 lg:pl-6 flex flex-col h-full overflow-hidden">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 shrink-0">
            <History className="w-5 h-5" /> Saved Iterations
          </h3>
          
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 pb-10">
            {isHistoryLoading ? (
              <div className="text-sm text-muted-foreground animate-pulse font-mono">Loading history...</div>
            ) : !history || history.length === 0 ? (
              <div className="text-sm text-muted-foreground p-6 bg-accent/20 rounded-md border border-border text-center flex flex-col gap-3">
                <span>No refinements yet.</span>
                <span className="text-xs">Your previous prompt improvements will appear here.</span>
              </div>
            ) : (
              history.map((h: any) => (
                <motion.div 
                  layout
                  key={h.id} 
                  onClick={() => setCurrentRefinement(h)}
                  className={`p-3 bg-accent/10 border transition-all rounded-lg cursor-pointer flex flex-col gap-2 group ${currentRefinement?.id === h.id ? 'border-primary/50 shadow-[0_0_15px_rgba(var(--primary),0.1)]' : 'border-border hover:border-muted-foreground/40'}`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-mono uppercase bg-accent px-1.5 py-0.5 rounded text-muted-foreground font-semibold tracking-wider">
                      {h.target_model}
                    </span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(h.id); }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/20 hover:text-destructive rounded transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-xs text-foreground truncate font-mono opacity-80">
                    {h.original_prompt}
                  </div>
                  <div className="text-xs text-primary truncate font-mono bg-primary/5 p-1.5 rounded border border-primary/10">
                    {h.refined_prompt}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono flex justify-between mt-1 opacity-70">
                    <span>{new Date(h.created_at).toLocaleDateString()}</span>
                    <span className="text-green-500">+{h.quality_after - h.quality_before} pts</span>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

      </div>
    </motion.div>
  );
}

