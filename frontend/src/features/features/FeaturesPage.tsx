import React from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, ArrowRight, Play, CheckCircle2, AlertTriangle, XCircle, Search, RefreshCw } from 'lucide-react';
import StaggeredText from '../../components/StaggeredText';
import SpecularButton from '../../components/SpecularButton';
import LightTunnel from '../../components/LightTunnel';

export default function FeaturesPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      
      {/* Header */}
      <header className="fixed top-0 left-0 w-full z-50 p-6 flex justify-between items-center bg-background/80 backdrop-blur-md border-b border-border/50">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors font-mono text-xs uppercase tracking-widest">
          <ChevronLeft className="w-4 h-4" /> Back to Home
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary/50 animate-pulse" />
          <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Product Tour</span>
        </div>
      </header>

      <main className="pt-32 pb-32">
        
        {/* SECTION 1 - THE PROBLEM */}
        <section className="min-h-screen flex flex-col items-center justify-center px-6 relative">
          <div className="max-w-4xl w-full text-center z-10">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-8 leading-tight">
              <StaggeredText text="Your agent failed." className="text-muted-foreground" />
              <br />
              <StaggeredText text="But why?" delay={0.5} />
            </h1>
            
            <p className="text-xl text-muted-foreground font-light mb-24 max-w-2xl mx-auto opacity-0 animate-[fadeIn_1s_ease-out_1.5s_forwards]">
              Traditional logs tell you that something failed. They rarely tell you why.
            </p>

            {/* Chaotic execution visual */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.5 }}
              className="relative p-12 border border-border/50 rounded-3xl bg-accent/5 overflow-hidden font-mono text-sm"
            >
              <div className="absolute inset-0 bg-grid-pattern opacity-10" />
              
              <div className="flex flex-wrap items-center justify-center gap-4 relative z-10">
                {['Prompt', 'LLM', 'Tool', 'API', 'Retrieval', 'Memory', 'LLM'].map((node, i) => (
                  <React.Fragment key={i}>
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 1 + (i * 0.1) }}
                      className="px-4 py-2 border border-border bg-background rounded-md text-muted-foreground"
                    >
                      {node}
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, width: 0 }}
                      whileInView={{ opacity: 1, width: 24 }}
                      transition={{ delay: 1.1 + (i * 0.1) }}
                    >
                      <ArrowRight className="w-4 h-4 text-border" />
                    </motion.div>
                  </React.Fragment>
                ))}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1, x: [0, -5, 5, -5, 0] }}
                  transition={{ delay: 1.8, duration: 0.4 }}
                  className="px-4 py-2 border border-red-500/50 bg-red-500/10 text-red-500 rounded-md font-bold shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                >
                  Error
                </motion.div>
              </div>

              {/* Floating glitch logs */}
              <motion.div 
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 0.5 }}
                transition={{ delay: 2.2 }}
                className="absolute inset-0 pointer-events-none flex items-center justify-center mix-blend-screen opacity-50"
              >
                <div className="text-red-500/20 text-xs absolute top-10 left-10 transform -rotate-12">RecursionError: maximum depth...</div>
                <div className="text-red-500/20 text-xs absolute bottom-10 right-10 transform rotate-12">IndexError: list index out of range</div>
                <div className="text-red-500/20 text-xs absolute top-20 right-20 transform rotate-6">TypeError: Cannot read properties of undefined</div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Divider */}
        <div className="w-full flex justify-center py-12 opacity-30">
          <div className="w-px h-32 bg-gradient-to-b from-transparent via-border to-transparent" />
        </div>

        {/* SECTION 2 - CONNECT */}
        <section className="min-h-[80vh] flex flex-col justify-center px-6">
          <div className="max-w-6xl mx-auto w-full grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="text-primary font-mono text-xs uppercase tracking-widest mb-4">Step 1</div>
              <h2 className="text-4xl font-bold mb-6 tracking-tight">Connect</h2>
              <p className="text-xl text-muted-foreground font-light leading-relaxed">
                Add observability without rebuilding your agent. Simply wrap your existing execution flow.
              </p>
            </div>
            
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              className="relative rounded-2xl border border-border/50 bg-background overflow-hidden p-8"
            >
              <div className="font-mono text-sm mb-12 bg-accent/20 border border-border/50 p-6 rounded-lg text-muted-foreground">
                <div className="mb-4"><span className="text-pink-400">from</span> agentlens <span className="text-pink-400">import</span> AgentLens</div>
                <div>lens = AgentLens(</div>
                <div className="pl-4">api_key=<span className="text-yellow-300">"al_••••••"</span></div>
                <div>)</div>
              </div>

              <div className="flex flex-col items-center justify-center gap-4 relative font-mono text-sm">
                <div className="px-6 py-3 border border-border rounded-xl bg-accent/10">Your Agent</div>
                
                <motion.div 
                  initial={{ height: 0 }}
                  whileInView={{ height: 40 }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="w-px bg-primary/50 relative"
                >
                  <motion.div 
                    animate={{ top: ["0%", "100%"] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    className="absolute left-1/2 -translate-x-1/2 w-1.5 h-4 bg-primary rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                  />
                </motion.div>

                <div className="px-6 py-3 border border-primary/30 rounded-xl bg-primary/5 text-primary shadow-[0_0_20px_rgba(59,130,246,0.1)]">AgentLens SDK</div>
                
                <motion.div 
                  initial={{ height: 0 }}
                  whileInView={{ height: 40 }}
                  transition={{ duration: 1, delay: 1 }}
                  className="w-px bg-primary/50 relative"
                >
                  <motion.div 
                    animate={{ top: ["0%", "100%"] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear", delay: 0.75 }}
                    className="absolute left-1/2 -translate-x-1/2 w-1.5 h-4 bg-primary rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                  />
                </motion.div>

                <div className="px-6 py-3 border border-primary/50 rounded-xl bg-primary/10 text-white font-bold">AgentLens</div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* SECTION 3 - OBSERVE */}
        <section className="min-h-[80vh] flex flex-col justify-center px-6 mt-24">
          <div className="max-w-6xl mx-auto w-full grid lg:grid-cols-2 gap-16 items-center">
            
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              className="order-2 lg:order-1 relative rounded-2xl border border-border/50 bg-background overflow-hidden p-8 font-mono text-sm"
            >
              <div className="flex items-center gap-2 text-muted-foreground mb-6 pb-6 border-b border-border/50">
                <Play className="w-4 h-4 text-green-500" />
                <span>Agent Run Started</span>
                <span className="ml-auto opacity-50">0ms</span>
              </div>
              
              <div className="space-y-4">
                {[
                  { name: "Planner", dur: "1.2s", meta: "claude-3-opus", status: "ok" },
                  { name: "Retrieval", dur: "450ms", meta: "vector-db", status: "ok" },
                  { name: "LLM", dur: "2.8s", meta: "gpt-4o", status: "ok", tokens: "4,021" },
                  { name: "Tool Call", dur: "800ms", meta: "weather_api", status: "ok" },
                  { name: "Final Response", dur: "3.1s", meta: "gpt-4o", status: "ok", tokens: "1,200" }
                ].map((step, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + (i * 0.4) }}
                    className="flex items-center gap-4 pl-4 border-l-2 border-border/50 relative"
                  >
                    <div className="absolute -left-[5px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-border" />
                    
                    <div className="flex-1 border border-border bg-accent/5 rounded-lg p-3 flex justify-between items-center group hover:border-primary/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="text-foreground">{step.name}</span>
                      </div>
                      
                      <div className="flex items-center gap-3 opacity-60 text-xs">
                        <span className="bg-accent px-2 py-0.5 rounded">{step.meta}</span>
                        {step.tokens && <span className="bg-accent px-2 py-0.5 rounded">{step.tokens} tkns</span>}
                        <span>{step.dur}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <div className="order-1 lg:order-2">
              <div className="text-primary font-mono text-xs uppercase tracking-widest mb-4">Step 2</div>
              <h2 className="text-4xl font-bold mb-6 tracking-tight">Observe</h2>
              <p className="text-xl text-muted-foreground font-light leading-relaxed">
                Watch execution timelines populate in real-time. No fabricated dashboards, just the exact deterministic reality of your agent's behavior.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 4 - TRACE & DIAGNOSE */}
        <section className="min-h-screen flex flex-col justify-center px-6 mt-32 relative">
          <div className="max-w-6xl mx-auto w-full">
            <div className="text-center mb-16">
              <div className="text-primary font-mono text-xs uppercase tracking-widest mb-4">Step 3 & 4</div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">Trace & Diagnose</h2>
              <p className="text-xl text-muted-foreground font-light max-w-2xl mx-auto">
                See exactly where the agent went wrong, and let the Diagnosis Engine explain the root cause.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 relative z-10">
              
              {/* TRACE GRAPH */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="border border-border/50 rounded-2xl bg-background/80 backdrop-blur-xl p-8 flex flex-col items-center justify-center gap-6 shadow-2xl relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
                
                {[
                  { id: "Prompt", icon: <Search className="w-4 h-4 text-blue-400" /> },
                  { id: "Planner", icon: <CheckCircle2 className="w-4 h-4 text-green-400" /> },
                  { id: "Retriever", icon: <CheckCircle2 className="w-4 h-4 text-green-400" /> },
                  { id: "GPT-4", icon: <CheckCircle2 className="w-4 h-4 text-green-400" /> }
                ].map((node, i) => (
                  <React.Fragment key={i}>
                    <div className="w-48 px-4 py-3 border border-border/50 bg-accent/20 rounded-xl flex items-center justify-between text-sm z-10">
                      <span>{node.id}</span>
                      {node.icon}
                    </div>
                    <div className="w-px h-6 bg-border z-0" />
                  </React.Fragment>
                ))}
                
                <motion.div 
                  initial={{ borderColor: 'rgba(239, 68, 68, 0)', boxShadow: '0 0 0 rgba(239, 68, 68, 0)' }}
                  whileInView={{ borderColor: 'rgba(239, 68, 68, 0.5)', boxShadow: '0 0 20px rgba(239, 68, 68, 0.2)' }}
                  transition={{ delay: 1 }}
                  className="w-48 px-4 py-3 border bg-red-500/10 rounded-xl flex items-center justify-between text-sm z-10 relative cursor-pointer"
                >
                  <span className="text-red-400 font-medium">Tool Execution</span>
                  <XCircle className="w-4 h-4 text-red-500" />
                  
                  {/* Pulse effect */}
                  <div className="absolute inset-0 border border-red-500 rounded-xl animate-ping opacity-20" />
                </motion.div>
              </motion.div>

              {/* DIAGNOSIS PANEL */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 1.2 }}
                className="border border-border/50 rounded-2xl bg-accent/5 p-8 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 bg-primary/10 border-b border-l border-primary/20 px-3 py-1 rounded-bl-xl font-mono text-[10px] text-primary uppercase tracking-wider flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  AI Inference
                </div>

                <div className="mt-4 space-y-8">
                  <div>
                    <h4 className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-3 h-3 text-red-400" />
                      Root Cause
                    </h4>
                    <p className="text-sm border-l-2 border-red-500/50 pl-4 py-1">
                      Retrieval returned conflicting invoice records.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">
                      Observed Evidence
                    </h4>
                    <div className="bg-background border border-border rounded-lg p-3 text-xs font-mono opacity-80">
                      2 records matched the same invoice identifier.
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">Confidence</h4>
                      <div className="text-2xl font-light">96%</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2 text-green-400">
                      Suggested Fix
                    </h4>
                    <p className="text-sm border-l-2 border-green-500/50 pl-4 py-1">
                      Add deterministic invoice-ID validation before payment execution.
                    </p>
                  </div>
                </div>
              </motion.div>

            </div>
          </div>
        </section>

        {/* SECTION 5 - REFINE */}
        <section className="min-h-screen flex flex-col justify-center px-6 mt-24">
          <div className="max-w-6xl mx-auto w-full grid lg:grid-cols-2 gap-16 items-center">
            
            <div>
              <div className="text-primary font-mono text-xs uppercase tracking-widest mb-4">Step 5</div>
              <h2 className="text-4xl font-bold mb-6 tracking-tight">Refine</h2>
              <p className="text-xl text-muted-foreground font-light leading-relaxed">
                Understand the failure. Then improve the instruction instantly in Prompt Lab.
              </p>
            </div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="border border-border/50 rounded-2xl bg-background overflow-hidden flex flex-col font-mono text-xs"
            >
              {/* Header */}
              <div className="border-b border-border/50 p-4 flex items-center justify-between bg-accent/10">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-sm">Prompt Lab</span>
                </div>
                <div className="flex gap-2">
                  <span className="px-2 py-1 bg-background border border-border rounded text-muted-foreground">Claude / Anthropic</span>
                </div>
              </div>

              {/* Original Prompt */}
              <div className="p-6 pb-2 relative">
                <div className="text-muted-foreground/50 mb-2 uppercase tracking-widest text-[10px]">Original Prompt</div>
                <div className="border border-red-500/20 bg-red-500/5 rounded p-3 text-red-200/70">
                  Find the invoice and pay it.
                </div>
              </div>

              {/* Transformation animation */}
              <div className="flex justify-center py-4">
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  whileInView={{ height: 40, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="w-px bg-gradient-to-b from-red-500/50 to-green-500/50"
                />
              </div>

              {/* Improved Prompt */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="p-6 pt-2 relative"
              >
                <div className="text-green-500/50 mb-2 uppercase tracking-widest text-[10px]">Improved Instruction</div>
                <div className="border border-green-500/30 bg-green-500/10 rounded p-3 text-green-100">
                  <span className="text-green-400">1. Extract the invoice ID from the user query.</span><br/>
                  <span className="text-green-400">2. Validate the invoice ID matches exactly one record in the database.</span><br/>
                  3. If ambiguous, ask the user for clarification.<br/>
                  4. Execute payment only after validation.
                </div>
              </motion.div>
            </motion.div>

          </div>
        </section>

        {/* SECTION 6 - COMPARE */}
        <section className="min-h-[80vh] flex flex-col justify-center px-6 mt-16">
          <div className="max-w-6xl mx-auto w-full text-center mb-16">
            <div className="text-primary font-mono text-xs uppercase tracking-widest mb-4">Step 6</div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">Compare</h2>
            <p className="text-xl text-muted-foreground font-light max-w-2xl mx-auto">
              Don't guess whether the fix worked. Compare the executions side-by-side.
            </p>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-5xl mx-auto w-full grid md:grid-cols-2 gap-4"
          >
            {/* Run A */}
            <div className="border border-border/50 rounded-2xl bg-accent/5 p-6 opacity-60 grayscale transition-all hover:grayscale-0 hover:opacity-100">
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-border/50">
                <h3 className="font-mono text-xs uppercase tracking-widest">Run A — Failed</h3>
                <span className="px-2 py-1 bg-red-500/10 text-red-500 rounded text-xs font-bold">ERROR</span>
              </div>
              <div className="space-y-3 font-mono text-xs text-muted-foreground">
                <div className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-green-500" /> <span>Planner</span></div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-green-500" /> <span>Retrieval</span></div>
                <div className="flex items-center gap-2"><XCircle className="w-3 h-3 text-red-500" /> <span className="text-red-400 line-through">Tool Execution</span></div>
                <div className="opacity-30 flex items-center gap-2"><div className="w-3 h-3 rounded-full border border-border" /> <span>Final Response</span></div>
              </div>
            </div>

            {/* Run B */}
            <div className="border border-primary/30 rounded-2xl bg-primary/5 p-6 shadow-[0_0_30px_rgba(59,130,246,0.05)]">
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-primary/20">
                <h3 className="font-mono text-xs uppercase tracking-widest text-foreground">Run B — Improved</h3>
                <span className="px-2 py-1 bg-green-500/10 text-green-500 rounded text-xs font-bold">SUCCESS</span>
              </div>
              <div className="space-y-3 font-mono text-xs text-muted-foreground">
                <div className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-green-500" /> <span className="text-foreground">Planner</span></div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-green-500" /> <span className="text-foreground">Retrieval</span></div>
                <div className="flex items-center gap-2 bg-green-500/10 p-1 -mx-1 rounded"><CheckCircle2 className="w-3 h-3 text-green-500" /> <span className="text-green-400 font-bold">Tool Execution</span></div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-green-500" /> <span className="text-foreground">Final Response</span></div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* FINAL SECTION - THE LOOP */}
        <section className="min-h-screen flex flex-col items-center justify-center px-6 text-center relative mt-32">
          
          <div className="absolute inset-0 z-0">
            <LightTunnel 
              cableColor="#3b82f6"
              pulseColor="#ffffff"
              tunnelColor="#000000"
              tunnelOpacity={0.1}
              speed={0.05}
              flowDirection="inward"
              pulseSpeed={1}
            />
          </div>

          <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center">
            
            <div className="flex flex-col items-center gap-4 mb-16 font-mono text-sm tracking-widest text-primary/70 font-bold">
              <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>CONNECT</motion.div>
              <div className="w-px h-6 bg-primary/30" />
              <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>OBSERVE</motion.div>
              <div className="w-px h-6 bg-primary/30" />
              <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>TRACE</motion.div>
              <div className="w-px h-6 bg-primary/30" />
              <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>UNDERSTAND</motion.div>
              <div className="w-px h-6 bg-primary/30" />
              <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>DIAGNOSE</motion.div>
              <div className="w-px h-6 bg-primary/30" />
              <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>REFINE</motion.div>
              <div className="w-px h-6 bg-primary/30" />
              <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>COMPARE</motion.div>
            </div>

            <h2 className="text-5xl md:text-7xl font-bold tracking-tighter mb-8 leading-tight">
              <StaggeredText text="Build agents you can understand." />
            </h2>
            
            <p className="text-xl text-muted-foreground font-light mb-12 max-w-2xl mx-auto">
              AgentLens gives developers visibility into what their AI agents did, where they failed, and what to improve next.
            </p>

            <SpecularButton 
              className="px-12 py-4 text-lg"
              radius={9999}
              onClick={() => navigate('/app')}
            >
              Start Building
            </SpecularButton>

          </div>
        </section>

      </main>
    </div>
  );
}
