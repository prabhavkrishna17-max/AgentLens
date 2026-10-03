import { useState, useEffect } from 'react';
import { WifiOff, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '@/lib/api';

export default function OfflineBanner() {
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        const handleOnline = () => {
            setIsOffline(false);
            setDismissed(false);
        };
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Also check if backend is reachable periodically
        const checkBackend = async () => {
            try {
                const res = await apiFetch('/api/projects', { method: 'HEAD' });
                if (!res.ok && res.status >= 500) {
                    setIsOffline(true);
                } else if (res.ok) {
                    setIsOffline(false);
                }
            } catch (e) {
                setIsOffline(true);
            }
        };
        
        const interval = setInterval(checkBackend, 10000);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(interval);
        };
    }, []);

    return (
        <AnimatePresence>
            {isOffline && !dismissed && (
                <motion.div 
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -50, opacity: 0 }}
                    className="fixed top-0 left-0 right-0 z-[100] bg-destructive text-destructive-foreground px-4 py-2 flex items-center justify-center gap-3 text-sm font-medium shadow-lg"
                >
                    <WifiOff className="w-4 h-4" />
                    <span>Unable to connect to AgentLens backend. Some features may be unavailable.</span>
                    <button 
                        onClick={() => setDismissed(true)} 
                        className="absolute right-4 p-1 hover:bg-black/20 rounded transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
