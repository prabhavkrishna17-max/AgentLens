import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { 
  Play, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles,
  Layers, 
  Terminal,
  Cpu,
  ChevronDown,
  ChevronUp,
  Clock,
  Check,
  RotateCcw
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import FormattedOutput from '@/components/FormattedOutput';

export default function AgentWorkspace() {
  const [prompt, setPrompt] = useState('check weather in Tokyo');
  const [provider, setProvider] = useState<'demo' | 'gemini'>('demo');
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Active project
  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await apiFetch('/api/projects');
      if (!res.ok) throw new Error('Network error');
      return res.json();
    },
  });

  const activeProjectId = projects?.[0]?.id;

  // Dynamic agent model configuration from backend environment
  const { data: agentConfig } = useQuery({
    queryKey: ['agent-config'],
    queryFn: async () => {
      try {
        const res = await apiFetch('/api/v1/agent/config');
        if (res.ok) return await res.json();
      } catch {
        // fallback gracefully
      }
      return null;
    },
    staleTime: 60000,
  });

  const groqModel = agentConfig?.demo?.model || (import.meta as any).env.VITE_GROQ_MODEL || 'openai/gpt-oss-20b';
  const geminiModel = agentConfig?.gemini?.model || (import.meta as any).env.VITE_GEMINI_MODEL || 'gemini-3.8-flash';
  const geminiLabel = agentConfig?.gemini?.label || `Google GenAI (${geminiModel})`;
  const demoLabel = agentConfig?.demo?.label || 'Groq LLM + Tools Engine';
  const activeModelLabel = provider === 'demo'
    ? (agentConfig?.demo?.active_model_label || `Groq (${groqModel})`)
    : (agentConfig?.gemini?.active_model_label || `Google (${geminiModel})`);

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
      const s = (data?.status || '').toLowerCase();
      if (s === 'completed' || s === 'success' || s === 'failed') {
        return false;
      }
      return 600;
    }
  });

  // Poll execution steps for active run
  const { data: steps } = useQuery({
    queryKey: ['steps', activeRunId],
    queryFn: async () => {
      const res = await apiFetch(`/api/steps/run/${activeRunId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!activeRunId,
    refetchInterval: () => {
      const s = (run?.status || '').toLowerCase();
      if (s === 'completed' || s === 'success' || s === 'failed') {
        return false;
      }
      return 600;
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
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || 'Failed to start agent');
        }
        return await res.json();
      } catch (err: any) {
        if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
          throw new Error('AgentLens backend is unavailable. Ensure the API is running on localhost:8000.');
        }
        throw err;
      }
    },
    onSuccess: (data) => {
      setActiveRunId(data.run_id);
      setShowTechnicalDetails(false);
      setElapsedSeconds(0);
    }
  });

  const runStatus = (run?.status || '').toLowerCase();
  const isRunning = runStatus === 'running' || runMutation.isPending;
  const isFailed = runStatus === 'failed';
  const isSuccess = runStatus === 'completed' || runStatus === 'success';

  // Live elapsed timer while running
  useEffect(() => {
    let interval: any;
    if (isRunning) {
      const startTime = Date.now();
      interval = setInterval(() => {
        setElapsedSeconds((Date.now() - startTime) / 1000);
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const handleRun = () => {
    if (!prompt.trim() || !activeProjectId || isRunning) return;
    setActiveRunId(null);
    setShowTechnicalDetails(false);
    runMutation.mutate();
  };

  // Keyboard shortcut: Ctrl+Enter or Cmd+Enter to run
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRun();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prompt, activeProjectId, isRunning]);

  // Extract model/agent response text from metadata or last step
  const getResponseOutput = () => {
    if (run?.metadata_json?.result) {
      return typeof run.metadata_json.result === 'string'
        ? run.metadata_json.result
        : JSON.stringify(run.metadata_json.result, null, 2);
    }
    const lastStep = steps && steps.length > 0 ? steps[steps.length - 1] : null;
    if (lastStep?.output) {
      if (typeof lastStep.output === 'string') return lastStep.output;
      if (lastStep.output.result) return String(lastStep.output.result);
      if (lastStep.output.content) return String(lastStep.output.content);
      return JSON.stringify(lastStep.output, null, 2);
    }
    return 'Execution completed successfully with no additional output text.';
  };

  // Structured error resolution
  const getErrorDetails = () => {
    const errorObj = run?.error;
    const failedStep = steps?.find((s: any) => s.status === 'failed');

    let category = errorObj?.category || 'agent_execution';
    let title = errorObj?.title || 'Execution failed';
    let summary = errorObj?.summary || '';
    let raw = errorObj?.raw || errorObj?.message || '';

    if (!summary && errorObj?.message) {
      const msg = errorObj.message;
      if (msg.includes('404') || msg.toLowerCase().includes('model_not_found') || msg.toLowerCase().includes('does not exist')) {
        category = 'provider_configuration';
        title = 'Model configuration error';
        summary = 'The selected LLM model is unavailable or inaccessible.';
      } else if (msg.toLowerCase().includes('zerodivision') || msg.toLowerCase().includes('divide by zero')) {
        category = 'agent_execution';
        title = 'Agent execution failure';
        summary = 'Agent task failed during step execution: division by zero';
      } else {
        summary = msg.split('\n')[0].slice(0, 160);
      }
    }

    if (!raw && failedStep?.error) {
      raw = typeof failedStep.error === 'string' ? failedStep.error : JSON.stringify(failedStep.error, null, 2);
      if (!summary) {
        summary = failedStep.error?.message || 'A step encountered an error during agent execution.';
      }
    }

    if (!summary) {
      summary = 'Agent execution encountered an unhandled exception.';
    }

    return { category, title, summary, raw: raw || summary };
  };

  const samplePrompts = [
    { label: '🌤️ Weather in Tokyo', text: 'check weather in Tokyo', description: 'Multi-step geocoding & live weather API' },
    { label: '🔢 Calculate 25 * 48', text: 'calculate 25 * 48', description: 'Deterministic math tool computation' },
    { label: '➗ Divide 100 by 4', text: 'divide 100 by 4', description: 'Division math tool execution' },
    { label: '💬 General Query', text: 'What is AgentLens and how does it diagnose agent failures?', description: 'Direct Groq LLM inference' },
    { label: '⚠️ Simulate Error', text: 'divide by zero', description: 'Tests failure capture & automated AI diagnosis', isError: true },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Page Title & Context Header */}
      <div className="border-b border-border/70 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Run Agent</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          Execute tasks, observe multi-step tool calls, and diagnose failures in real time.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ================================================================= */}
        {/* LEFT PANEL: SEE & RUN (Configuration, Instructions, Trigger)     */}
        {/* ================================================================= */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Agent Identity & Status Card */}
          <div className="p-4 border border-border/80 bg-accent/15 rounded-lg space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                Selected Agent
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-mono font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Active
              </span>
            </div>
            
            {/* Agent Provider Selector */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setProvider('demo')}
                  className={`flex-1 p-2.5 rounded-md border text-left transition-all ${
                    provider === 'demo'
                      ? 'bg-primary/15 border-primary/40 text-foreground ring-1 ring-primary/30'
                      : 'bg-accent/10 border-border/60 text-muted-foreground hover:bg-accent/25 hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-primary" />
                      Demo Agent
                    </span>
                    {provider === 'demo' && <Check className="w-3.5 h-3.5 text-primary" />}
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground mt-1 truncate">
                    {demoLabel}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setProvider('gemini')}
                  className={`flex-1 p-2.5 rounded-md border text-left transition-all ${
                    provider === 'gemini'
                      ? 'bg-primary/15 border-primary/40 text-foreground ring-1 ring-primary/30'
                      : 'bg-accent/10 border-border/60 text-muted-foreground hover:bg-accent/25 hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-purple-400" />
                      Gemini Agent
                    </span>
                    {provider === 'gemini' && <Check className="w-3.5 h-3.5 text-purple-400" />}
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground mt-1 truncate">
                    {geminiLabel}
                  </div>
                </button>
              </div>

              <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-1 px-1">
                <span>Active Model:</span>
                <span className="text-foreground/90 font-medium">
                  {activeModelLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Task Instructions Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="task-prompt" className="text-xs font-mono font-semibold text-foreground uppercase tracking-wider">
                Task Instructions
              </label>
              <span className="text-[10px] font-mono text-muted-foreground">
                Ctrl + Enter to run
              </span>
            </div>

            <textarea
              ref={textareaRef}
              id="task-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isRunning}
              rows={4}
              placeholder="Enter instructions (e.g., 'check weather in Tokyo' or 'calculate 25 * 48')"
              className="w-full bg-accent/10 border border-border/90 rounded-lg p-3 font-mono text-xs md:text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-colors resize-none disabled:opacity-50"
            />

            {/* Quick Sample Prompts */}
            <div className="space-y-1.5 pt-1">
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/80 font-medium">
                Sample Commands
              </div>
              <div className="flex flex-wrap gap-1.5">
                {samplePrompts.map((sample) => (
                  <button
                    key={sample.label}
                    type="button"
                    onClick={() => {
                      setPrompt(sample.text);
                      textareaRef.current?.focus();
                    }}
                    disabled={isRunning}
                    title={sample.description}
                    className={`text-[11px] font-mono px-2.5 py-1 rounded border transition-colors ${
                      prompt === sample.text
                        ? 'bg-primary/20 border-primary/50 text-primary font-semibold'
                        : sample.isError
                        ? 'bg-rose-950/20 border-rose-500/30 text-rose-300 hover:bg-rose-950/40 hover:text-rose-200'
                        : 'bg-accent/20 border-border/70 text-muted-foreground hover:text-foreground hover:bg-accent/40'
                    }`}
                  >
                    {sample.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* PRIMARY ACTION: Run Agent Button */}
          <button
            type="button"
            onClick={handleRun}
            disabled={isRunning || !prompt.trim() || !activeProjectId}
            className="w-full py-3 px-5 bg-primary text-primary-foreground font-semibold text-sm rounded-lg hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2.5 shadow-md shadow-primary/10 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
            aria-label="Run Agent task"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-primary-foreground" />
                <span>Running Agent...</span>
                <span className="text-xs font-mono opacity-80">({elapsedSeconds.toFixed(1)}s)</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current text-primary-foreground" />
                <span>Run Agent</span>
                <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-[10px] font-mono bg-black/20 rounded border border-white/20 text-primary-foreground/90">
                  Ctrl + ↵
                </kbd>
              </>
            )}
          </button>
        </div>

        {/* ================================================================= */}
        {/* RIGHT PANEL: OBSERVE & DIAGNOSE (Dominant Information Area)       */}
        {/* ================================================================= */}
        <div className="lg:col-span-7 flex flex-col min-h-[380px]">
          
          <div className="border border-border/80 bg-accent/10 rounded-lg p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
            
            {/* Right Pane Header: State & Run ID */}
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <span className="text-xs font-mono uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-primary" />
                <span>Execution Result</span>
              </span>

              {activeRunId && (
                <span className="text-[11px] font-mono text-muted-foreground/90 bg-accent/30 px-2 py-0.5 rounded border border-border/60">
                  Run #{activeRunId.slice(0, 8)}
                </span>
              )}
            </div>

            {/* STATE 1: READY / IDLE (Answers: What am I looking at? What do I do next?) */}
            {!activeRunId && !runMutation.isPending && !runMutation.isError && (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-10 px-4 text-muted-foreground">
                <div className="w-12 h-12 rounded-full bg-accent/30 border border-border/80 flex items-center justify-center mb-3">
                  <Terminal className="w-6 h-6 text-muted-foreground/70" />
                </div>
                <h3 className="text-sm font-semibold text-foreground font-mono mb-1">
                  Ready to Execute
                </h3>
                <p className="text-xs text-muted-foreground/80 max-w-sm leading-relaxed">
                  Enter instructions on the left or select a sample command, then press <strong className="text-foreground">Run Agent</strong>. Telemetry, tool steps, and LLM activity will appear here in real time.
                </p>
              </div>
            )}

            {/* STATE 2: LAUNCH ERROR */}
            {runMutation.isError && !activeRunId && (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-8 px-4 text-rose-400 space-y-2">
                <AlertCircle className="w-10 h-10 text-rose-500 mb-1" />
                <div className="text-sm font-semibold">Execution Failed to Start</div>
                <div className="text-xs font-mono text-muted-foreground max-w-sm bg-rose-950/20 border border-rose-500/20 p-2.5 rounded-md">
                  {runMutation.error?.message}
                </div>
                <button
                  type="button"
                  onClick={handleRun}
                  className="mt-2 text-xs font-medium text-primary hover:underline flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Retry Run
                </button>
              </div>
            )}

            {/* STATE 3: LIVE RUNNING STATE (Answers: What is happening right now?) */}
            {(isRunning || (activeRunId && !isSuccess && !isFailed)) && (
              <div className="space-y-4 flex-1">
                {/* Live execution banner */}
                <div className="flex items-center justify-between p-3 rounded-md bg-primary/10 border border-primary/20 text-primary">
                  <div className="flex items-center gap-2.5 text-xs font-mono font-medium">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span>Agent executing tasks and tool calls...</span>
                  </div>
                  <span className="text-xs font-mono font-semibold">
                    {elapsedSeconds.toFixed(1)}s
                  </span>
                </div>

                {/* Step Progression Stream */}
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                    Execution Steps ({steps?.length || 0})
                  </div>
                  
                  {(!steps || steps.length === 0) ? (
                    <div className="text-xs font-mono text-muted-foreground p-3 rounded bg-background/50 border border-border/50 text-center animate-pulse">
                      Initializing agent telemetry session...
                    </div>
                  ) : (
                    steps.map((step: any) => (
                      <div 
                        key={step.id} 
                        className="flex items-center justify-between p-2.5 rounded bg-background/70 border border-border/70 text-xs font-mono"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {step.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                          {step.status === 'failed' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                          {step.status === 'executing' && <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />}
                          {!['completed', 'failed', 'executing'].includes(step.status) && (
                            <span className="w-2 h-2 rounded-full bg-muted-foreground/40 shrink-0 ml-1"></span>
                          )}
                          <span className="font-semibold text-foreground truncate">{step.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-muted-foreground uppercase font-medium">
                            {step.type}
                          </span>
                          {step.duration !== undefined && step.duration !== null && (
                            <span className="text-[10px] text-muted-foreground">
                              {step.duration.toFixed(2)}s
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* STATE 4: SUCCESS RESULT (Answers: Did it succeed? What should I do next?) */}
            {isSuccess && (
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-3.5">
                  {/* Status Banner */}
                  <div className="flex items-center justify-between p-3 rounded-md bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
                    <div className="flex items-center gap-2 text-xs font-bold font-mono">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>RUN COMPLETED</span>
                    </div>
                    {run?.duration !== undefined && (
                      <span className="text-xs font-mono font-semibold flex items-center gap-1">
                        <Clock className="w-3 h-3 text-emerald-400/80" />
                        {run.duration.toFixed(2)}s
                      </span>
                    )}
                  </div>

                  {/* Agent Output Text */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                      Agent Response
                    </span>
                    <div className="p-3.5 rounded-md bg-background/90 border border-border/80 text-foreground leading-relaxed max-h-60 overflow-y-auto">
                      <FormattedOutput content={getResponseOutput()} />
                    </div>
                  </div>

                  {/* Metadata stats */}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px] font-mono text-muted-foreground bg-accent/15 px-3 py-2 rounded border border-border/60">
                    <span>Steps: <strong className="text-foreground">{steps?.length || 1}</strong></span>
                    <span>•</span>
                    <span>Agent: <strong className="text-foreground">{run?.agent_name || (provider === 'demo' ? 'Demo Agent' : 'Gemini Agent')}</strong></span>
                    {steps?.find((s: any) => s.type === 'LLM')?.metadata?.model && (
                      <>
                        <span>•</span>
                        <span>Model: <strong className="text-foreground">{steps.find((s: any) => s.type === 'LLM')?.metadata?.model}</strong></span>
                      </>
                    )}
                  </div>
                </div>

                {/* PRIMARY ACTION: View Trace */}
                <div className="pt-2 border-t border-border/50">
                  <Link
                    to={`/app/trace/${activeRunId}`}
                    className="w-full py-2.5 px-4 bg-primary text-primary-foreground font-semibold text-xs sm:text-sm rounded-lg hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <span>View Trace</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            )}

            {/* STATE 5: FAILED RESULT (Answers: Did it succeed? Why did it fail? What do I do next?) */}
            {isFailed && (() => {
              const err = getErrorDetails();
              return (
                <div className="space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    
                    {/* Failure Status Bar */}
                    <div className="flex items-center justify-between p-3 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-400">
                      <div className="flex items-center gap-2 text-xs font-bold font-mono">
                        <AlertCircle className="w-4 h-4 text-rose-400" />
                        <span>RUN FAILED</span>
                      </div>
                      {run?.duration !== undefined && (
                        <span className="text-xs font-mono font-semibold">
                          {run.duration.toFixed(2)}s
                        </span>
                      )}
                    </div>

                    {/* Human-Readable Error Box */}
                    <div className="p-3.5 rounded-md bg-rose-950/20 border border-rose-500/30 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono uppercase tracking-wider text-rose-400 font-bold">
                          {err.title}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground uppercase px-1.5 py-0.2 rounded bg-rose-950/40 border border-rose-500/20">
                          {err.category.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-rose-200 font-medium leading-relaxed">
                        {err.summary}
                      </p>
                    </div>

                    {/* PRIMARY ACTION BAR: View Trace & Diagnose Failure */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      <Link
                        to={`/app/trace/${activeRunId}`}
                        className="py-2.5 px-4 bg-accent/40 hover:bg-accent/80 border border-border/80 text-foreground font-semibold text-xs sm:text-sm rounded-lg transition-colors flex items-center justify-center gap-1.5 text-center"
                      >
                        <Layers className="w-4 h-4 text-muted-foreground" />
                        <span>View Trace</span>
                      </Link>

                      <Link
                        to={`/app/trace/${activeRunId}?diagnose=true`}
                        className="py-2.5 px-4 bg-primary text-primary-foreground font-semibold text-xs sm:text-sm rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 text-center shadow-md shadow-primary/20"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Diagnose Failure</span>
                      </Link>
                    </div>

                    {/* Progressive Disclosure: View Technical Details */}
                    <div className="pt-2 border-t border-border/40">
                      <button
                        type="button"
                        onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                        className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                      >
                        <span>{showTechnicalDetails ? 'Hide technical details' : 'View technical details'}</span>
                        {showTechnicalDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      {showTechnicalDetails && (
                        <div className="mt-2 p-3 rounded-md bg-black/80 border border-border/70 font-mono text-[11px] text-rose-300 whitespace-pre-wrap leading-relaxed max-h-44 overflow-y-auto shadow-inner animate-in fade-in duration-150">
                          {err.raw}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

          </div>

        </div>

      </div>

    </div>
  );
}
