import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Play, Loader2, AlertCircle, RefreshCw, Terminal, CheckCircle2, Search, ArrowRight, Activity } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import SpecularButton from '@/components/SpecularButton';

import { GeminiIcon, OpenAIIcon, ClaudeIcon } from '@/components/ProviderIcons';

type Provider = 'demo' | 'gemini' | 'openai' | 'claude';

export default function AgentWorkspace() {
  const [prompt, setPrompt] = useState('');
  const [provider, setProvider] = useState<Provider>('demo');
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  
  // Get active project
  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await apiFetch('/api/projects');
      if (!res.ok) throw new Error('Network error');
      return res.json();
    },
  });
  
  const activeProjectId = projects?.[0]?.id;

  // Poll run status
  const { data: run } = useQuery({
    queryKey: ['run', activeRunId],
    queryFn: async () => {
      const res = await apiFetch(`/api/runs/${activeRunId}`);
      if (!res.ok) throw new Error('Failed to fetch run');
      return res.json();
    },
    enabled: !!activeRunId,
    refetchInterval: (query) => {
      const data = query.state.data as any;
      if (data && (data.status === 'completed' || data.status === 'failed')) {
        return false;
      }
      return 1000;
    }
  });

  // Poll steps
  const { data: steps } = useQuery({
    queryKey: ['steps', activeRunId],
    queryFn: async () => {
      const res = await apiFetch(`/api/steps/run/${activeRunId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!activeRunId,
    refetchInterval: () => {
      if (run && (run.status === 'completed' || run.status === 'failed')) {
        return false;
      }
      return 1000;
    }
  });

  const runMutation = useMutation({
    mutationFn: async () => {
      try {
        const res = await apiFetch(`/api/v1/projects/${activeProjectId}/agent/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, provider })
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || 'Failed to start agent');
        }
        return await res.json();
      } catch (err: any) {
        if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
          throw new Error('AgentLens backend is unavailable.\n\nPlease make sure the backend server is running.');
        }
        throw err;
      }
    },
    onSuccess: (data) => {
      setActiveRunId(data.run_id);
    }
  });

  const handleRun = () => {
    if (!prompt.trim() || !activeProjectId) return;
    setActiveRunId(null);
    runMutation.mutate();
  };

  const isRunning = run?.status === 'running' || runMutation.isPending;
  const isFailed = run?.status === 'failed';
  const isSuccess = run?.status === 'completed';

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] max-w-5xl mx-auto w-full px-8 py-6">
      
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight mb-2">Agent Workspace</h2>
        <p className="text-muted-foreground font-mono text-sm">Run your agent. See what happened. Understand why it failed.</p>
      </div>

      <div className="flex gap-6 h-full min-h-0">
        
        {/* Left Column: Input and Configuration */}
        <div className="w-[45%] flex flex-col gap-6">
          <div className="bg-accent/10 border border-border rounded-xl p-6 backdrop-blur-sm shadow-xl flex-1 flex flex-col">
            
            <div className="mb-6">
              <label className="text-xs uppercase font-mono font-semibold text-muted-foreground mb-3 block tracking-widest">
                Agent Provider
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['demo', 'gemini', 'openai', 'claude'] as Provider[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setProvider(p)}
                    className={`flex items-center gap-2 p-3 rounded-lg border text-sm transition-all ${
                      provider === p 
                        ? 'border-primary bg-primary/10 text-primary shadow-[0_0_15px_rgba(var(--primary),0.1)]' 
                        : 'border-border bg-accent/20 text-muted-foreground hover:bg-accent/40 hover:text-foreground'
                    }`}
                  >
                    {p === 'demo' && <Terminal size={16} />}
                    {p === 'gemini' && <GeminiIcon width={16} height={16} />}
                    {p === 'openai' && <OpenAIIcon width={16} height={16} />}
                    {p === 'claude' && <ClaudeIcon width={16} height={16} />}
                    <span className="capitalize">{p === 'demo' ? 'Local Demo Agent' : p}</span>
                  </button>
                ))}
              </div>
              {provider === 'demo' && (
                <p className="text-[11px] font-mono text-muted-foreground mt-3">
                  This deterministic demo agent performs real tasks (weather, math) to generate genuine telemetry traces. It will fail on invalid commands.
                </p>
              )}
            </div>

            <div className="flex-1 flex flex-col">
              <label className="text-xs uppercase font-mono font-semibold text-muted-foreground mb-3 block tracking-widest">
                Instructions
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={provider === 'demo' ? "Try: 'check weather in Tokyo' or 'divide by zero'" : "Enter instructions for your agent..."}
                className="w-full flex-1 bg-accent/5 border border-border rounded-lg p-4 font-mono text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 text-foreground transition-all mb-4"
                disabled={isRunning}
              />
              
              <SpecularButton 
                onClick={handleRun} 
                disabled={isRunning || !prompt.trim()} 
                className="w-full py-4 text-sm font-semibold rounded-lg flex items-center justify-center gap-2"
              >
                {isRunning ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Running Agent...
                  </>
                ) : (
                  <>
                    <Play size={18} />
                    Run Agent
                  </>
                )}
              </SpecularButton>
            </div>
          </div>
        </div>

        {/* Right Column: Execution State & Result */}
        <div className="w-[55%] flex flex-col gap-4 min-h-0">
          
          {!activeRunId && !runMutation.isPending && !runMutation.isError && (
            <div className="h-full border border-border bg-accent/5 border-dashed rounded-xl flex flex-col items-center justify-center text-muted-foreground">
              <Activity size={32} className="mb-4 opacity-20" />
              <p className="font-mono text-sm">Awaiting execution...</p>
            </div>
          )}

          {!activeRunId && !runMutation.isPending && runMutation.isError && (
            <div className="h-full border border-red-500/20 bg-red-500/5 border-dashed rounded-xl flex flex-col items-center justify-center text-red-500 p-6 text-center">
              <AlertCircle size={32} className="mb-4 opacity-50" />
              <p className="font-mono text-sm text-red-400 max-w-sm whitespace-pre-wrap">{runMutation.error?.message}</p>
            </div>
          )}

          {(activeRunId || runMutation.isPending) && (
            <>
              {/* Execution Steps Window */}
              <div className="flex-1 bg-black border border-border rounded-xl overflow-hidden shadow-2xl flex flex-col">
                <div className="bg-[#1a1a1a] px-4 py-3 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                    <span className="ml-2 font-mono text-xs text-white/50 tracking-wider uppercase">Execution Trace</span>
                  </div>
                  {isRunning && <Loader2 size={14} className="text-primary animate-spin" />}
                </div>
                <div className="p-5 font-mono text-sm overflow-y-auto flex-1 space-y-4">
                  {steps?.map((step: any) => (
                    <div key={step.id} className="flex gap-4">
                      <div className="mt-1 flex-shrink-0">
                        {step.status === 'executing' && <Loader2 size={14} className="text-primary animate-spin" />}
                        {step.status === 'completed' && <CheckCircle2 size={14} className="text-green-500" />}
                        {step.status === 'failed' && <AlertCircle size={14} className="text-red-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className={`font-semibold ${step.status === 'failed' ? 'text-red-400' : 'text-white/90'}`}>
                            {step.name}
                          </span>
                          <span className="text-xs text-white/30 uppercase tracking-wider">{step.type}</span>
                          {step.duration && <span className="text-xs text-white/30">{step.duration.toFixed(2)}s</span>}
                        </div>
                        {step.error && (
                          <div className="mt-2 text-xs bg-red-500/10 text-red-300 p-2 rounded border border-red-500/20 break-words">
                            {step.error.message || JSON.stringify(step.error)}
                          </div>
                        )}
                        {step.output && step.status === 'completed' && (
                          <div className="mt-2 text-xs text-white/60 truncate">
                            Output: {JSON.stringify(step.output).substring(0, 100)}...
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {steps?.length === 0 && isRunning && (
                    <div className="text-white/40 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                      Waiting for execution...
                    </div>
                  )}
                </div>
              </div>

              {/* Status & Actions Banner */}
              {(isFailed || isSuccess) && (
                <div className={`p-5 rounded-xl border flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 shadow-xl ${
                  isFailed ? 'bg-red-500/5 border-red-500/20' : 'bg-green-500/5 border-green-500/20'
                }`}>
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-full mt-0.5 flex-shrink-0 ${isFailed ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                      {isFailed ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-lg font-bold mb-1 ${isFailed ? 'text-red-500 uppercase tracking-wide' : 'text-green-500 uppercase tracking-wide'}`}>
                        {isFailed ? "AGENT FAILED" : "RESULT"}
                      </h3>
                      {isFailed ? (
                        <div className="text-sm text-muted-foreground">
                          {run?.error ? (
                            <div className="font-mono bg-red-500/10 text-red-400 p-3 rounded mt-2 border border-red-500/20 break-words whitespace-pre-wrap">
                              {run.error.type && `${run.error.type}:\n`}{run.error.message}
                            </div>
                          ) : (
                            <p>The agent encountered a critical failure during execution.</p>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          {run?.metadata_json?.result ? (
                            <div className="font-mono bg-accent/20 text-foreground p-3 rounded mt-2 border border-border whitespace-pre-wrap">
                              {run.metadata_json.result}
                            </div>
                          ) : (
                            <p>Task completed successfully.</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-3 mt-2">
                    {isFailed && (
                      <Link 
                        to={`/app/trace/${activeRunId}`} 
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 transition-colors shadow-sm"
                      >
                        <Search size={16} />
                        Why did this fail?
                      </Link>
                    )}
                    
                    {provider !== 'demo' && (
                      <Link
                        to={`/app/prompt-lab?prompt=${encodeURIComponent(prompt)}&provider=${provider}`}
                        className="bg-accent/50 border border-border hover:bg-accent px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 transition-colors shadow-sm"
                      >
                        <RefreshCw size={16} />
                        Improve this prompt
                      </Link>
                    )}
                    
                    <Link
                      to={`/app/trace/${activeRunId}`}
                      className="text-muted-foreground hover:text-foreground text-sm font-medium px-2 py-2 flex items-center gap-1 transition-colors ml-auto"
                    >
                      See what happened <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}
