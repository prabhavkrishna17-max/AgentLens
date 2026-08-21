import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Copy, Loader2, Key, TerminalSquare, Rocket } from 'lucide-react';
import LightTunnel from '../../components/LightTunnel';
import { useAuthStore } from '../../stores/authStore';
import { apiFetch } from '@/lib/api';

export default function Onboarding() {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [projectId, setProjectId] = useState<string | null>(null);
  const { temporaryApiKey, setTemporaryApiKey } = useAuthStore();
  const [copied, setCopied] = useState(false);

  // Queries
  const { data: runsData } = useQuery({
    queryKey: ['runs'],
    queryFn: async () => {
      const res = await apiFetch('/api/runs?limit=1');
      if (!res.ok) throw new Error('Network error');
      return res.json();
    },
    refetchInterval: step === 3 ? 2000 : false, // Poll only on step 3
  });
  
  const runs = runsData?.items || [];

  useEffect(() => {
    // If runs appear, we automatically unlock the dashboard
    if (runs && runs.length > 0 && step === 3) {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    }
  }, [runs, step, queryClient]);

  // Mutations
  const createProject = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiFetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, environment: 'development' })
      });
      return res.json();
    },
    onSuccess: (data) => {
      setProjectId(data.id);
      setStep(2);
    }
  });

  const generateKey = useMutation({
    mutationFn: async (pId: string) => {
      const res = await apiFetch(`/api/projects/${pId}/keys`, {
        method: 'POST'
      });
      return res.json();
    },
    onSuccess: (data) => {
      setTemporaryApiKey(data.api_key);
      setStep(3);
    }
  });

  const copyToClipboard = () => {
    if (temporaryApiKey) {
      navigator.clipboard.writeText(temporaryApiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Background Effect */}
      <div className="absolute inset-0 z-0">
        <LightTunnel 
          cableColor="#FFFFFF"
          pulseColor="#CCCCCC"
          tunnelColor="#000000"
          tunnelOpacity={0.1}
          speed={0.1}
          flowDirection="inward"
          pulseSpeed={2}
          pulseLength={0.28}
          pulseBlend={1}
          pulseWidth={1}
          cableCount={30}
          thickness={0.35}
          rimWidth={0.15}
          waviness={0.3}
          sway={0.5}
          size={1.0}
          centerX={0.0}
          centerY={0.0}
          glow={0.5}
          fadeNear={0.5}
          fadeFar={2}
          brightness={1.0}
          colorVariance={true}
          grain={true}
          grainIntensity={0.05}
          opacity={0.8}
          mouseInteraction={true}
          mouseStrength={0.1}
        />
      </div>

      <div className="max-w-2xl w-full relative z-10 bg-background/80 backdrop-blur-md border border-border/50 p-10 rounded-3xl shadow-2xl">
        <h1 className="text-4xl font-bold tracking-tight mb-2">Welcome to AgentLens</h1>
        <p className="text-muted-foreground font-mono text-sm mb-12">Let's connect your first AI agent.</p>

        <div className="space-y-8 relative border-l border-border pl-8 ml-4">
          
          {/* Step 1: Create Project */}
          <div className={`relative transition-opacity duration-300 ${step < 1 ? 'opacity-50' : 'opacity-100'}`}>
            <div className={`absolute -left-[41px] top-1 h-4 w-4 rounded-full border-2 ${step > 1 ? 'bg-primary border-primary' : 'bg-white border-primary'}`} />
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <TerminalSquare className="w-5 h-5" /> Create a Project
            </h2>
            {step === 1 ? (
              <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); createProject.mutate(fd.get('name') as string); }} className="flex gap-4">
                <input 
                  name="name" 
                  placeholder="e.g. Support Bot" 
                  className="flex-1 bg-accent/30 border border-border rounded-md px-4 py-2 outline-none focus:border-primary transition-colors"
                  required
                />
                <button 
                  type="submit" 
                  disabled={createProject.isPending}
                  className="bg-primary text-primary-foreground px-6 py-2 rounded-md font-medium hover:bg-primary/90 flex items-center justify-center min-w-[120px]"
                >
                  {createProject.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
                </button>
              </form>
            ) : (
              <div className="text-muted-foreground font-mono bg-accent/30 px-4 py-2 rounded-md border border-border inline-block">Project Created</div>
            )}
          </div>

          {/* Step 2: Generate API Key */}
          <div className={`relative transition-opacity duration-300 ${step < 2 ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
            <div className={`absolute -left-[41px] top-1 h-4 w-4 rounded-full border-2 ${step > 2 ? 'bg-primary border-primary' : 'bg-white border-border'}`} />
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Key className="w-5 h-5" /> Generate API Key
            </h2>
            {step === 2 && projectId ? (
              <button 
                onClick={() => generateKey.mutate(projectId)}
                disabled={generateKey.isPending}
                className="bg-primary text-primary-foreground px-6 py-2 rounded-md font-medium hover:bg-primary/90 flex items-center gap-2"
              >
                {generateKey.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generate Secret Key'}
              </button>
            ) : step > 2 ? (
              <div className="space-y-4">
                <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-700 px-4 py-3 rounded-md text-sm">
                  This key will only be shown once. Please copy it now.
                </div>
                <div className="flex items-center gap-2 bg-accent/30 border border-border rounded-md p-2">
                  <code className="flex-1 px-2 font-mono text-sm">{temporaryApiKey}</code>
                  <button 
                    onClick={copyToClipboard}
                    className="p-2 hover:bg-accent rounded-md transition-colors text-muted-foreground hover:text-primary"
                    title="Copy API Key"
                  >
                    {copied ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {/* Step 3: Install SDK & Listen */}
          <div className={`relative transition-opacity duration-300 ${step < 3 ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
            <div className={`absolute -left-[41px] top-1 h-4 w-4 rounded-full border-2 ${runs && runs.length > 0 ? 'bg-primary border-primary' : 'bg-white border-border'}`} />
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Rocket className="w-5 h-5" /> Instrument Your Agent
            </h2>
            
            <AnimatePresence>
              {step === 3 && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-6"
                >
                  <div className="bg-black text-white p-6 rounded-lg font-mono text-sm overflow-x-auto shadow-2xl">
                    <div className="text-gray-400 mb-4"># 1. Install the SDK</div>
                    <div className="text-green-400 mb-8">pip install agentlens</div>
                    
                    <div className="text-gray-400 mb-4"># 2. Add to your Python agent</div>
                    <div><span className="text-pink-400">from</span> agentlens <span className="text-pink-400">import</span> AgentLens</div>
                    <br/>
                    <div>lens = AgentLens(api_key=<span className="text-yellow-300">"{temporaryApiKey}"</span>)</div>
                    <br/>
                    <div><span className="text-pink-400">with</span> lens.run(<span className="text-yellow-300">"my-agent-task"</span>) <span className="text-pink-400">as</span> run:</div>
                    <div className="pl-4"><span className="text-pink-400">with</span> run.step(<span className="text-yellow-300">"Planning"</span>, <span className="text-yellow-300">"Planner"</span>):</div>
                    <div className="pl-8 text-gray-400"># Your agent logic here</div>
                    <div className="pl-8">pass</div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-accent/30 border border-border rounded-lg text-muted-foreground animate-pulse">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <span>Listening for your first execution...</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>
      </div>
    </div>
  );
}
