import React, { useState, useEffect } from 'react';
import { ShieldCheck, Activity, Clock, User, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Navbar = () => {
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 no-print">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 font-bold">
          <ShieldCheck className="w-5 h-5 text-sky-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-base text-white tracking-tight">QualityCheck Log</span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800">
              QCL v2.6
            </span>
          </div>
          <p className="text-xs text-slate-400 hidden sm:block">Small Batch Quality Inspection & Control System</p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Status indicator */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-300 font-mono">STATION ONLINE</span>
        </div>

        {/* Live Clock */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400 font-mono px-2.5 py-1 rounded bg-slate-800/40 border border-slate-800">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>{currentTime || '00:00:00'}</span>
        </div>

        {/* Start Inspection Quick Link */}
        <Link
          to="/inspect"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition-all"
        >
          <Activity className="w-3.5 h-3.5" />
          <span>New Inspection</span>
        </Link>

        {/* Inspector Profile badge */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
            <User className="w-4 h-4" />
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-medium text-slate-200">QA Inspector</div>
            <div className="text-[10px] text-slate-400">Station Alpha</div>
          </div>
        </div>
      </div>
    </header>
  );
};

