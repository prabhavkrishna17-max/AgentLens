import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Home, History, FlaskConical, Activity, Settings2, Command, FileText } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

export default function CommandPalette() {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    // Toggle on Cmd+K or Ctrl+K
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(open => !open);
            }
            
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setSearch('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 10);
        }
    }, [isOpen]);

    // Active project
    const { data: projects } = useQuery({
        queryKey: ['projects'],
        queryFn: async () => {
            const res = await apiFetch('/api/projects');
            if (!res.ok) throw new Error('Network error');
            return res.json();
        }
    });
    const activeProjectId = projects?.[0]?.id;

    // Search runs
    const { data: searchResults } = useQuery({
        queryKey: ['search', search, activeProjectId],
        queryFn: async () => {
            if (!search) return { runs: [] };
            const res = await apiFetch(`/api/search?q=${encodeURIComponent(search)}`);
            if (!res.ok) throw new Error('Network error');
            return res.json();
        },
        enabled: isOpen && search.length > 0 && !!activeProjectId
    });

    const staticCommands = [
        { id: 'dash', title: 'Go to Dashboard', icon: <Home className="w-4 h-4" />, action: () => navigate('/app') },
        { id: 'hist', title: 'Go to History', icon: <History className="w-4 h-4" />, action: () => navigate('/app/traces') },
        { id: 'prompt', title: 'Open Prompt Lab', icon: <FlaskConical className="w-4 h-4" />, action: () => navigate('/app/prompt-lab') },
        { id: 'comp', title: 'Compare Runs', icon: <Activity className="w-4 h-4" />, action: () => navigate('/app/compare') },
        { id: 'set', title: 'Settings', icon: <Settings2 className="w-4 h-4" />, action: () => navigate('/app/settings') },
    ];

    const filteredStatic = staticCommands.filter(cmd => 
        cmd.title.toLowerCase().includes(search.toLowerCase())
    );

    const runResults = (searchResults?.runs || []).map((r: any) => ({
        id: `run-${r.id}`,
        title: `Run: ${r.task}`,
        subtitle: r.id,
        icon: <FileText className="w-4 h-4" />,
        action: () => navigate(`/app/trace/${r.id}`)
    }));

    const allResults = [...filteredStatic, ...runResults];

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(i => Math.min(i + 1, allResults.length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(i => Math.max(i - 1, 0));
            } else if (e.key === 'Enter' && allResults[selectedIndex]) {
                e.preventDefault();
                allResults[selectedIndex].action();
                setIsOpen(false);
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, selectedIndex, allResults]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-background/80 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
            <div 
                className="w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center px-4 border-b border-border">
                    <Search className="w-5 h-5 text-muted-foreground" />
                    <input 
                        ref={inputRef}
                        type="text" 
                        value={search}
                        onChange={e => {
                            setSearch(e.target.value);
                            setSelectedIndex(0);
                        }}
                        placeholder="Type a command or search runs..."
                        className="w-full bg-transparent border-none px-4 py-4 outline-none font-mono text-sm"
                    />
                    <kbd className="hidden sm:inline-flex items-center gap-1 bg-accent/50 border border-border px-2 py-1 rounded text-[10px] font-mono text-muted-foreground uppercase">
                        ESC
                    </kbd>
                </div>
                
                <div className="max-h-[60vh] overflow-y-auto p-2">
                    {allResults.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground font-mono text-sm">
                            No results found.
                        </div>
                    ) : (
                        <div className="flex flex-col gap-1">
                            {allResults.map((result, i) => (
                                <button
                                    key={result.id}
                                    onClick={() => {
                                        result.action();
                                        setIsOpen(false);
                                    }}
                                    onMouseEnter={() => setSelectedIndex(i)}
                                    className={`flex flex-col items-start w-full px-4 py-3 rounded-lg text-left transition-colors ${
                                        selectedIndex === i ? 'bg-primary/10 text-primary' : 'hover:bg-accent/50 text-foreground'
                                    }`}
                                >
                                    <div className="flex items-center gap-3 w-full">
                                        <div className={`p-1.5 rounded-md ${selectedIndex === i ? 'bg-primary/20 text-primary' : 'bg-accent text-muted-foreground'}`}>
                                            {result.icon}
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <div className="font-semibold text-sm truncate">{result.title}</div>
                                            {result.subtitle && (
                                                <div className="text-[10px] font-mono text-muted-foreground truncate mt-0.5">{result.subtitle}</div>
                                            )}
                                        </div>
                                        {selectedIndex === i && (
                                            <kbd className="hidden sm:inline-flex bg-background border border-primary/20 px-2 py-0.5 rounded text-[10px] font-mono text-primary uppercase ml-2">
                                                ↵ Enter
                                            </kbd>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                
                <div className="bg-accent/30 border-t border-border px-4 py-2 flex items-center gap-4 text-[10px] font-mono text-muted-foreground uppercase">
                    <span className="flex items-center gap-1"><Command className="w-3 h-3" /> Navigation</span>
                    <span className="flex items-center gap-1">↑↓ Select</span>
                    <span className="flex items-center gap-1">↵ Execute</span>
                </div>
            </div>
        </div>
    );
}
