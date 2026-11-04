import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { StatusBadge } from '../components/Badge';
import { 
  ArrowLeftRight, 
  CheckCircle2, 
  AlertTriangle, 
  Award, 
  TrendingUp, 
  Layers, 
  RefreshCw,
  Sliders,
  Scale
} from 'lucide-react';

export const BatchComparison = () => {
  const [batches, setBatches] = useState([]);
  const [selectedBatchIds, setSelectedBatchIds] = useState([]);
  const [comparisonData, setComparisonData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load all available batches
  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const res = await api.getBatches();
        if (res.success && res.data.length >= 2) {
          setBatches(res.data);
          // Auto select first 2 batches
          setSelectedBatchIds([res.data[0]._id, res.data[1]._id]);
        }
      } catch (err) {
        console.error('Failed to load batches for comparison', err);
      }
    };
    fetchBatches();
  }, []);

  // Run comparison when selectedBatchIds changes
  useEffect(() => {
    if (selectedBatchIds.length < 2) return;

    const runComparison = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.compareBatches(selectedBatchIds);
        if (res.success) {
          setComparisonData(res.data);
        }
      } catch (err) {
        setError(err.message || 'Comparison failed');
      } finally {
        setLoading(false);
      }
    };

    runComparison();
  }, [selectedBatchIds]);

  const toggleBatchSelection = (id) => {
    setSelectedBatchIds(prev => {
      if (prev.includes(id)) {
        if (prev.length <= 2) {
          alert('You must keep at least 2 batches selected for comparison.');
          return prev;
        }
        return prev.filter(item => item !== id);
      } else {
        if (prev.length >= 4) {
          alert('Maximum 4 batches can be compared simultaneously.');
          return prev;
        }
        return [...prev, id];
      }
    });
  };

  // Find shared checkpoint names across batches
  const getSharedCheckpoints = () => {
    if (comparisonData.length === 0) return [];
    const allCpNames = new Set();
    comparisonData.forEach(b => {
      b.checkpoints?.forEach(cp => allCpNames.add(cp.name));
    });
    return Array.from(allCpNames);
  };

  const sharedCheckpoints = getSharedCheckpoints();

  // Determine top batch by qualityScore
  const topBatch = comparisonData.length > 0 
    ? [...comparisonData].sort((a, b) => b.qualityScore - a.qualityScore)[0] 
    : null;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Batch Quality Comparison</h1>
          <p className="text-xs text-slate-400 mt-1">Multi-batch comparative variance, tolerance capability & defect frequency</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400">Comparing {selectedBatchIds.length} Batches</span>
        </div>
      </div>

      {/* Batch Selector Pills */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
        <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block">
          Select 2 to 4 Batches to Compare:
        </span>
        <div className="flex flex-wrap gap-2">
          {batches.map(batch => {
            const isSelected = selectedBatchIds.includes(batch._id);
            return (
              <button
                key={batch._id}
                onClick={() => toggleBatchSelection(batch._id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-all border ${
                  isSelected
                    ? 'bg-sky-600/20 text-sky-400 border-sky-500/50 shadow-sm'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-sky-400' : 'bg-slate-600'}`} />
                <span className="font-semibold">{batch.batchNumber}</span>
                <span className="text-slate-400 font-sans">({batch.sku})</span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-400" />
          Computing cross-batch variance & quality indices...
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-xl text-center text-rose-400 text-xs">
          {error}
        </div>
      ) : comparisonData.length > 0 ? (
        <div className="space-y-6">
          {/* Executive Comparative Verdict Banner */}
          {topBatch && (
            <div className="p-4 rounded-xl bg-sky-950/20 border border-sky-500/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-sky-400 font-mono">
                    Superior Quality Performance: {topBatch.batchNumber}
                  </h4>
                  <p className="text-xs text-slate-300">
                    Highest Quality Index ({topBatch.qualityScore}/100) with {topBatch.samplePassRate}% conformance and {topBatch.totalDefects} defects.
                  </p>
                </div>
              </div>
              <div className="hidden sm:block text-right font-mono text-xs text-slate-400">
                Process Stability: <span className="text-emerald-400 font-semibold">OPTIMAL</span>
              </div>
            </div>
          )}

          {/* Side-by-side KPI Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {comparisonData.map(b => (
              <div
                key={b.batchId}
                className={`p-5 rounded-xl bg-slate-900 border transition-all ${
                  topBatch?.batchId === b.batchId
                    ? 'border-sky-500/50 shadow-lg shadow-sky-950'
                    : 'border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono font-bold text-sky-400">{b.batchNumber}</span>
                  <StatusBadge status={b.status} />
                </div>

                <div className="space-y-1 mb-4">
                  <h3 className="font-semibold text-slate-100 text-sm truncate">{b.productName}</h3>
                  <p className="text-xs font-mono text-slate-400">{b.sku} · {b.productionLine}</p>
                </div>

                <div className="space-y-2.5 pt-3 border-t border-slate-800 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Quality Score:</span>
                    <span className="font-mono font-bold text-white text-sm bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                      {b.qualityScore} / 100
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Pass Rate:</span>
                    <span className={`font-mono font-semibold ${b.samplePassRate >= 90 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {b.samplePassRate}%
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Defects Logged:</span>
                    <span className={`font-mono font-semibold ${b.totalDefects > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                      {b.totalDefects}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Lot & Samples:</span>
                    <span className="font-mono text-slate-300">
                      {b.sampleSize} / {b.totalQuantity} units
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Inspector:</span>
                    <span className="text-slate-300 truncate max-w-[120px]">{b.inspector}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Checkpoint Dimensional Variance Table */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-white tracking-wide">Dimensional & Tolerance Variance Comparison</h3>
              <p className="text-xs text-slate-400">Compares nominal target vs measured average and range across batches</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-800/60 border-b border-slate-800 text-slate-400 font-mono uppercase text-[11px]">
                    <th className="py-3 px-4 font-semibold">Checkpoint Specification</th>
                    <th className="py-3 px-4 font-semibold">Spec Target [LSL - USL]</th>
                    {comparisonData.map(b => (
                      <th key={b.batchId} className="py-3 px-4 font-semibold font-mono text-sky-400">
                        {b.batchNumber} (Avg / Range)
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {sharedCheckpoints.length === 0 ? (
                    <tr>
                      <td colSpan={comparisonData.length + 2} className="py-6 text-center text-slate-500">
                        No shared checkpoints found between selected batches.
                      </td>
                    </tr>
                  ) : (
                    sharedCheckpoints.map((cpName, idx) => {
                      // Find first batch's spec for reference
                      const refCp = comparisonData.find(b => b.checkpoints?.some(c => c.name === cpName))
                        ?.checkpoints?.find(c => c.name === cpName);

                      return (
                        <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-medium text-slate-200">
                            {cpName}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-400">
                            {refCp?.type === 'quantitative' ? (
                              <span>
                                {refCp.nominal} {refCp.unit} [{refCp.minTolerance} - {refCp.maxTolerance}]
                              </span>
                            ) : (
                              <span>Qualitative Pass/Fail</span>
                            )}
                          </td>
                          {comparisonData.map(b => {
                            const cp = b.checkpoints?.find(c => c.name === cpName);
                            if (!cp) {
                              return (
                                <td key={b.batchId} className="py-3 px-4 text-slate-500 font-mono">
                                  Not Tested
                                </td>
                              );
                            }

                            if (cp.type === 'quantitative' && typeof cp.average === 'number') {
                              return (
                                <td key={b.batchId} className="py-3 px-4 font-mono">
                                  <div className="font-semibold text-slate-200">
                                    {cp.average} {cp.unit}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    Range: {cp.range} (min: {cp.min}, max: {cp.max})
                                  </div>
                                </td>
                              );
                            }

                            return (
                              <td key={b.batchId} className="py-3 px-4 font-mono">
                                <span className={cp.passRate >= 90 ? 'text-emerald-400' : 'text-amber-400'}>
                                  {cp.passRate}% Pass Rate
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

