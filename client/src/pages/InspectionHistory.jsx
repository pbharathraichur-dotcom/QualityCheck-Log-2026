import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ResultBadge, StatusBadge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { 
  History, 
  Search, 
  Filter, 
  FileText, 
  Eye, 
  CheckCircle2, 
  ShieldCheck, 
  RefreshCw,
  AlertTriangle,
  UserCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const InspectionHistory = () => {
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [resultFilter, setResultFilter] = useState('All');
  const [inspectorFilter, setInspectorFilter] = useState('All');

  // Modal inspection detail
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [qaSignerName, setQaSignerName] = useState('David Miller (QA Director)');
  const [signingOff, setSigningOff] = useState(false);

  const loadInspections = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getInspections({
        result: resultFilter,
        inspector: inspectorFilter
      });
      if (res.success) {
        setInspections(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load inspection history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInspections();
  }, [resultFilter, inspectorFilter]);

  const handleOpenDetail = async (id) => {
    try {
      const res = await api.getInspectionById(id);
      if (res.success) {
        setSelectedInspection(res.data);
        setIsDetailOpen(true);
      }
    } catch (err) {
      alert('Could not load inspection details');
    }
  };

  const handleQaSignOff = async () => {
    if (!selectedInspection) return;
    try {
      setSigningOff(true);
      const res = await api.signOffInspection(selectedInspection._id, {
        qaApprovedBy: qaSignerName
      });
      if (res.success) {
        setSelectedInspection(res.data);
        loadInspections();
      }
    } catch (err) {
      alert(`Sign-off error: ${err.message}`);
    } finally {
      setSigningOff(false);
    }
  };

  // Client-side search filtering
  const filteredInspections = inspections.filter(ins => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const cert = (ins.certificateNumber || '').toLowerCase();
    const batchNum = (ins.batchId?.batchNumber || '').toLowerCase();
    const sku = (ins.batchId?.sku || '').toLowerCase();
    const inspector = (ins.inspectorName || '').toLowerCase();
    return cert.includes(term) || batchNum.includes(term) || sku.includes(term) || inspector.includes(term);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Inspection Audit History</h1>
          <p className="text-xs text-slate-400 mt-1">Immutable chronological log of quality checkpoints, measurements and QA approvals</p>
        </div>

        <button
          onClick={loadInspections}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors self-start sm:self-auto"
          title="Refresh history"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Certificate, Batch #, or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Result Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">Result:</span>
            <select
              value={resultFilter}
              onChange={(e) => setResultFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="All">All Results</option>
              <option value="PASS">PASS</option>
              <option value="FAIL">FAIL</option>
            </select>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-800/60 border-b border-slate-800 text-slate-400 font-mono uppercase text-[11px]">
                <th className="py-3 px-4 font-semibold">Certificate Serial</th>
                <th className="py-3 px-4 font-semibold">Batch # / SKU</th>
                <th className="py-3 px-4 font-semibold">Date Inspected</th>
                <th className="py-3 px-4 font-semibold">Inspector</th>
                <th className="py-3 px-4 font-semibold">Pass Rate</th>
                <th className="py-3 px-4 font-semibold">Defects</th>
                <th className="py-3 px-4 font-semibold">Result</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-400" />
                    Loading inspection audit records...
                  </td>
                </tr>
              ) : filteredInspections.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-500">
                    No inspection records found.
                  </td>
                </tr>
              ) : (
                filteredInspections.map((ins) => (
                  <tr key={ins._id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-sky-400">
                      {ins.certificateNumber || 'N/A'}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-semibold text-slate-200">
                        {ins.batchId?.batchNumber || 'Batch Archived'}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">
                        {ins.batchId?.sku}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      {new Date(ins.inspectionDate).toLocaleDateString()} {new Date(ins.inspectionDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      <div>{ins.inspectorName}</div>
                      {ins.qaApprovedBy ? (
                        <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>QA Approved</span>
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-500">Pending QA Sign-off</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold">
                      <span className={ins.passRate >= 90 ? 'text-emerald-400' : 'text-amber-400'}>
                        {ins.passRate}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      {ins.defects?.length > 0 ? (
                        <span className="text-rose-400 font-semibold">{ins.defects.length} logged</span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <ResultBadge result={ins.overallResult} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenDetail(ins._id)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium inline-flex items-center gap-1 text-[11px]"
                        >
                          <Eye className="w-3.5 h-3.5 text-sky-400" />
                          <span>Audit</span>
                        </button>

                        {ins.batchId?._id && (
                          <Link
                            to={`/reports?batchId=${ins.batchId._id}`}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                            title="Certificate of Analysis"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* AUDIT DETAIL MODAL */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={`Inspection Audit: ${selectedInspection?.certificateNumber || ''}`}
        subtitle={`Batch: ${selectedInspection?.batchId?.batchNumber || ''} · ${selectedInspection?.batchId?.productName || ''}`}
        maxWidth="max-w-3xl"
      >
        {selectedInspection && (
          <div className="space-y-5 text-xs">
            {/* Meta header */}
            <div className="p-3.5 rounded-lg bg-slate-800/70 border border-slate-700 grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">Inspector</span>
                <span className="text-slate-200 font-semibold">{selectedInspection.inspectorName}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">Timestamp</span>
                <span className="text-slate-200">{new Date(selectedInspection.inspectionDate).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">Pass Rate</span>
                <span className="text-emerald-400 font-bold">{selectedInspection.passRate}%</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">Result</span>
                <ResultBadge result={selectedInspection.overallResult} />
              </div>
            </div>

            {/* Samples Breakdown */}
            <div className="space-y-3">
              <h4 className="font-semibold text-white uppercase font-mono text-[11px] text-sky-400">
                Sample Checkpoint Verification ({selectedInspection.samples?.length} Samples)
              </h4>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {selectedInspection.samples?.map((sample, sIdx) => (
                  <div key={sIdx} className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/80 space-y-2">
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="font-bold text-slate-200">Sample #{sample.sampleNumber}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${sample.samplePass ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                        {sample.samplePass ? 'SAMPLE PASS' : 'SAMPLE FAIL'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      {sample.results?.map((r, rIdx) => (
                        <div key={rIdx} className="p-2 rounded bg-slate-900 border border-slate-800 flex items-center justify-between">
                          <div>
                            <div className="font-medium text-slate-300">{r.checkpointName}</div>
                            <div className="text-[10px] font-mono text-slate-500">
                              Target: {r.nominal} [{r.minTolerance} - {r.maxTolerance}] {r.unit}
                            </div>
                          </div>
                          <div className="text-right font-mono">
                            <div className={`font-bold ${r.isPass ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {typeof r.value === 'boolean' ? (r.value ? 'PASS' : 'FAIL') : `${r.value} ${r.unit}`}
                            </div>
                            {typeof r.deviation === 'number' && (
                              <div className="text-[10px] text-slate-400">
                                Δ {r.deviation >= 0 ? `+${r.deviation}` : r.deviation}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Defects Logged */}
            {selectedInspection.defects?.length > 0 && (
              <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-800/40 space-y-2">
                <span className="font-mono text-xs font-bold text-rose-400 uppercase">
                  Flagged Defects ({selectedInspection.defects.length})
                </span>
                <div className="space-y-1.5">
                  {selectedInspection.defects.map((d, i) => (
                    <div key={i} className="text-xs text-slate-300 flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                      <div>
                        <span className="font-semibold text-rose-300">[{d.category} · {d.severity}]</span> {d.description}
                        <div className="text-[10px] text-slate-400 font-mono">Action: {d.actionTaken}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* QA Approval Block */}
            <div className="p-3.5 rounded-lg bg-slate-800 border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase font-mono text-slate-400 block">QA Management Sign-Off</span>
                {selectedInspection.qaApprovedBy ? (
                  <div className="text-emerald-400 font-semibold flex items-center gap-1.5 mt-0.5">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Signed off by {selectedInspection.qaApprovedBy} on {new Date(selectedInspection.qaApprovedAt).toLocaleDateString()}</span>
                  </div>
                ) : (
                  <div className="text-amber-400 text-xs mt-0.5">
                    Awaiting Quality Director sign-off approval.
                  </div>
                )}
              </div>

              {!selectedInspection.qaApprovedBy && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={qaSignerName}
                    onChange={(e) => setQaSignerName(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white"
                  />
                  <button
                    onClick={handleQaSignOff}
                    disabled={signingOff}
                    className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs whitespace-nowrap"
                  >
                    {signingOff ? 'Signing...' : 'Authorize Sign-Off'}
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              {selectedInspection.batchId?._id && (
                <Link
                  to={`/reports?batchId=${selectedInspection.batchId._id}`}
                  className="px-4 py-2 rounded bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Open Printable Certificate (CoA)</span>
                </Link>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

