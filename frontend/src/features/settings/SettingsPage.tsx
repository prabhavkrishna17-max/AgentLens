import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Key, ShieldAlert, Plus, CheckCircle2, Copy, Settings2 } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { apiFetch } from '@/lib/api';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { temporaryApiKey, setTemporaryApiKey } = useAuthStore();
  const [copied, setCopied] = useState(false);

  // Form State
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [environment, setEnvironment] = useState('development');
  const [captureInputs, setCaptureInputs] = useState(true);
  const [captureOutputs, setCaptureOutputs] = useState(true);
  const [captureErrors, setCaptureErrors] = useState(true);

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await apiFetch('/api/projects');
      if (!res.ok) throw new Error('Network error');
      return res.json();
    },
  });
  
  const activeProjectId = projects?.[0]?.id;
  const project = projects?.[0];

  useEffect(() => {
    if (project) {
        setProjectName(project.name || '');
        setProjectDesc(project.description || '');
        setEnvironment(project.environment || 'development');
        setCaptureInputs(project.capture_inputs ?? true);
        setCaptureOutputs(project.capture_outputs ?? true);
        setCaptureErrors(project.capture_errors ?? true);
    }
  }, [project]);

  const { data: apiKeys } = useQuery({
    queryKey: ['apiKeys', activeProjectId],
    queryFn: async () => {
      const res = await apiFetch(`/api/projects/${activeProjectId}/keys`);
      if (!res.ok) throw new Error('Network error');
      return res.json();
    },
    enabled: !!activeProjectId,
  });

  const generateKey = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/api/projects/${activeProjectId}/keys`, { method: 'POST' });
      return res.json();
    },
    onSuccess: (data) => {
      setTemporaryApiKey(data.api_key);
      queryClient.invalidateQueries({ queryKey: ['apiKeys', activeProjectId] });
    }
  });

  const revokeKey = useMutation({
    mutationFn: async (keyId: string) => {
      await apiFetch(`/api/projects/${activeProjectId}/keys/${keyId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys', activeProjectId] });
    }
  });

  const updateProject = useMutation({
      mutationFn: async () => {
          const res = await apiFetch(`/api/projects/${activeProjectId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  name: projectName,
                  description: projectDesc,
                  environment,
                  capture_inputs: captureInputs,
                  capture_outputs: captureOutputs,
                  capture_errors: captureErrors
              })
          });
          if (!res.ok) throw new Error('Failed to update project');
          return res.json();
      },
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['projects'] });
      }
  });

  const copyToClipboard = () => {
    if (temporaryApiKey) {
      navigator.clipboard.writeText(temporaryApiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const deleteProject = useMutation({
      mutationFn: async () => {
          const res = await apiFetch(`/api/projects/${activeProjectId}`, { method: 'DELETE' });
          if (!res.ok) throw new Error('Failed to delete project');
      },
      onSuccess: () => {
          window.location.href = '/';
      }
  });

  if (!project) return null;

  return (
    <div className="p-8 max-w-4xl mx-auto w-full">
      <h2 className="text-3xl font-bold mb-2">Settings</h2>
      <p className="text-muted-foreground font-mono text-sm mb-12">Manage your project and security configurations.</p>
      
      {/* Project Settings */}
      <div className="mb-12">
        <h3 className="text-lg font-semibold mb-4 border-b border-border pb-2 flex items-center gap-2">
            <Settings2 className="w-5 h-5" /> Project Details
        </h3>
        <div className="grid gap-6">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Project Name</label>
            <input 
              type="text" 
              value={projectName} 
              onChange={e => setProjectName(e.target.value)}
              className="w-full bg-accent/30 border border-border rounded-md px-4 py-2 font-mono outline-none focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Description</label>
            <textarea 
              value={projectDesc} 
              onChange={e => setProjectDesc(e.target.value)}
              className="w-full bg-accent/30 border border-border rounded-md px-4 py-2 font-mono text-sm outline-none focus:border-primary transition-colors h-24"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Environment</label>
            <select 
              value={environment}
              onChange={e => setEnvironment(e.target.value)}
              className="w-full bg-accent/30 border border-border rounded-md px-4 py-2 font-mono text-sm outline-none focus:border-primary transition-colors"
            >
                <option value="development">Development</option>
                <option value="staging">Staging</option>
                <option value="production">Production</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Data Capture */}
      <div className="mb-12">
        <h3 className="text-lg font-semibold mb-4 border-b border-border pb-2">Data Capture</h3>
        <p className="text-sm text-yellow-500/80 mb-6 bg-yellow-500/10 p-3 rounded-md border border-yellow-500/20 font-mono">
            ⚠️ Captured payloads may contain sensitive information. Do not pretend this is enterprise-grade secret detection yet.
        </p>
        
        <div className="flex flex-col gap-4">
            <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={captureInputs} onChange={e => setCaptureInputs(e.target.checked)} className="accent-primary w-4 h-4" />
                <span className="text-sm font-mono text-foreground">Capture Inputs</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={captureOutputs} onChange={e => setCaptureOutputs(e.target.checked)} className="accent-primary w-4 h-4" />
                <span className="text-sm font-mono text-foreground">Capture Outputs</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={captureErrors} onChange={e => setCaptureErrors(e.target.checked)} className="accent-primary w-4 h-4" />
                <span className="text-sm font-mono text-foreground">Capture Errors</span>
            </label>
        </div>
        
        <button 
            onClick={() => updateProject.mutate()}
            disabled={updateProject.isPending}
            className="mt-8 bg-primary text-primary-foreground px-6 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
            {updateProject.isPending ? 'Saving...' : updateProject.isSuccess ? 'Saved successfully!' : 'Save Changes'}
            {updateProject.isSuccess && <CheckCircle2 className="w-4 h-4" />}
        </button>
        {updateProject.isError && <div className="text-destructive text-sm mt-2 font-mono">Failed to save settings.</div>}
      </div>

      {/* API Keys */}
      <div className="mb-12">
        <div className="flex items-center justify-between border-b border-border pb-2 mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Key className="w-5 h-5" /> API Keys
          </h3>
          <button 
            onClick={() => generateKey.mutate()}
            disabled={generateKey.isPending}
            className="text-sm bg-primary text-primary-foreground px-4 py-1.5 rounded-md font-medium hover:bg-primary/90 transition-colors flex items-center gap-1"
          >
            <Plus className="w-4 h-4" /> Create Key
          </button>
        </div>

        {temporaryApiKey && (
          <div className="mb-6 bg-green-500/10 border border-green-500/20 p-4 rounded-md">
            <div className="text-sm text-green-600 font-medium mb-2">New API Key generated successfully. Please copy it now, as it will never be shown again.</div>
            <div className="flex items-center gap-2 bg-background border border-border rounded-md p-2">
              <code className="flex-1 px-2 font-mono text-sm">{temporaryApiKey}</code>
              <button 
                onClick={copyToClipboard}
                className="p-2 hover:bg-accent rounded-md transition-colors text-muted-foreground hover:text-primary"
              >
                {copied ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>
        )}

        <div className="bg-accent/20 border border-border rounded-lg overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-accent/50 border-b border-border">
              <tr>
                <th className="px-6 py-3 text-xs uppercase font-mono text-muted-foreground font-semibold">Key Prefix</th>
                <th className="px-6 py-3 text-xs uppercase font-mono text-muted-foreground font-semibold">Created</th>
                <th className="px-6 py-3 text-right text-xs uppercase font-mono text-muted-foreground font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {apiKeys?.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-muted-foreground text-sm font-mono">No active API keys found.</td>
                </tr>
              )}
              {apiKeys?.map((key: any) => (
                <tr key={key.id}>
                  <td className="px-6 py-4 font-mono text-sm">{key.prefix}****************</td>
                  <td className="px-6 py-4 font-mono text-sm text-muted-foreground">{new Date(key.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => {
                        if (confirm('Are you sure you want to revoke this key? Any agents using it will immediately fail to authenticate.')) {
                          revokeKey.mutate(key.id);
                        }
                      }}
                      className="text-destructive hover:bg-destructive/10 px-3 py-1.5 rounded-md text-sm transition-colors"
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Danger Zone */}
      <div>
        <h3 className="text-lg font-semibold mb-4 border-b border-border pb-2 flex items-center gap-2 text-destructive">
          <ShieldAlert className="w-5 h-5" /> Danger Zone
        </h3>
        <div className="border border-destructive/30 bg-destructive/5 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-destructive">Delete Project</div>
              <div className="text-sm text-muted-foreground mt-1">Permanently remove this project and all its execution traces. This action cannot be undone.</div>
            </div>
            <button 
              onClick={() => {
                  if (confirm("Are you ABSOLUTELY sure you want to delete this project? This cannot be undone.")) {
                      deleteProject.mutate();
                  }
              }}
              disabled={deleteProject.isPending}
              className="bg-destructive text-destructive-foreground px-4 py-2 rounded-md font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50"
            >
              {deleteProject.isPending ? 'Deleting...' : 'Delete Project'}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}

