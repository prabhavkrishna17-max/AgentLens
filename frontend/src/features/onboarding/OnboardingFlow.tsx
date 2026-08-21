import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Copy, Cpu, Layers, Terminal } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

export default function OnboardingFlow() {
  const [step, setStep] = useState(1);
  const [projectName, setProjectName] = useState('');
  const [projectId, setProjectId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [activeTab, setActiveTab] = useState('python');
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const navigate = useNavigate();

  // Create project API
  const handleCreateProject = async () => {
    if (!projectName.trim()) return;
    try {
      const res = await apiFetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: projectName, environment: 'development' })
      });
      if (res.ok) {
        const data = await res.json();
        setProjectId(data.id);
        
        // Generate API key immediately
        const keyRes = await apiFetch(`/api/projects/${data.id}/keys`, {
          method: 'POST'
        });
        if (keyRes.ok) {
          const keyData = await keyRes.json();
          setApiKey(keyData.api_key);
          setStep(2);
        }
      }
    } catch (e) {
      console.error("Failed to create project", e);
    }
  };

  // Poll for first run
  const { data: runsData } = useQuery({
    queryKey: ['runs', projectId, 'latest-one'],
    queryFn: async () => {
      const res = await apiFetch(`/api/runs?project_id=${projectId}&limit=1`);
      if (!res.ok) throw new Error('Network error');
      return res.json();
    },
    enabled: !!projectId && step === 2,
    refetchInterval: 2000
  });

  useEffect(() => {
    if (runsData?.items && runsData.items.length > 0) {
      setStep(3);
      setTimeout(() => {
        window.location.href = '/app';
      }, 3000);
    }
  }, [runsData, navigate]);

  const copyToClipboard = (text: string, setter: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  const tabs = [
    { id: 'python', name: 'Python SDK', icon: <Terminal className="w-4 h-4" /> },
    { id: 'openai', name: 'OpenAI', icon: <Cpu className="w-4 h-4" /> },
    { id: 'anthropic', name: 'Claude', icon: <Layers className="w-4 h-4" /> },
    { id: 'gemini', name: 'Gemini', icon: <Cpu className="w-4 h-4" /> },
  ];

  const snippets = {
    python: `pip install agentlens\n\nfrom agentlens_sdk import AgentLens\nlens = AgentLens(api_key="${apiKey}")\n\nwith lens.run(agent_name="MyAgent", task="Task"):\n    pass`,
    openai: `from agentlens_sdk import AgentLens, instrument_openai\nfrom openai import OpenAI\n\nlens = AgentLens(api_key="${apiKey}")\ninstrument_openai(lens)\n\nclient = OpenAI()\nwith lens.run(agent_name="OpenAIAgent", task="Chat"):\n    client.chat.completions.create(model="gpt-4o", messages=[{"role": "user", "content": "Hello"}])`,
    anthropic: `from agentlens_sdk import AgentLens, instrument_anthropic\nfrom anthropic import Anthropic\n\nlens = AgentLens(api_key="${apiKey}")\ninstrument_anthropic(lens)\n\nclient = Anthropic()\nwith lens.run(agent_name="ClaudeAgent", task="Chat"):\n    client.messages.create(model="claude-3-opus-20240229", max_tokens=1000, messages=[{"role": "user", "content": "Hello"}])`,
    gemini: `from agentlens_sdk import AgentLens, instrument_gemini\nimport google.generativeai as genai\n\nlens = AgentLens(api_key="${apiKey}")\ninstrument_gemini(lens)\n\nmodel = genai.GenerativeModel('gemini-1.5-pro')\nwith lens.run(agent_name="GeminiAgent", task="Chat"):\n    model.generate_content("Hello")`,
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 w-full h-1 bg-accent/20">
        <motion.div 
          className="h-full bg-primary" 
          initial={{ width: '0%' }}
          animate={{ width: `${(step / 3) * 100}%` }}
        />
      </div>

      <div className="w-full max-w-2xl">
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-bold mb-2 tracking-tight">Agent<span className="text-primary">Lens</span></h1>
          <p className="text-muted-foreground font-mono text-sm">Observability for AI Agents</p>
        </div>

        {step === 1 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-accent/10 border border-border p-8 rounded-xl shadow-2xl">
            <h2 className="text-xl font-semibold mb-6">Create your first project</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-mono text-muted-foreground mb-2">Project Name</label>
                <input 
                  type="text" 
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. Customer Support Agent"
                  className="w-full bg-background border border-border rounded-md px-4 py-3 outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                />
              </div>
              <button 
                onClick={handleCreateProject}
                disabled={!projectName.trim()}
                className="w-full py-3 bg-primary text-primary-foreground font-medium rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                Create Project & Get API Key
              </button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-accent/10 border border-border rounded-xl shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-border">
              <h2 className="text-xl font-semibold mb-2">Connect your agent</h2>
              <p className="text-muted-foreground text-sm">Install the SDK and add the snippet to your agent's code.</p>
              
              <div className="mt-6 flex items-center gap-2">
                <input 
                  type="text" 
                  value={apiKey} 
                  readOnly 
                  className="bg-background border border-border rounded-md px-3 py-2 text-sm font-mono flex-1 outline-none"
                />
                <button 
                  onClick={() => copyToClipboard(apiKey, setCopiedKey)}
                  className="p-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  {copiedKey ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-yellow-500 font-mono mt-2">Save this key now. It won't be shown again.</p>
            </div>

            <div className="bg-black/50 p-6">
              <div className="flex overflow-x-auto gap-2 mb-4">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 text-xs font-mono rounded-md transition-colors ${activeTab === tab.id ? 'bg-primary/20 text-primary border border-primary/30' : 'text-muted-foreground hover:bg-white/5 border border-transparent'}`}
                  >
                    {tab.icon} {tab.name}
                  </button>
                ))}
              </div>
              <div className="relative group">
                <button 
                  onClick={() => copyToClipboard(snippets[activeTab as keyof typeof snippets], setCopiedCode)}
                  className="absolute top-2 right-2 p-1.5 bg-white/10 hover:bg-white/20 rounded-md transition-colors text-xs font-mono flex items-center gap-1 opacity-0 group-hover:opacity-100"
                >
                  {copiedCode ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-white" />}
                </button>
                <pre className="text-xs font-mono p-4 rounded-md bg-black border border-white/10 text-gray-300 overflow-x-auto">
                  <code>{snippets[activeTab as keyof typeof snippets]}</code>
                </pre>
              </div>
            </div>

            <div className="p-6 bg-accent/20 border-t border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse"></div>
                <span className="text-sm font-mono text-muted-foreground">Waiting for first execution...</span>
              </div>
              <button onClick={() => { window.location.href = '/app' }} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">Skip for now</button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-green-500/10 border border-green-500/30 p-12 rounded-xl shadow-2xl text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
              <Check className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-semibold mb-2 text-green-400">Connection Successful!</h2>
            <p className="text-muted-foreground">We've received your first execution. Redirecting to dashboard...</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
