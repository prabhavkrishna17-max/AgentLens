import { X, Code2, AlignLeft, Sparkles } from 'lucide-react';
import { useTraceStore } from '../../stores/traceStore';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function NodeInspector({ steps }: { steps: any[] }) {
  const { selectedNodeId, setSelectedNodeId } = useTraceStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [viewMode, setViewMode] = useState<'human' | 'raw'>('human');

  const step = steps?.find((s) => s.id === selectedNodeId);

  // Reset tab when node changes
  useEffect(() => {
    setActiveTab('overview');
    setViewMode('human');
  }, [selectedNodeId]);

  if (!step) return null;

  const tabs = ['overview', 'input', 'output', 'metadata'];
  if (step.error) tabs.push('error');

  const isLLM = step.type?.toUpperCase() === 'LLM';

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-accent/10 p-4 rounded-lg border border-border">
          <div className="text-xs text-muted-foreground uppercase font-mono mb-1">Status</div>
          <div className={`font-semibold text-xs font-mono ${
            step.status === 'success' || step.status === 'completed' ? 'text-emerald-400' :
            step.status === 'failed' ? 'text-rose-400' : 'text-primary'
          }`}>
            {(step.status === 'completed' ? 'SUCCESS' : (step.status || 'PENDING')).toUpperCase()}
          </div>
        </div>
        <div className="bg-accent/10 p-4 rounded-lg border border-border">
          <div className="text-xs text-muted-foreground uppercase font-mono mb-1">Duration</div>
          <div className="font-semibold font-mono">{step.duration?.toFixed(2)}s</div>
        </div>
      </div>
      
      {step.status === 'failed' && (
        <div className="bg-destructive/10 border border-destructive/30 p-4 rounded-lg">
          <div className="text-xs text-destructive uppercase font-mono mb-2">Failure Summary</div>
          <div className="text-sm text-destructive">{step.error?.message || 'Execution failed during this step.'}</div>
        </div>
      )}

      {isLLM && step.metadata && (
        <div className="bg-accent/10 border border-border p-5 rounded-lg space-y-4">
          <h4 className="text-sm font-semibold border-b border-border pb-2">AI Execution Context</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-muted-foreground font-mono uppercase mb-1">Provider</div>
              <div className="font-semibold capitalize">{step.metadata.provider || '-'}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-mono uppercase mb-1">Model</div>
              <div className="font-semibold">{step.metadata.model || '-'}</div>
            </div>
          </div>
          {step.metadata.token_usage && (
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/30">
              <div>
                <div className="text-[10px] text-muted-foreground font-mono uppercase">Prompt</div>
                <div className="font-mono text-sm">{step.metadata.token_usage.prompt_tokens}</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground font-mono uppercase">Completion</div>
                <div className="font-mono text-sm">{step.metadata.token_usage.completion_tokens}</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground font-mono uppercase">Total</div>
                <div className="font-mono text-sm font-semibold">{step.metadata.token_usage.total_tokens}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderData = (data: any, label: string) => {
    if (!data) return <div className="text-muted-foreground text-sm italic p-4">No {label.toLowerCase()} available.</div>;
    
    if (viewMode === 'raw') {
      return (
        <div className="bg-black text-white p-4 rounded-lg font-mono text-xs overflow-x-auto shadow-inner border border-white/10">
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      );
    }

    // Human readable
    if (typeof data === 'string') {
      return <div className="text-sm leading-relaxed whitespace-pre-wrap p-4 bg-accent/5 border border-border rounded-lg">{data}</div>;
    }
    
    // For LLM input specifically, if it's messages
    if (label === 'Input' && isLLM && data.messages) {
       return (
         <div className="space-y-4">
           {data.messages.map((m: any, i: number) => (
             <div key={i} className="bg-accent/10 border border-border rounded-lg p-4">
               <div className="text-xs uppercase font-mono text-muted-foreground mb-2">{m.role}</div>
               <div className="text-sm whitespace-pre-wrap">{typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}</div>
             </div>
           ))}
         </div>
       )
    }

    // Generic object human-readable
    return (
      <div className="space-y-3">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="border-b border-border/50 pb-3 last:border-0">
            <div className="text-xs font-mono text-muted-foreground uppercase mb-1">{key}</div>
            <div className="text-sm whitespace-pre-wrap">
              {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderError = () => {
    if (!step.error) return null;
    return (
      <div className="space-y-4">
        <div className="bg-destructive/10 border border-destructive/30 p-4 rounded-lg">
          <div className="font-semibold text-destructive mb-2">Error Message</div>
          <div className="text-sm text-destructive whitespace-pre-wrap">{step.error.message || String(step.error)}</div>
        </div>
        {step.error.stacktrace && (
          <div className="bg-black text-red-400 p-4 rounded-lg font-mono text-xs overflow-x-auto shadow-inner border border-red-500/20">
            <pre>{step.error.stacktrace}</pre>
          </div>
        )}
      </div>
    );
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="absolute top-0 right-0 h-full w-full md:w-[450px] bg-background/95 backdrop-blur-md border-l border-border shadow-2xl flex flex-col z-50 overflow-hidden"
      >
        <div className="p-6 pb-4 border-b border-border shrink-0">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="text-xs font-mono uppercase text-muted-foreground mb-1 tracking-wider">{step.type}</div>
              <h2 className="text-xl font-bold tracking-tight">{step.name}</h2>
            </div>
            <button 
              onClick={() => setSelectedNodeId(null)}
              className="p-2 hover:bg-accent rounded-full transition-colors text-muted-foreground bg-accent/50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex gap-2 overflow-x-auto mt-6 hide-scrollbar">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded-full transition-colors whitespace-nowrap ${
                  activeTab === tab ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 relative">
          {(activeTab === 'input' || activeTab === 'output' || activeTab === 'metadata') && (
            <div className="flex justify-end mb-4">
              <div className="flex bg-accent/20 p-1 rounded-md border border-border">
                <button 
                  onClick={() => setViewMode('human')} 
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs font-mono rounded transition-colors ${viewMode === 'human' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <AlignLeft className="w-3 h-3" /> Human
                </button>
                <button 
                  onClick={() => setViewMode('raw')} 
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs font-mono rounded transition-colors ${viewMode === 'raw' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <Code2 className="w-3 h-3" /> Raw JSON
                </button>
              </div>
            </div>
          )}

          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'input' && renderData(step.input, 'Input')}
          {activeTab === 'output' && renderData(step.output, 'Output')}
          {activeTab === 'metadata' && renderData(step.metadata, 'Metadata')}
          {activeTab === 'error' && renderError()}
        </div>

        {isLLM && step.input && (
          <div className="p-6 border-t border-border shrink-0 bg-accent/5">
            <Link 
              to={`/app/prompt-lab?step=${step.id}`} 
              className="flex flex-col items-center justify-center w-full py-3 bg-foreground text-background hover:bg-foreground/90 rounded-lg text-sm font-semibold transition-transform active:scale-95 shadow-lg shadow-foreground/10"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Refine Prompt
              </div>
            </Link>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
