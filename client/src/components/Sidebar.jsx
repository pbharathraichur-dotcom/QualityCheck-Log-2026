import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Boxes, 
  ClipboardCheck, 
  ArrowLeftRight, 
  History, 
  FileText,
  AlertTriangle,
  Settings
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard, exact: true },
  { name: 'Manage Batches', path: '/batches', icon: Boxes },
  { name: 'New Inspection', path: '/inspect', icon: ClipboardCheck },
  { name: 'Batch Comparison', path: '/compare', icon: ArrowLeftRight },
  { name: 'Inspection History', path: '/history', icon: History },
  { name: 'Quality Reports', path: '/reports', icon: FileText },
];

export const Sidebar = () => {
  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-900/60 flex flex-col shrink-0 no-print">
      <div className="p-4 border-b border-slate-800/80">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
          Quality Control Modules
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.exact}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* System standard note */}
      <div className="p-4 mt-auto">
        <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-800 text-xs text-slate-400 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-slate-300">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            <span>ISO 9001 Compliance</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Zero-defect small-batch tolerance gates active. Auto-quarantine enforced on critical breaches.
          </p>
        </div>
      </div>
    </aside>
  );
};

