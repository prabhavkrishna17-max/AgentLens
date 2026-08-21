import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Plus, Grip } from 'lucide-react';
import styles from './landing.module.css';
import LightRays from '../../components/LightRays';
import SpecularButton from '../../components/SpecularButton';

// Custom Logo SVG
const LogoIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.logoSvg}>
    <rect x="4" y="10" width="16" height="4" rx="2" fill="currentColor" transform="rotate(-35 12 12)" />
    <rect x="4" y="10" width="16" height="4" rx="2" fill="currentColor" transform="rotate(-35 12 12) translate(0 6)" />
  </svg>
);

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoState, setVideoState] = useState<'raising' | 'lowering'>('raising');

  const handleVideoEnded = () => {
    if (!shouldReduceMotion) {
      setVideoState('lowering');
    }
  };

  useEffect(() => {
    // Set initial playback rate slightly slower
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.85;
    }

    if (videoState === 'lowering') {
      const timer = setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.currentTime = 0;
          videoRef.current.playbackRate = 0.85;
          videoRef.current.play().catch(e => console.log("Play failed", e));
        }
        setVideoState('raising');
      }, 5000); // Wait for lowering animation to finish before raising again
      
      return () => clearTimeout(timer);
    }
  }, [videoState]);

  const ease = [0.16, 1, 0.3, 1] as const;

  const wrapperVariants = {
    hidden: { opacity: 0, scale: 1.0, x: "-50%", y: "100vh" },
    visible: { 
      opacity: 1, 
      scale: 1, 
      x: "-50%", 
      y: "-50%",
      transition: { y: { duration: 3.5, ease }, opacity: { duration: 2.0, ease } }
    },
    lowering: { 
      opacity: 1, 
      scale: 1.0, 
      x: "-50%", 
      y: "100vh",
      transition: { y: { duration: 5.0, ease: "easeInOut" } }
    }
  } as any;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className={styles.container}
    >
      {/* SVG Filter for Luma Keying (removes white background dynamically) */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }} aria-hidden="true">
        <filter id="luma-key">
          <feColorMatrix type="matrix" 
            values="1 0 0 0 0
                    0 1 0 0 0
                    0 0 1 0 0
                    -3.33 -3.33 -3.33 0 8.5" />
        </filter>
      </svg>

      {/* Spotlight Effect */}
      <div className={styles.spotlightWrapper}>
        <LightRays
          raysOrigin="top-center"
          raysColor="#ffffff"
          raysSpeed={0.3}
          lightSpread={0.8}
          rayLength={1.5}
          fadeDistance={0.9}
          followMouse={!shouldReduceMotion}
          mouseInfluence={0.05}
          noiseAmount={0.02}
          distortion={0.03}
        />
        <div className={styles.spotlightMask} />
      </div>

      {/* Background Video / Robotic Hand */}
      <motion.div 
        className={styles.videoWrapper}
        variants={wrapperVariants}
        initial={shouldReduceMotion ? "visible" : "hidden"}
        animate={
          shouldReduceMotion 
            ? "visible" 
            : (videoState === 'raising' ? "visible" : "lowering")
        }
      >
        <video 
          ref={videoRef}
          className={styles.video}
          autoPlay 
          muted 
          playsInline 
          loop={shouldReduceMotion || false}
          onEnded={handleVideoEnded}
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260508_215831_c6a8989c-d716-4d8d-8745-e972a2eec711.mp4"
        />
      </motion.div>

      {/* Navbar */}
      <motion.nav 
        className={styles.navbar}
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease }}
      >
        <div className={styles.navLeft}>
          <div className={styles.logoWrapper}>
            <LogoIcon />
            <span className={styles.brandText}>AgentLens</span>
          </div>
          
          <SpecularButton className={styles.menuPill} radius={9999}>
            <div className={styles.menuIconCircle}>
              <Plus size={12} strokeWidth={3} />
            </div>
            Menu
          </SpecularButton>
          
          <div className={styles.tagsPill}>
            <span>Tracing</span>
            <span>Diagnosis</span>
          </div>
        </div>

        <div className={styles.navRight}>
          <SpecularButton className={styles.systemPill} radius={9999}>
            <div className={styles.systemIconCircle}>
              <Grip size={12} strokeWidth={2} />
            </div>
            Observability Engine
          </SpecularButton>
        </div>
      </motion.nav>

      {/* Footer Content */}
      <motion.div 
        className={styles.footerWrapper}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 1, ease }}
      >
        <div className={styles.footerLeft}>
          <motion.div 
            className={styles.subtitleWrapper}
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8, ease }}
          >
            <div className={styles.subtitleDot} />
            <span className={styles.subtitleText}>Best AI agent observability 2026</span>
          </motion.div>

          <motion.h1 
            className={styles.heading}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.8, ease }}
          >
            One Trace, Zero<br />Blindspots. Worldwide.
          </motion.h1>

          <motion.div 
            className={styles.buttonGroup}
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.0, duration: 0.8, ease }}
          >
            <SpecularButton 
              className={styles.specularOverride}
              radius={9999} 
              onClick={() => navigate('/features')}
            >
              See Features
            </SpecularButton>
            <SpecularButton 
              className={styles.btnSecondary} 
              radius={9999}
              onClick={() => navigate('/app')}
            >
              How It Works
            </SpecularButton>
          </motion.div>
        </div>

        <motion.div 
          className={styles.footerRight}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.0, duration: 0.8, ease }}
        >
          <span className={styles.footerTag}>Visual Tracing</span>
          <span className={styles.footerTag}>AI Diagnosis</span>
          <span className={styles.footerTag}>Timeline Replay</span>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default LandingPage;
