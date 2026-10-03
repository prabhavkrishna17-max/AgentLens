import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Copy, CheckCircle2, Terminal, Code2, Layers, Cpu } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { apiFetch, API_BASE_URL } from '@/lib/api';

export default function IntegratePage() {
  const [activeTab, setActiveTab] = useState('python');
  const { temporaryApiKey } = useAuthStore();
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Fetch active project to get the API key
  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await apiFetch('/api/projects');
      if (!res.ok) throw new Error('Network error');
      return res.json();
    },
  });

  const project = projects?.[0];
  const apiKey = temporaryApiKey || 'YOUR_API_KEY';
  const displayBaseUrl = API_BASE_URL || window.location.origin;

  // Fetch recent runs to see if connected
  const { data: runsData } = useQuery({
    queryKey: ['runs', project?.id, 'latest-one'],
    queryFn: async () => {
      const res = await apiFetch(`/api/runs?project_id=${project?.id}&limit=1`);
      if (!res.ok) throw new Error('Network error');
      return res.json();
    },
    enabled: !!project?.id,
    refetchInterval: 3000
  });

  const isConnected = runsData?.items && runsData.items.length > 0;
  const lastRun = isConnected ? runsData.items[0] : null;

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
    { id: 'generic', name: 'Generic', icon: <Code2 className="w-4 h-4" /> },
  ];

  const snippets = {
    python: `# Install locally (until published to PyPI):
# pip install -e ./backend

from agentlens_sdk import AgentLens

lens = AgentLens(
    api_key="${apiKey}",
    base_url="${displayBaseUrl}"
)

@lens.tool("search_db")
def search_db(query):
    return "results"

with lens.run(agent_name="MyAgent", task="Example Task"):
    # Everything inside this context is tracked!
    search_db("hello world")`,
    
    openai: `from agentlens_sdk import AgentLens, instrument_openai
from openai import OpenAI

lens = AgentLens(api_key="${apiKey}", base_url="${displayBaseUrl}")
instrument_openai(lens) # Opt-in monkey patching

client = OpenAI()

with lens.run(agent_name="OpenAIAgent", task="Chat"):
    # This call is automatically captured with tokens and prompt!
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": "Hello"}]
    )`,
    
    anthropic: `from agentlens_sdk import AgentLens, instrument_anthropic
from anthropic import Anthropic

lens = AgentLens(api_key="${apiKey}", base_url="${displayBaseUrl}")
instrument_anthropic(lens)

client = Anthropic()

with lens.run(agent_name="ClaudeAgent", task="Chat"):
    response = client.messages.create(
        model="claude-3-opus-20240229",
        max_tokens=1000,
        messages=[{"role": "user", "content": "Hello"}]
    )`,
    
    gemini: `from agentlens_sdk import AgentLens, instrument_gemini
import google.generativeai as genai

lens = AgentLens(api_key="${apiKey}", base_url="${displayBaseUrl}")
instrument_gemini(lens)

genai.configure(api_key="GOOGLE_API_KEY")
model = genai.GenerativeModel('gemini-1.5-pro')

with lens.run(agent_name="GeminiAgent", task="Chat"):
    response = model.generate_content("Hello")`,

    generic: `from agentlens_sdk import AgentLens

lens = AgentLens(api_key="${apiKey}", base_url="${displayBaseUrl}")

with lens.run(agent_name="CustomAgent", task="Task") as run:
    
    with run.llm(name="MyCustomModel", metadata={"model": "llama-3"}):
        # Do custom LLM call
        pass
        
    with run.retrieval(name="VectorSearch"):
        # Do custom retrieval
        pass`
  };

  return (
    <div className="relative min-h-full overflow-hidden">
      <div className="relative z-10 p-8 max-w-5xl mx-auto w-full bg-background/80 backdrop-blur-sm mt-8 rounded-2xl border border-border/50 shadow-2xl">
        <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Connect your agent</h1>
        <p className="text-muted-foreground font-mono text-sm">Install AgentLens and start capturing real executions.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className="border border-border bg-accent/10 rounded-xl overflow-hidden">
            <div className="flex border-b border-border bg-accent/20 overflow-x-auto">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-mono transition-colors border-b-2 whitespace-nowrap ${activeTab === tab.id ? 'border-primary text-primary bg-background' : 'border-transparent text-muted-foreground hover:bg-accent/50'}`}
                >
                  {tab.icon} {tab.name}
                </button>
              ))}
            </div>
            <div className="p-4 relative bg-black text-white">
              <button 
                onClick={() => copyToClipboard(snippets[activeTab as keyof typeof snippets], setCopiedCode)}
                className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-md transition-colors text-xs font-mono flex items-center gap-2"
              >
                {copiedCode ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                {copiedCode ? 'Copied' : 'Copy'}
              </button>
              <pre className="text-sm font-mono overflow-x-auto p-2 text-gray-300">
                <code>{snippets[activeTab as keyof typeof snippets]}</code>
              </pre>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="border border-border bg-accent/10 rounded-xl p-6">
            <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider font-mono">Connection Status</h3>
            
            <div className="flex items-center gap-3 mb-6 p-4 rounded-lg bg-background border border-border">
              <div className="relative">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                {isConnected && <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-50"></div>}
              </div>
              <div>
                <div className="font-semibold">{isConnected ? 'Connected' : 'Waiting for connection'}</div>
                <div className="text-xs text-muted-foreground font-mono">
                  {isConnected ? 'AgentLens API active' : 'Run your agent to connect'}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-xs text-muted-foreground uppercase font-mono mb-1">Project</div>
                <div className="font-semibold">{project?.name || 'Loading...'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase font-mono mb-1">Environment</div>
                <div className="font-semibold capitalize">{project?.environment || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase font-mono mb-1">Last Execution</div>
                <div className="font-mono text-sm">
                  {lastRun ? new Date(lastRun.started_at).toLocaleString() : 'Never'}
                </div>
              </div>
            </div>
          </div>

          <div className="border border-border bg-accent/10 rounded-xl p-6">
            <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider font-mono">API Key</h3>
            
            {!temporaryApiKey && (
              <div className="mb-4 bg-yellow-500/10 border border-yellow-500/30 text-yellow-700 px-3 py-2 rounded-md text-xs font-mono">
                For security, the full API key is only shown once when it is created. If you lost it, generate a new one in Settings.
              </div>
            )}

            <div className="flex items-center gap-2">
              <input 
                type={temporaryApiKey ? "text" : "password"} 
                value={apiKey} 
                readOnly 
                className="bg-background border border-border rounded-md px-3 py-2 text-sm font-mono flex-1 outline-none"
              />
              <button 
                onClick={() => copyToClipboard(apiKey, setCopiedKey)}
                className="p-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                title="Copy API Key"
              >
                {copiedKey ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
