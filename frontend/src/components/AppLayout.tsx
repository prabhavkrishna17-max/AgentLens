import { useState } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  LayoutDashboard, 
  PlayCircle, 
  Layers, 
  ChevronDown, 
  Search, 
  Menu, 
  X,
  FlaskConical,
  GitCompare,
  Code2,
  Settings
} from 'lucide-react';
import CommandPalette from './CommandPalette';
import OfflineBanner from './OfflineBanner';
import { apiFetch } from '@/lib/api';

export default function AppLayout() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await apiFetch('/api/projects');
      if (!res.ok) throw new Error('Network error');
      return res.json();
    },
  });

  const activeProject = projects?.[0];

  // PRIMARY WORKFLOW NAVIGATION
  const primaryNav = [
    { label: 'Dashboard', href: '/app', icon: LayoutDashboard, exact: true, description: 'Observability & health overview' },
    { label: 'Run Agent', href: '/app/agent', icon: PlayCircle, description: 'Execute tasks and stream live traces' },
    { label: 'Runs', href: '/app/traces', icon: Layers, description: 'Trace history & execution graphs' },
  ];

  // SECONDARY UTILITIES
  const utilityTools = [
    { 
      label: 'Prompt Lab', 
      href: '/app/prompt-lab', 
      icon: FlaskConical,
      description: 'Optimize instructions & reduce token spend'
    },
    { 
      label: 'Compare Runs', 
      href: '/app/compare', 
      icon: GitCompare,
      description: 'A/B regression testing and node diffs'
    },
    { 
      label: 'Integration Center', 
      href: '/app/integrate', 
      icon: Code2,
      description: 'Python SDK drop-in snippets & keys'
    },
    { 
      label: 'Settings', 
      href: '/app/settings', 
      icon: Settings,
      description: 'Manage telemetry capture & API keys'
    },
  ];

  const isRouteActive = (href: string, exact = false) => {
    if (exact) {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
  };

  const isAnyToolActive = utilityTools.some(t => location.pathname.startsWith(t.href));

  const openCommandPalette = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-mono text-muted-foreground">Loading workspace...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col antialiased selection:bg-primary/20">
      <OfflineBanner />
      <CommandPalette />

      {/* Navigation Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          
          {/* Brand & Primary Nav */}
          <div className="flex items-center gap-6">
            <Link 
              to="/" 
              className="flex items-center gap-2 font-bold tracking-tight text-base hover:opacity-90 transition-opacity focus:outline-none focus:ring-1 focus:ring-primary rounded" 
              title="AgentLens Home"
            >
              <div className="w-6 h-6 rounded bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-mono text-xs font-bold shadow-sm">
                AL
              </div>
              <span className="font-semibold tracking-tight text-foreground">
                Agent<span className="text-primary font-bold">Lens</span>
              </span>
            </Link>

            {/* Desktop Primary Nav: High Visual Hierarchy */}
            <nav className="hidden md:flex items-center gap-1.5" aria-label="Core workflow navigation">
              {primaryNav.map((item) => {
                const Icon = item.icon;
                const active = isRouteActive(item.href, item.exact);
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                      active
                        ? 'bg-primary/20 text-primary border border-primary/35 font-semibold shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50 border border-transparent'
                    }`}
                    title={item.description}
                  >
                    <Icon className={`w-3.5 h-3.5 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Section: Search, Tools Dropdown, Project Badge, Mobile Toggle */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Quick Command Search (Ctrl+K) */}
            <button
              onClick={openCommandPalette}
              className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 text-xs text-muted-foreground bg-accent/25 hover:bg-accent/50 border border-border/70 rounded-md transition-colors focus:outline-none focus:border-primary"
              title="Search runs, traces, and commands (Ctrl+K)"
              aria-label="Search runs and commands"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="font-mono text-[11px]">Search</span>
              <kbd className="px-1.5 py-0.2 text-[10px] font-mono bg-background/80 border border-border/70 rounded text-muted-foreground shadow-xs">
                ⌘K
              </kbd>
            </button>

            {/* Secondary Utilities Dropdown (Redesigned Panel with explicit labels & icons) */}
            <div className="relative hidden md:block">
              <button
                onClick={() => setToolsMenuOpen(!toolsMenuOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors border ${
                  isAnyToolActive || toolsMenuOpen
                    ? 'bg-accent/40 text-foreground border-border'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/30 border-transparent'
                }`}
                aria-expanded={toolsMenuOpen}
                aria-haspopup="true"
                title="Secondary Tools: Prompt Lab, Compare, Integration, Settings"
              >
                <span>Tools</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${toolsMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {toolsMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setToolsMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-64 bg-[#0d0d0f] border border-border/90 rounded-lg shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-1 border-b border-border/50 pb-2 mb-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/80 font-semibold">
                        Secondary Utilities
                      </span>
                    </div>

                    <div className="space-y-0.5 px-1.5">
                      {utilityTools.map((tool) => {
                        const ToolIcon = tool.icon;
                        const active = isRouteActive(tool.href);
                        return (
                          <Link
                            key={tool.href}
                            to={tool.href}
                            onClick={() => setToolsMenuOpen(false)}
                            className={`flex items-start gap-2.5 px-2.5 py-2 rounded-md transition-colors ${
                              active
                                ? 'bg-primary/15 text-primary border border-primary/20'
                                : 'text-foreground/80 hover:bg-accent/50 hover:text-foreground'
                            }`}
                          >
                            <ToolIcon className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-semibold leading-tight">{tool.label}</span>
                              <span className="text-[10px] font-mono text-muted-foreground truncate leading-tight mt-0.5">
                                {tool.description}
                              </span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Active Project Indicator */}
            {activeProject && (
              <div 
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/20 border border-border/70 text-[11px] font-mono text-muted-foreground"
                title={`Active Project: ${activeProject.name}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
                <span className="truncate max-w-[130px] text-foreground/85 font-medium">{activeProject.name}</span>
              </div>
            )}

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-muted-foreground hover:text-foreground hover:bg-accent/40 rounded-md transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-border bg-background/98 px-4 pt-3 pb-4 space-y-3 animate-in fade-in duration-150">
            {activeProject && (
              <div className="flex items-center justify-between pb-2 border-b border-border/50 text-xs font-mono text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-foreground font-medium">{activeProject.name}</span>
                </span>
                <span className="text-[10px] uppercase bg-accent px-1.5 py-0.5 rounded text-emerald-400">Active</span>
              </div>
            )}

            <div className="space-y-1">
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground px-2 py-1 font-semibold">
                Core Workflow
              </div>
              {primaryNav.map((item) => {
                const Icon = item.icon;
                const active = isRouteActive(item.href, item.exact);
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                      active ? 'bg-primary/20 text-primary font-semibold border border-primary/30' : 'text-foreground/80 hover:bg-accent/40'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            <div className="pt-2 border-t border-border/50 space-y-1">
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground px-2 py-1 font-semibold">
                Secondary Tools
              </div>
              {utilityTools.map((item) => {
                const Icon = item.icon;
                const active = isRouteActive(item.href);
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                      active ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent/40'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            <div className="pt-2 border-t border-border/50">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  openCommandPalette();
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-md text-xs bg-accent/30 text-muted-foreground hover:text-foreground"
              >
                <span className="flex items-center gap-2">
                  <Search className="w-3.5 h-3.5" />
                  <span>Command Palette</span>
                </span>
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-background border border-border rounded">⌘K</kbd>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Workspace Layout */}
      <main className="flex-1 w-full flex flex-col">
        <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 md:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
