import React from 'react';

export const StatusBadge = ({ status }) => {
  const styles = {
    Passed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    'In Progress': 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    Pending: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
    Quarantined: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    Reworked: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    Rejected: 'bg-rose-500/15 text-rose-400 border-rose-500/30'
  };

  const currentStyle = styles[status] || 'bg-slate-700 text-slate-300 border-slate-600';

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${currentStyle}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {status}
    </span>
  );
};

export const ResultBadge = ({ result }) => {
  if (result === 'PASS') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold tracking-wide uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
        ✓ PASS
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold tracking-wide uppercase bg-rose-500/20 text-rose-400 border border-rose-500/40">
      ✗ FAIL
    </span>
  );
};

export const PriorityBadge = ({ priority }) => {
  const styles = {
    Critical: 'text-rose-400 bg-rose-950/40 border-rose-800',
    High: 'text-amber-400 bg-amber-950/40 border-amber-800',
    Medium: 'text-blue-400 bg-blue-950/40 border-blue-800',
    Low: 'text-slate-400 bg-slate-800/40 border-slate-700'
  };

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded border ${styles[priority] || styles.Medium}`}>
      {priority}
    </span>
  );
};

