
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRightLeft, Activity, AlertCircle } from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function ComparePage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const run1Id = searchParams.get('run1');
    const run2Id = searchParams.get('run2');

    // Fetch projects to get active project
    const { data: projects } = useQuery({
      queryKey: ['projects'],
      queryFn: async () => {
        const res = await apiFetch('/api/projects');
        if (!res.ok) throw new Error('Network error');
        return res.json();
      },
    });
    const activeProjectId = projects?.[0]?.id;

    // Fetch all runs for the dropdowns
    const { data: runsData } = useQuery({
      queryKey: ['runs', activeProjectId, 'all-for-compare'],
      queryFn: async () => {
        const res = await apiFetch(`/api/runs?project_id=${activeProjectId}&limit=100`);
        if (!res.ok) throw new Error('Network error');
        return res.json();
      },
      enabled: !!activeProjectId,
    });
    
    const runs = (runsData as any)?.items || [];

    const { data: run1 } = useQuery({
        queryKey: ['run', run1Id],
        queryFn: async () => {
            const res = await apiFetch(`/api/runs/${run1Id}`);
            if (!res.ok) throw new Error('Network error');
            return res.json();
        },
        enabled: !!run1Id
    });

    const { data: run2 } = useQuery({
        queryKey: ['run', run2Id],
        queryFn: async () => {
            const res = await apiFetch(`/api/runs/${run2Id}`);
            if (!res.ok) throw new Error('Network error');
            return res.json();
        },
        enabled: !!run2Id
    });

    const { data: steps1 } = useQuery({
        queryKey: ['steps', run1Id],
        queryFn: async () => {
            const res = await apiFetch(`/api/steps/run/${run1Id}`);
            if (!res.ok) throw new Error('Network error');
            return res.json();
        },
        enabled: !!run1Id
    });

    const { data: steps2 } = useQuery({
        queryKey: ['steps', run2Id],
        queryFn: async () => {
            const res = await apiFetch(`/api/steps/run/${run2Id}`);
            if (!res.ok) throw new Error('Network error');
            return res.json();
        },
        enabled: !!run2Id
    });

    const setRun1 = (id: string) => {
        const p = new URLSearchParams(searchParams);
        if (id) p.set('run1', id); else p.delete('run1');
        setSearchParams(p);
    };

    const setRun2 = (id: string) => {
        const p = new URLSearchParams(searchParams);
        if (id) p.set('run2', id); else p.delete('run2');
        setSearchParams(p);
    };

    const RunSelector = ({ selected, onChange, label, runsList }: any) => (
        <div className="flex flex-col gap-2 flex-1">
            <label className="text-xs uppercase font-mono tracking-widest text-muted-foreground">{label}</label>
            <select 
                value={selected || ''} 
                onChange={(e) => onChange(e.target.value)}
                className="bg-accent/30 border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary transition-colors font-mono w-full"
            >
                <option value="">Select a run...</option>
                {runsList.map((r: any) => (
                    <option key={r.id} value={r.id}>
                        {r.task} ({r.status}) - {new Date(r.started_at).toLocaleString()}
                    </option>
                ))}
            </select>
        </div>
    );

    const RunSummary = ({ run, steps }: any) => {
        if (!run) return <div className="p-6 border border-border bg-accent/10 rounded-xl h-full flex items-center justify-center text-muted-foreground font-mono text-sm">No run selected</div>;
        
        return (
            <div className="p-6 border border-border bg-accent/20 rounded-xl h-full flex flex-col">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <div className="text-xl font-bold">{run.task}</div>
                        <div className="text-xs text-muted-foreground font-mono mt-1">{run.id}</div>
                    </div>
                    <span className={`px-2 py-1 rounded-md text-xs font-mono border ${
                      run.status === 'success' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
                      run.status === 'failed' ? 'bg-destructive/10 text-destructive border-destructive/20' : 
                      'bg-primary/10 text-primary border-primary/20'
                    }`}>
                      {(run.status || 'running').toUpperCase()}
                    </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-auto">
                    <div>
                        <div className="text-xs uppercase font-mono text-muted-foreground mb-1">Agent</div>
                        <div className="font-mono text-sm px-2 py-1 bg-secondary/50 rounded inline-block">{run.agent_name}</div>
                    </div>
                    <div>
                        <div className="text-xs uppercase font-mono text-muted-foreground mb-1">Duration</div>
                        <div className="font-mono text-sm">{run.duration ? `${run.duration.toFixed(2)}s` : '-'}</div>
                    </div>
                    <div>
                        <div className="text-xs uppercase font-mono text-muted-foreground mb-1">Steps</div>
                        <div className="font-mono text-sm">{steps?.length || 0}</div>
                    </div>
                    <div>
                        <div className="text-xs uppercase font-mono text-muted-foreground mb-1">Environment</div>
                        <div className="font-mono text-sm capitalize">{run.environment}</div>
                    </div>
                </div>
                
                {run.status === 'failed' && (
                    <Link to={`/app/trace/${run.id}`} className="mt-6 block w-full py-2 bg-destructive/10 text-destructive border border-destructive/20 rounded-md text-center text-sm font-mono hover:bg-destructive/20 transition-colors">
                        Open Diagnosis
                    </Link>
                )}
            </div>
        );
    };

    return (
        <div className="p-8 max-w-7xl mx-auto w-full flex flex-col h-full overflow-hidden">
            <div className="mb-6 flex items-end justify-between shrink-0">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Compare Runs</h1>
                    <p className="text-muted-foreground font-mono text-sm">Understand what changed between two executions.</p>
                </div>
            </div>

            <div className="flex gap-4 mb-6 shrink-0">
                <RunSelector selected={run1Id} onChange={setRun1} label="Run A" runsList={runs} />
                <div className="flex items-center justify-center px-4 mt-6">
                    <ArrowRightLeft className="w-5 h-5 text-muted-foreground" />
                </div>
                <RunSelector selected={run2Id} onChange={setRun2} label="Run B" runsList={runs} />
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 shrink-0">
                    <RunSummary run={run1} steps={steps1} />
                    <RunSummary run={run2} steps={steps2} />
                </div>
                
                {run1 && run2 && steps1 && steps2 && (
                    <div className="border border-border bg-accent/10 rounded-xl overflow-hidden flex flex-col flex-1 min-h-[400px]">
                        <div className="p-4 border-b border-border bg-accent/30 font-mono text-sm font-semibold tracking-wider uppercase flex justify-between">
                            <span>Trace Comparison</span>
                            {steps1.length !== steps2.length && (
                                <span className="text-yellow-500 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Execution paths diverged</span>
                            )}
                        </div>
                        <div className="p-6 flex-1 overflow-y-auto">
                            {/* Simple side by side step comparison */}
                            <div className="flex flex-col lg:flex-row gap-6">
                                {/* Run 1 Steps */}
                                <div className="flex-1 flex flex-col gap-3">
                                    {steps1.map((step: any, i: number) => {
                                        const correspondingStep = steps2[i];
                                        const isChanged = correspondingStep && (step.status !== correspondingStep.status || step.name !== correspondingStep.name);
                                        const isRemoved = !correspondingStep;
                                        
                                        const isPromptStep = step.name.toLowerCase().includes('prompt') || step.type === 'llm';
                                        
                                        return (
                                            <div key={step.id} className={`p-4 border rounded-lg ${
                                                step.status === 'failed' ? 'border-destructive/50 bg-destructive/5' : 
                                                isChanged ? 'border-yellow-500/50 bg-yellow-500/5' :
                                                isRemoved ? 'border-red-500/50 bg-red-500/5 opacity-70' :
                                                'border-border bg-accent/20'
                                            }`}>
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="font-semibold text-sm">{step.name}</div>
                                                    <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded ${step.status === 'failed' ? 'bg-destructive/20 text-destructive' : 'bg-primary/20 text-primary'}`}>{step.status}</span>
                                                </div>
                                                <div className="text-xs text-muted-foreground font-mono mb-2">Type: {step.type} | Duration: {step.duration ? step.duration.toFixed(2) : '-'}s</div>
                                                
                                                {isPromptStep && isChanged && (
                                                    <div className="mb-2 inline-flex items-center gap-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider">
                                                        <Activity className="w-3 h-3" /> Prompt Changed
                                                    </div>
                                                )}
                                                
                                                {step.output && (
                                                    <div className="mt-3">
                                                        <div className="text-[10px] uppercase font-mono text-muted-foreground mb-1">Output</div>
                                                        <div className="bg-black/50 p-2 rounded text-xs font-mono overflow-hidden text-ellipsis max-h-32 overflow-y-auto whitespace-pre-wrap">{
                                                            typeof step.output === 'object' ? JSON.stringify(step.output, null, 2) : step.output
                                                        }</div>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                                
                                {/* Run 2 Steps */}
                                <div className="flex-1 flex flex-col gap-3">
                                    {steps2.map((step: any, i: number) => {
                                        const correspondingStep = steps1[i];
                                        const isChanged = correspondingStep && (step.status !== correspondingStep.status || step.name !== correspondingStep.name);
                                        const isAdded = !correspondingStep;
                                        
                                        const isPromptStep = step.name.toLowerCase().includes('prompt') || step.type === 'llm';
                                        
                                        return (
                                            <div key={step.id} className={`p-4 border rounded-lg ${
                                                step.status === 'failed' ? 'border-destructive/50 bg-destructive/5' : 
                                                isChanged ? 'border-yellow-500/50 bg-yellow-500/5' :
                                                isAdded ? 'border-green-500/50 bg-green-500/5' :
                                                'border-border bg-accent/20'
                                            }`}>
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="font-semibold text-sm">{step.name}</div>
                                                    <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded ${step.status === 'failed' ? 'bg-destructive/20 text-destructive' : 'bg-primary/20 text-primary'}`}>{step.status}</span>
                                                </div>
                                                <div className="text-xs text-muted-foreground font-mono mb-2">Type: {step.type} | Duration: {step.duration ? step.duration.toFixed(2) : '-'}s</div>
                                                
                                                {isPromptStep && isChanged && (
                                                    <div className="mb-2 inline-flex items-center gap-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider">
                                                        <Activity className="w-3 h-3" /> Refined Prompt Applied
                                                    </div>
                                                )}
                                                
                                                {step.output && (
                                                    <div className="mt-3">
                                                        <div className="text-[10px] uppercase font-mono text-muted-foreground mb-1">Output</div>
                                                        <div className="bg-black/50 p-2 rounded text-xs font-mono overflow-hidden text-ellipsis max-h-32 overflow-y-auto whitespace-pre-wrap">{
                                                            typeof step.output === 'object' ? JSON.stringify(step.output, null, 2) : step.output
                                                        }</div>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

