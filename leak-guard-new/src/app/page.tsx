'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, ShieldCheck, Github, ChevronRight, Loader2, ExternalLink, Menu, X } from 'lucide-react';

// Matrix Code Rain Background
function MatrixBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;
    
    const chars = "10101010ABCDEFHIJKLMNOPQRSTUVWXYZ";
    const fontSize = 16;
    const columns = Math.floor(w / fontSize);
    const drops = new Array(columns).fill(1);

    const draw = () => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#10b981"; // Emerald-500
      ctx.font = `${fontSize}px monospace`;

      drops.forEach((y, i) => {
        const text = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(text, i * fontSize, y * fontSize);
        if (y * fontSize > h && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      });
    };

    let animationId: number;
    const render = () => {
      draw();
      animationId = requestAnimationFrame(render);
    };
    render();

    const handleResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none opacity-40"
    />
  );
}

export default function LandingPage() {
  const [inputValue, setInputValue] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [errorObj, setErrorObj] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleScan = async () => {
    if (!inputValue.trim()) return;
    
    setIsScanning(true);
    setResults(null);
    
    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputData: inputValue }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
         throw new Error(data.error || 'Scan failed');
      }

      setErrorObj(null);
      // Artificial delay to make the scan feel "real"
      setTimeout(() => {
        setResults(data);
        setIsScanning(false);
      }, 1500);
    } catch (error: any) {
      console.error('Error scanning:', error);
      setErrorObj(error.message || 'An unexpected error occurred.');
      setIsScanning(false);
      setResults(null);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-emerald-500/30 font-sans relative overflow-x-hidden">
      {/* Matrix Background */}
      <MatrixBackground />
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-black via-transparent to-black pointer-events-none" />
      
      {/* Scanner Beam Effect */}
      <div className="fixed inset-0 z-0 bg-[linear-gradient(rgba(16,185,129,0)_50%,rgba(16,185,129,0.05)_50%),linear-gradient(90deg,rgba(16,185,129,0.02),rgba(16,185,129,0.02))] bg-[length:100%_4px,4px_100%] pointer-events-none opacity-40" />

      {/* Navigation Layer */}
      <nav className="absolute top-0 w-full z-50 border-b border-white/5 bg-black/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-emerald-500" />
            <span className="font-bold text-xl tracking-tight">LeakGuard AI</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#demo" className="hover:text-white transition-colors">Scanner</a>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
              className="hidden sm:block px-4 py-2 text-sm font-bold bg-white text-black rounded-lg hover:bg-zinc-200 transition-colors active:scale-95"
            >
              Get Access
            </button>
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-zinc-400 hover:text-white transition-colors"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Drawer */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-black border-t border-white/5 overflow-hidden"
            >
              <div className="flex flex-col p-6 gap-4 text-lg font-medium text-zinc-400">
                <a href="#features" onClick={() => setIsMenuOpen(false)} className="hover:text-white transition-colors">Features</a>
                <a href="#demo" onClick={() => setIsMenuOpen(false)} className="hover:text-white transition-colors">Scanner</a>
                <button 
                  onClick={() => {
                    setIsMenuOpen(false);
                    document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="mt-2 w-full py-3 bg-white text-black rounded-xl font-bold active:scale-95 transition-all text-center"
                >
                  Get Access
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <main className="pt-32 pb-24 px-6 relative z-20">
        <div className="max-w-7xl mx-auto">
          {/* Hero Section */}
          <section className="text-center max-w-5xl mx-auto mb-20 space-y-8 relative z-20">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white leading-tight"
            >
              Stop <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-rose-500">Critical</span> Credential Leaks Before They Hit Production.
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed"
            >
              Instantly scan your code, commits, and documents for accidental API keys, secrets, and sensitive credentials.
            </motion.p>
          </section>

          {/* Scanner Section */}
          <section id="demo" className="max-w-2xl mx-auto mb-20 relative z-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="relative group"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/30 via-teal-500/20 to-emerald-500/30 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
              <div className="relative bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-8 h-8 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-center">
                    <ShieldAlert className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">LeakGuard Scanner</p>
                    <p className="text-xs text-zinc-500">Paste code or a GitHub repo URL below</p>
                  </div>
                  <div className="ml-auto flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
                  </div>
                </div>

                <div className="relative mb-4">
                  <textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && e.metaKey) handleScan(); }}
                    placeholder={"Paste your code, config file content,\nor a GitHub repo URL (https://github.com/owner/repo)"}
                    rows={6}
                    className="w-full bg-black/60 border border-zinc-800 focus:border-emerald-500/60 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none resize-none transition-colors duration-200 font-mono leading-relaxed"
                  />
                </div>

                <div className="flex flex-wrap gap-2 mb-5">
                  {['OpenAI Keys', 'AWS Credentials', 'Stripe Secrets', 'Gemini API Keys', 'DB URLs'].map(tag => (
                    <span key={tag} className="text-xs text-zinc-500 bg-zinc-800/70 border border-zinc-700/50 rounded-full px-3 py-0.5">
                      {tag}
                    </span>
                  ))}
                </div>

                <button
                  onClick={handleScan}
                  disabled={isScanning || !inputValue.trim()}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Scanning for Leaks...
                    </>
                  ) : (
                    <>
                      Scan
                      <ChevronRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>

            <AnimatePresence>
              {errorObj && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: 20 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-6 overflow-hidden"
                >
                  <div className="bg-red-900/20 rounded-xl border border-red-500/50 p-6 flex items-center gap-4 text-red-400">
                    <ShieldAlert className="w-8 h-8 shrink-0" />
                    <p className="font-medium text-sm">{errorObj}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {results && !errorObj && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: 20 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-6 overflow-hidden"
                >
                  <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 shadow-xl">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-4">
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        Scan Results
                        <span className={`text-sm px-2 py-0.5 rounded-full ${results.count > 0 ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                          {results.count} vulnerabilities found
                        </span>
                      </h3>
                      <div className="text-sm text-zinc-400 hidden sm:block">
                        Risk Score: <span className={`font-mono font-bold ${results.riskScore > 5 ? 'text-red-500' : 'text-emerald-500'}`}>{results.riskScore}/10</span>
                      </div>
                    </div>

                    {results.count === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                        <ShieldCheck className="w-16 h-16 text-emerald-500 mb-4 opacity-50" />
                        <p className="text-lg">No secrets or API keys detected. You're secure!</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {results.vulnerabilities.map((vuln: any, idx: number) => (
                          <div key={idx} className="bg-black border border-red-500/20 p-4 rounded-lg flex flex-col md:flex-row md:items-start justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="bg-red-500/10 text-red-500 text-xs font-bold px-2 py-0.5 rounded border border-red-500/20 uppercase">
                                  {vuln.severity}
                                </span>
                                <h4 className="font-semibold text-white">{vuln.type}</h4>
                              </div>
                              {vuln.link ? (
                                <a href={vuln.link} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-400 hover:text-emerald-300 hover:underline font-mono mt-2 flex items-center gap-1 group">
                                  {vuln.location}
                                  <ExternalLink className="w-3 h-3 opacity-70 group-hover:opacity-100" />
                                </a>
                              ) : (
                                <p className="text-sm text-zinc-400 font-mono mt-2">{vuln.location}</p>
                              )}
                            </div>
                            <div className="bg-red-500/5 px-4 py-2 rounded-md font-mono text-sm text-red-400 border border-red-500/10 md:w-1/2 break-all shadow-inner">
                              {vuln.preview}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          <section id="features" className="py-20 border-t border-white/5">
            <div className="text-center mb-16 underline-offset-4">
              <h2 className="text-3xl font-bold mb-4">Enterprise-Grade Security Engine</h2>
              <p className="text-zinc-400 max-w-2xl mx-auto">Our advanced detection model identifies High, Medium, and Low risk credentials with zero false positives.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl hover:bg-zinc-800/50 transition-colors">
                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-6">
                  <Github className="w-6 h-6 text-blue-500" />
                </div>
                <h3 className="text-xl font-bold mb-3">GitHub Repo Scanning</h3>
                <p className="text-zinc-400 leading-relaxed">Simply provide any public repository URL to instantly scan the entire codebase for accidentally committed secrets.</p>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl hover:bg-zinc-800/50 transition-colors">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-6">
                  <ShieldCheck className="w-6 h-6 text-emerald-500" />
                </div>
                <h3 className="text-xl font-bold mb-3">Multi-Vendor Support</h3>
                <p className="text-zinc-400 leading-relaxed">Smart algorithms detect 50+ credential types across multiple file types.</p>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl hover:bg-zinc-800/50 transition-colors">
                <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-6">
                  <ExternalLink className="w-6 h-6 text-purple-500" />
                </div>
                <h3 className="text-xl font-bold mb-3">1-Click Deep Links</h3>
                <p className="text-zinc-400 leading-relaxed">Found leaks are directly linked to the specific file and line on GitHub.</p>
              </div>
            </div>
          </section>
        </div>
      </main>
      
      <footer className="border-t border-white/5 py-12 text-center text-zinc-500 text-sm">
        <p>© 2026 LeakGuard Security Inc. All rights reserved.</p>
      </footer>
    </div>
  );
}
