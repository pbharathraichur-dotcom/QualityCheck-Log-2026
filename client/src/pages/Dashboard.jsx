import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { StatCard } from '../components/StatCard';
import { StatusBadge, ResultBadge } from '../components/Badge';
import { 
  Boxes, 
  CheckCircle, 
  AlertOctagon, 
  TrendingUp, 
  ArrowRight, 
  RefreshCw,
  Award,
  Layers,
  FileText
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getDashboardStats();
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-sky-400 animate-spin" />
          <p className="text-sm text-slate-400">Loading Quality Control Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-xl text-center space-y-3">
        <AlertOctagon className="w-10 h-10 text-rose-400 mx-auto" />
        <h3 className="text-base font-semibold text-rose-300">Unable to load dashboard data</h3>
        <p className="text-xs text-rose-400">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const { summary, pareto = [], weeklyTrends = [], recentInspections = [] } = data || {};

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Quality Inspection Dashboard</h1>
          <p className="text-xs text-slate-400 mt-1">Real-time small-batch compliance monitoring & tolerance metrics</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboardData}
            title="Refresh Metrics"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link
            to="/batches"
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <Boxes className="w-4 h-4 text-slate-400" />
            <span>Manage Batches</span>
          </Link>
          <Link
            to="/inspect"
            className="px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-600/20 flex items-center gap-1.5 transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Launch Inspection</span>
          </Link>
        </div>
      </div>

      {/* KPI Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Batches"
          value={summary?.totalBatches || 0}
          subtitle={`${summary?.pendingBatches || 0} Pending · ${summary?.inProgressBatches || 0} In Progress`}
          icon={Boxes}
          color="slate"
        />

        <StatCard
          title="Batch Pass Rate"
          value={`${summary?.overallPassRate || 0}%`}
          subtitle={`${summary?.passedBatches || 0} of ${summary?.totalCompleted || 0} completed lots`}
          icon={CheckCircle}
          color="emerald"
        />

        <StatCard
          title="First Pass Yield (FPY)"
          value={`${summary?.fpyRate || 0}%`}
          subtitle="Passed on initial inspection without rework"
          icon={TrendingUp}
          color="sky"
        />

        <StatCard
          title="Active Quarantine / NCR"
          value={summary?.quarantinedBatches || 0}
          subtitle={`${summary?.totalDefectsCount || 0} total defects flagged`}
          icon={AlertOctagon}
          color={summary?.quarantinedBatches > 0 ? "amber" : "slate"}
          alert={summary?.quarantinedBatches > 0}
        />
      </div>

      {/* Visual Analytics Grid: Defect Pareto + 7-Day Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pareto Defect Breakdown */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white tracking-wide">Defect Pareto Analysis (80/20)</h3>
                <p className="text-xs text-slate-400">Frequency breakdown by defect category & cumulative impact</p>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {summary?.totalDefectsCount || 0} Total Defects
              </span>
            </div>

            {pareto.length === 0 || summary?.totalDefectsCount === 0 ? (
              <div className="h-48 flex items-center justify-center text-slate-500 text-xs">
                Zero defects recorded across current inspection runs.
              </div>
            ) : (
              <div className="space-y-3.5 my-2">
                {pareto.map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-300">{item.category}</span>
                      <span className="font-mono text-slate-400">
                        {item.count} defects ({item.percentage}%) · Cumulative: {item.cumulativePercentage}%
                      </span>
                    </div>
                    {/* Visual Progress Bar */}
                    <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden flex">
                      <div
                        className="bg-amber-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(item.percentage, 4)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Small-batch rule: Any single critical defect immediately quarantines the batch.</span>
          </div>
        </div>

        {/* 7-Day Inspection Trend */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white tracking-wide">7-Day Inspection Activity</h3>
                <p className="text-xs text-slate-400">Daily pass vs non-conformance outcome</p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Pass
                </span>
                <span className="flex items-center gap-1.5 text-rose-400">
                  <span className="w-2 h-2 rounded-full bg-rose-500" /> Fail / NCR
                </span>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 h-44 items-end pt-4 pb-2 border-b border-slate-800">
              {weeklyTrends.map((day, idx) => {
                const total = day.pass + day.fail;
                const maxHeight = 100;
                const passHeight = total > 0 ? Math.min(100, (day.pass / (total + 1)) * 100) : 0;
                const failHeight = total > 0 ? Math.min(100, (day.fail / (total + 1)) * 100) : 0;

                return (
                  <div key={idx} className="flex flex-col items-center gap-2 h-full justify-end">
                    <div className="w-full max-w-[32px] flex flex-col items-center gap-0.5 justify-end h-32">
                      {day.fail > 0 && (
                        <div
                          className="w-full bg-rose-500/80 rounded-t text-[9px] text-center text-white font-mono"
                          style={{ height: `${Math.max(failHeight, 18)}px` }}
                          title={`Fail: ${day.fail}`}
                        >
                          {day.fail}
                        </div>
                      )}
                      {day.pass > 0 && (
                        <div
                          className="w-full bg-emerald-500/80 rounded-t text-[9px] text-center text-white font-mono"
                          style={{ height: `${Math.max(passHeight, 20)}px` }}
                          title={`Pass: ${day.pass}`}
                        >
                          {day.pass}
                        </div>
                      )}
                      {total === 0 && (
                        <div className="w-full h-1 bg-slate-800 rounded" />
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 text-center truncate w-full">
                      {day.date}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
            <span>Overall Process Capability: Stable</span>
            <Link to="/history" className="text-sky-400 hover:text-sky-300 flex items-center gap-1 font-medium">
              <span>View Audit Logs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Inspections Table */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wide">Recent Inspection Logs</h3>
            <p className="text-xs text-slate-400">Latest executed quality checkpoints and digital sign-offs</p>
          </div>
          <Link
            to="/history"
            className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1"
          >
            <span>Full History</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase text-[11px]">
                <th className="pb-3 font-semibold">Certificate / Ref</th>
                <th className="pb-3 font-semibold">Batch #</th>
                <th className="pb-3 font-semibold">SKU & Product</th>
                <th className="pb-3 font-semibold">Inspector</th>
                <th className="pb-3 font-semibold">Pass Rate</th>
                <th className="pb-3 font-semibold">Result</th>
                <th className="pb-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {recentInspections.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-6 text-center text-slate-500">
                    No inspections recorded yet.
                  </td>
                </tr>
              ) : (
                recentInspections.map((ins) => (
                  <tr key={ins._id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 font-mono text-slate-300 font-medium">
                      {ins.certificateNumber || 'N/A'}
                    </td>
                    <td className="py-3 font-mono font-semibold text-sky-400">
                      {ins.batchId?.batchNumber || 'Batch Removed'}
                    </td>
                    <td className="py-3">
                      <div className="font-medium text-slate-200">{ins.batchId?.productName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{ins.batchId?.sku}</div>
                    </td>
                    <td className="py-3 text-slate-300">{ins.inspectorName}</td>
                    <td className="py-3 font-mono font-semibold">
                      <span className={ins.passRate >= 95 ? 'text-emerald-400' : 'text-amber-400'}>
                        {ins.passRate}%
                      </span>
                    </td>
                    <td className="py-3">
                      <ResultBadge result={ins.overallResult} />
                    </td>
                    <td className="py-3 text-right">
                      {ins.batchId?._id ? (
                        <Link
                          to={`/reports?batchId=${ins.batchId._id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] transition-colors"
                        >
                          <FileText className="w-3 h-3 text-sky-400" />
                          <span>CoA</span>
                        </Link>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

