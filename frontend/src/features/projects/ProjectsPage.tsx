import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layers, Plus, Key, Copy, CheckCircle2, Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function ProjectsPage() {
  const queryClient = useQueryClient();
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectEnv, setNewProjectEnv] = useState('development');
  const [isCreating, setIsCreating] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await apiFetch('/api/projects');
      if (!res.ok) throw new Error('Network error');
      return res.json();
    },
  });

  const createProject = useMutation({
    mutationFn: async () => {
      const res = await apiFetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjectName, environment: newProjectEnv })
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsCreating(false);
      setNewProjectName('');
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
      setGeneratedKey(data.api_key);
      // We don't want to show it forever, so maybe we clear it when they leave
    }
  });

  const copyToClipboard = () => {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto w-full flex flex-col h-full overflow-hidden">
      <div className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-end justify-between shrink-0 gap-4">
        <div>
          <h2 className="text-3xl font-bold mb-2">Projects</h2>
          <p className="text-muted-foreground font-mono text-sm">Manage your agent observability projects.</p>
        </div>
        
        <button 
          onClick={() => setIsCreating(true)}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Project
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-4">
        {isCreating && (
          <div className="mb-6 p-4 md:p-6 border border-border bg-accent/20 rounded-xl">
            <h3 className="text-lg font-semibold mb-4">Create New Project</h3>
            <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
              <div className="flex-1">
                <label className="block text-xs font-mono uppercase text-muted-foreground mb-1">Project Name</label>
                <input 
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g. Support Bot"
                  className="w-full bg-accent/30 border border-border rounded-md px-4 py-2 outline-none focus:border-primary transition-colors"
                />
              </div>
              <div className="w-full sm:w-48">
                <label className="block text-xs font-mono uppercase text-muted-foreground mb-1">Environment</label>
                <select 
                  value={newProjectEnv}
                  onChange={(e) => setNewProjectEnv(e.target.value)}
                  className="w-full bg-accent/30 border border-border rounded-md px-4 py-2 outline-none focus:border-primary transition-colors appearance-none"
                >
                  <option value="development">Development</option>
                  <option value="staging">Staging</option>
                  <option value="production">Production</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => createProject.mutate()}
                  disabled={!newProjectName || createProject.isPending}
                  className="bg-primary text-primary-foreground px-6 py-2 rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center min-w-[100px]"
                >
                  {createProject.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground font-mono animate-pulse">Loading projects...</div>
        ) : projects?.length === 0 ? (
          <div className="p-12 border border-border bg-accent/20 rounded-xl flex flex-col items-center justify-center text-center">
            <Layers className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-bold mb-2">No projects yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md">Create your first project to generate an API key and start observing your agents.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {projects?.map((project: any) => (
              <div key={project.id} className="p-4 md:p-6 border border-border bg-accent/10 rounded-xl">
                <div className="flex flex-col sm:flex-row justify-between sm:items-start mb-6 gap-4">
                  <div>
                    <h3 className="text-xl font-bold">{project.name}</h3>
                    <div className="text-sm text-muted-foreground mt-1 font-mono flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-secondary/50 rounded-md text-xs">{project.environment}</span>
                      <span>ID: {project.id}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => generateKey.mutate(project.id)}
                    disabled={generateKey.isPending}
                    className="flex items-center gap-2 px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors text-sm font-medium"
                  >
                    {generateKey.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Key className="w-4 h-4" /> Generate API Key</>}
                  </button>
                </div>

                {/* Show newly generated key if it belongs to this project (simplification: assuming 1 project generated at a time) */}
                {generatedKey && (
                  <div className="mb-6 space-y-4">
                    <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-700 px-4 py-3 rounded-md text-sm font-medium">
                      This key will only be shown once. Please copy it and add it to your agent immediately.
                    </div>
                    <div className="flex items-center gap-2 bg-accent/30 border border-border rounded-md p-2">
                      <code className="flex-1 px-3 font-mono text-sm tracking-tight">{generatedKey}</code>
                      <button 
                        onClick={copyToClipboard}
                        className="p-2 hover:bg-accent rounded-md transition-colors text-muted-foreground hover:text-primary"
                        title="Copy API Key"
                      >
                        {copied ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                      </button>
                    </div>
                    
                    <div className="mt-6 bg-black text-white p-4 sm:p-6 rounded-lg font-mono text-xs sm:text-sm shadow-xl overflow-x-auto whitespace-pre">
                      <div className="text-gray-400 mb-2"># Install SDK</div>
                      <div className="text-green-400 mb-6">pip install agentlens</div>
                      <div className="text-gray-400 mb-2"># Initialize in your agent code</div>
                      <div><span className="text-pink-400">from</span> agentlens <span className="text-pink-400">import</span> AgentLens</div>
                      <br/>
                      <div>lens = AgentLens(api_key=<span className="text-yellow-300">"{generatedKey}"</span>)</div>
                      <br/>
                      <div><span className="text-pink-400">with</span> lens.run(<span className="text-yellow-300">"agent-task"</span>, environment=<span className="text-yellow-300">"{project.environment}"</span>) <span className="text-pink-400">as</span> run:</div>
                      <div className="pl-4"><span className="text-pink-400">with</span> run.step(<span className="text-yellow-300">"Thinking"</span>, <span className="text-yellow-300">"LLM"</span>):</div>
                      <div className="pl-8 text-gray-400"># Your agent logic here</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
