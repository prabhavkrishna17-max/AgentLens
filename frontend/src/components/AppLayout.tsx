import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import CommandPalette from './CommandPalette';
import OfflineBanner from './OfflineBanner';
import CardNav from './CardNav';
import LightTunnel from './LightTunnel';
import { apiFetch } from '@/lib/api';

const navItems = [
  {
    label: "AGENT WORKSPACE",
    bgColor: "rgba(20, 20, 20, 0.6)",
    textColor: "#fff",
    links: [{ label: "Run Agent", href: "/app/agent" }]
  },
  {
    label: "ADVANCED",
    bgColor: "rgba(30, 30, 30, 0.6)",
    textColor: "#fff",
    links: [
      { label: "Dashboard", href: "/app" },
      { label: "Traces", href: "/app/traces" },
      { label: "Prompt Lab", href: "/app/prompt-lab" },
      { label: "Compare", href: "/app/compare" },
      { label: "Connect your own agent", href: "/app/integrate" },
      { label: "Settings", href: "/app/settings" }
    ]
  }
];

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const { data: projects, isLoading, isError } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await apiFetch('/api/projects');
      if (!res.ok) throw new Error('Network error');
      return res.json();
    },
  });
  
  const hasProjects = projects && projects.length > 0;

  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden">
      <OfflineBanner />
      <CommandPalette />
      
      {/* Global Navigation */}
      <div className="relative z-50">
        <CardNav 
          items={navItems}
          baseColor="rgba(20, 20, 20, 0.5)"
          menuColor="#fff"
          buttonBgColor="#fff"
          buttonTextColor="#000"
        />
      </div>

      {/* Background Effect */}
      <div className="absolute inset-0 z-0 pointer-events-none fixed">
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
          opacity={0.3}
          mouseInteraction={true}
          mouseStrength={0.1}
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden pt-24 relative z-10">
        <div className="flex-1 overflow-y-auto relative px-4 md:px-8 pb-8">
          {location.pathname !== '/app' && !location.pathname.startsWith('/app/trace/') && (
            <div className="mb-6 flex max-w-7xl mx-auto w-full">
              <Link 
                to="/app" 
                className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/30 rounded-full hover:bg-primary/20 hover:shadow-[0_0_20px_hsl(var(--primary)/0.4)] transition-all font-mono text-sm shadow-[0_0_10px_hsl(var(--primary)/0.2)]"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Dashboard
              </Link>
            </div>
          )}
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: 'spring', damping: 20, stiffness: 100 }}
              className="min-h-full max-w-7xl mx-auto w-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
