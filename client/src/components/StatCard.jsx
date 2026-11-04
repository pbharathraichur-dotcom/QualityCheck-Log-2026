import React from 'react';

export const StatCard = ({ title, value, subtitle, icon: Icon, color = 'sky', alert = false }) => {
  const colorMap = {
    sky: 'border-sky-500/20 hover:border-sky-500/40 text-sky-400 bg-sky-500/10',
    emerald: 'border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 bg-emerald-500/10',
    amber: 'border-amber-500/20 hover:border-amber-500/40 text-amber-400 bg-amber-500/10',
    rose: 'border-rose-500/20 hover:border-rose-500/40 text-rose-400 bg-rose-500/10',
    slate: 'border-slate-700 hover:border-slate-600 text-slate-300 bg-slate-800/40'
  };

  return (
    <div className={`relative p-5 rounded-xl bg-slate-900/80 border transition-all duration-200 backdrop-blur-sm ${alert ? 'border-amber-500/50 bg-amber-950/20' : 'border-slate-800 hover:border-slate-700'}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono tracking-tight text-white">{value}</span>
          </div>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-400 flex items-center gap-1">
              {subtitle}
            </p>
          )}
        </div>
        {Icon && (
          <div className={`p-3 rounded-lg border ${colorMap[color] || colorMap.sky}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
};

