import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Plus } from 'lucide-react';
import styles from './landing.module.css';
import LightRays from '../../components/LightRays';
import SpecularButton from '../../components/SpecularButton';
import CardNav from '../../components/CardNav';

const navItems = [
  {
    label: "01 — OBSERVE",
    bgColor: "rgba(20, 20, 20, 0.6)",
    textColor: "#fff",
    links: [{ label: "Real-time execution", href: "/app" }]
  },
  {
    label: "02 — TRACE",
    bgColor: "rgba(30, 30, 30, 0.6)",
    textColor: "#fff",
    links: [{ label: "Inspect executions", href: "/app/traces" }]
  },
  {
    label: "03 — DIAGNOSE",
    bgColor: "rgba(40, 40, 40, 0.6)",
    textColor: "#fff",
    links: [{ label: "Analyze failures", href: "/app/traces" }]
  },
  {
    label: "04 — PROMPT LAB",
    bgColor: "rgba(50, 50, 50, 0.6)",
    textColor: "#fff",
    links: [{ label: "Refine prompts", href: "/app/prompt-lab" }]
  },
  {
    label: "05 — COMPARE",
    bgColor: "rgba(60, 60, 60, 0.6)",
    textColor: "#fff",
    links: [{ label: "Measure changes", href: "/app/compare" }]
  },
  {
    label: "06 — INTEGRATE",
    bgColor: "rgba(70, 70, 70, 0.6)",
    textColor: "#fff",
    links: [
      { label: "Connect agent", href: "/app/integrate" },
      { label: "Settings", href: "/app/settings" }
    ]
  }
];

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



  const renderTopBar = (toggleMenu: () => void, isExpanded: boolean) => (
    <div className="absolute top-0 left-0 right-0 h-[60px] flex items-center justify-between px-4 z-[2] pointer-events-none">
      <div className={styles.navLeft} style={{ pointerEvents: 'auto' }}>
        <div className={styles.logoWrapper}>
          <LogoIcon />
          <span className={styles.brandText}>AgentLens</span>
        </div>
      </div>

      <div className={styles.navRight} style={{ pointerEvents: 'auto' }}>
        <SpecularButton className={styles.menuPill} radius={9999} onClick={toggleMenu}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className={styles.menuIconCircle}>
              <Plus size={12} strokeWidth={3} style={{ transform: isExpanded ? 'rotate(45deg)' : 'none', transition: 'transform 0.3s ease' }} />
            </div>
            <span>{isExpanded ? 'Close' : 'Menu'}</span>
          </div>
        </SpecularButton>
      </div>
    </div>
  );

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

      {/* Hero Section */}
      <div className={styles.heroSection}>
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
        <div className="fixed top-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[800px] z-50" style={{ pointerEvents: 'none' }}>
          <div style={{ pointerEvents: 'auto' }}>
            <CardNav 
              items={navItems}
              baseColor="rgba(20, 20, 20, 0.5)"
              menuColor="#fff"
              renderTopBar={renderTopBar}
              className="!top-0 !w-full"
            />
          </div>
        </div>

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
            <span className={styles.subtitleText}>Understand why your AI agent failed.</span>
          </motion.div>

          <motion.h1 
            className={styles.heading}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.8, ease }}
          >
            Run your agent. See what happened.<br />Understand why it failed. Fix it.
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
              onClick={() => navigate('/app/agent')}
            >
              Start Agent Workspace
            </SpecularButton>
            <SpecularButton 
              className={styles.btnSecondary} 
              radius={9999}
              onClick={() => navigate('/app')}
            >
              Open Console
            </SpecularButton>
          </motion.div>
        </div>
      </motion.div>
      </div>

      {/* Feature Walkthrough Section */}
      <div id="walkthrough" className={styles.walkthroughSection}>
        {/* Step 1: Connect */}
        <div className={styles.walkthroughStep}>
          <div className={styles.stepText}>
            <span className={styles.stepLabel}>01 // Connect</span>
            <h2 className={styles.stepTitle}>Drop-in Integration.</h2>
            <p className={styles.stepDesc}>Add two lines of code to your Python application. We instantly capture LLM calls, tool executions, and state mutations across OpenAI, Anthropic, Gemini, and LangChain.</p>
          </div>
          <div className={styles.stepVisual}>
            <div className={styles.visualCode}>
              <span style={{ color: '#ff7b72' }}>import</span> {'{ init_agentlens }'} <span style={{ color: '#ff7b72' }}>from</span> 'agentlens'<br/><br/>
              init_agentlens(<br/>
              &nbsp;&nbsp;project_id=<span style={{ color: '#a5d6ff' }}>"prj_123"</span>,<br/>
              &nbsp;&nbsp;api_key=os.getenv(<span style={{ color: '#a5d6ff' }}>"AL_KEY"</span>)<br/>
              )<br/><br/>
              <span style={{ color: '#8b949e' }}># Your agent code runs normally...</span>
            </div>
          </div>
        </div>

        {/* Step 2: Observe & Trace */}
        <div className={styles.walkthroughStep}>
          <div className={styles.stepText}>
            <span className={styles.stepLabel}>02 // Trace</span>
            <h2 className={styles.stepTitle}>Visualize the black box.</h2>
            <p className={styles.stepDesc}>Every autonomous decision becomes a measurable node in an execution graph. See exactly which tool was called, what data was returned, and how long it took.</p>
          </div>
          <div className={styles.stepVisual}>
            <div className={styles.visualGraph}>
              <div className={styles.graphNode}>User Request</div>
              <div className={styles.graphLine}></div>
              <div className={styles.graphNode}>Agent Decision</div>
              <div className={styles.graphLine}></div>
              <div className={styles.graphNode}>Execute Tool: web_search</div>
            </div>
          </div>
        </div>

        {/* Step 3: Diagnose */}
        <div className={styles.walkthroughStep}>
          <div className={styles.stepText}>
            <span className={styles.stepLabel}>03 // Diagnose</span>
            <h2 className={styles.stepTitle}>Root-cause analysis.</h2>
            <p className={styles.stepDesc}>Don't guess why an agent hallucinated or crashed. Click any failed node to see the exact input, output, exception trace, and model token usage.</p>
          </div>
          <div className={styles.stepVisual}>
            <div className={styles.visualGraph}>
              <div className={styles.graphNode}>Execute Tool: query_db</div>
              <div className={styles.graphLine} style={{ background: 'rgba(255, 100, 100, 0.5)' }}></div>
              <div className={`${styles.graphNode} ${styles.graphNodeFailed}`}>Error: rate_limit_exceeded</div>
            </div>
          </div>
        </div>

        {/* Step 4: Refine & Compare */}
        <div className={styles.walkthroughStep}>
          <div className={styles.stepText}>
            <span className={styles.stepLabel}>04 // Compare</span>
            <h2 className={styles.stepTitle}>Measure improvements.</h2>
            <p className={styles.stepDesc}>Once you identify the failure, use the Prompt Lab to tweak instructions and run A/B comparisons. Prove that your fix actually works before deploying.</p>
          </div>
          <div className={styles.stepVisual}>
            <div className={styles.visualSplit}>
              <div className={styles.splitPane}>
                <div className={styles.splitPaneTitle}>RUN A (Failed)</div>
                You are a helpful assistant.
              </div>
              <div className={styles.splitPane}>
                <div className={styles.splitPaneTitle}>RUN B (Success)</div>
                You are a precise data extraction tool. Always return JSON.
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default LandingPage;
