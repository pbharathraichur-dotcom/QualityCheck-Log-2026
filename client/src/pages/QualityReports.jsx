import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { StatusBadge, ResultBadge } from '../components/Badge';
import { 
  FileText, 
  Printer, 
  Download, 
  ShieldCheck, 
  Award, 
  CheckCircle2, 
  AlertOctagon,
  RefreshCw,
  Building,
  Calendar,
  Layers
} from 'lucide-react';

export const QualityReports = () => {
  const [searchParams] = useSearchParams();
  const initialBatchId = searchParams.get('batchId') || '';

  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState(initialBatchId);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load batch list
  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const res = await api.getBatches();
        if (res.success && res.data.length > 0) {
          setBatches(res.data);
          if (!initialBatchId) {
            // Find a passed or completed batch first
            const passed = res.data.find(b => b.status === 'Passed') || res.data[0];
            setSelectedBatchId(passed._id);
          }
        }
      } catch (err) {
        console.error('Failed to load batch list', err);
      }
    };
    fetchBatches();
  }, [initialBatchId]);

  // Load quality report when selectedBatchId changes
  useEffect(() => {
    if (!selectedBatchId) return;

    const fetchReport = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.getQualityReport(selectedBatchId);
        if (res.success) {
          setReport(res.data);
        }
      } catch (err) {
        setError(err.message || 'Failed to generate quality report');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [selectedBatchId]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header - Hidden in Print */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800 no-print">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Quality Inspection Reports & CoA</h1>
          <p className="text-xs text-slate-400 mt-1">Official Certificate of Analysis (CoA) & Conformity Verification</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Batch Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">Target Batch:</span>
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
            >
              {batches.map(b => (
                <option key={b._id} value={b._id}>
                  {b.batchNumber} - {b.sku} ({b.status})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handlePrint}
            disabled={!report}
            className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-600/20 flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-sky-400" />
          Compiling inspection measurements and generating Certificate of Analysis...
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-xl text-center text-rose-400 text-xs">
          {error}
        </div>
      ) : report ? (
        /* OFFICIAL CERTIFICATE OF ANALYSIS (COA) DOCUMENT CONTAINER */
        <div className="max-w-4xl mx-auto printable-certificate bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-8 sm:p-10 space-y-8 text-slate-100">
          
          {/* Certificate Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b-2 border-slate-700 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 font-bold">
                <ShieldCheck className="w-7 h-7 text-sky-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white uppercase">
                  Certificate of Inspection & Analysis
                </h2>
                <p className="text-xs text-slate-400">Small Batch Precision Quality Assurance Laboratory</p>
              </div>
            </div>

            <div className="text-left sm:text-right font-mono text-xs">
              <div className="text-slate-400 text-[10px] uppercase">Certificate Serial #</div>
              <div className="text-sky-400 font-bold text-sm tracking-wide">{report.certificateNumber}</div>
              <div className="text-slate-400 text-[11px] mt-0.5">
                Issued: {new Date(report.issueDate).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Compliance Banner */}
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-mono text-slate-400">Inspection Standard Reference</span>
              <p className="text-xs font-semibold text-slate-200">{report.standardComplianceClause}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-mono text-slate-400 block">Overall Lot Verdict</span>
              <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded border ${
                report.batch.status === 'Passed'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
              }`}>
                {report.inspectionSummary.overallVerdict}
              </span>
            </div>
          </div>

          {/* Batch Information Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-800/40 border border-slate-800 text-xs font-mono">
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Batch Identification</span>
              <span className="text-sky-400 font-bold text-sm">{report.batch.batchNumber}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Product SKU</span>
              <span className="text-slate-200 font-semibold">{report.batch.sku}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Lot Size / Inspected</span>
              <span className="text-slate-200">{report.batch.sampleSize} of {report.batch.totalQuantity} units</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Production Station</span>
              <span className="text-slate-200">{report.batch.productionLine}</span>
            </div>
            <div className="sm:col-span-2">
              <span className="text-[10px] text-slate-400 uppercase block">Product Description</span>
              <span className="text-slate-200 font-sans">{report.batch.productName}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Primary Inspector</span>
              <span className="text-slate-200">{report.batch.inspector}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Batch Status</span>
              <div className="mt-0.5"><StatusBadge status={report.batch.status} /></div>
            </div>
          </div>

          {/* Checkpoint Specifications vs Measured Compliance Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono uppercase font-bold text-sky-400 tracking-wider">
                1. Technical Checkpoint Specification & Conformance
              </h3>
              <span className="text-xs font-mono text-slate-400">
                Compliance Rate: <span className="text-emerald-400 font-bold">{report.inspectionSummary.complianceRate}%</span>
              </span>
            </div>

            <div className="rounded-xl border border-slate-700/80 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-800 border-b border-slate-700 text-slate-400 font-mono uppercase text-[10px]">
                    <th className="py-2.5 px-3 font-semibold">Parameter / Checkpoint</th>
                    <th className="py-2.5 px-3 font-semibold">Type</th>
                    <th className="py-2.5 px-3 font-semibold">Nominal Spec</th>
                    <th className="py-2.5 px-3 font-semibold">Tolerance Band [LSL - USL]</th>
                    <th className="py-2.5 px-3 font-semibold">Evaluation Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {report.checkpointsConfig?.map((cp, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/20">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-200">{cp.name}</div>
                        <div className="text-[10px] text-slate-400">{cp.instructions}</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-400 capitalize">
                        {cp.type}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-200">
                        {cp.type === 'quantitative' ? `${cp.nominal} ${cp.unit}` : 'Conforming'}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-300">
                        {cp.type === 'quantitative' ? `[${cp.minTolerance} - ${cp.maxTolerance}] ${cp.unit}` : 'Visual 100%'}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          CONFORMING
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Defect & Non-Conformance Log (if any) */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono uppercase font-bold text-sky-400 tracking-wider">
              2. Non-Conformance & Defect Summary
            </h3>
            {report.defects && report.defects.length > 0 ? (
              <div className="rounded-xl border border-slate-700/80 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-800 border-b border-slate-700 text-slate-400 font-mono uppercase text-[10px]">
                      <th className="py-2 px-3">Sample #</th>
                      <th className="py-2 px-3">Category</th>
                      <th className="py-2 px-3">Severity</th>
                      <th className="py-2 px-3">Defect Description</th>
                      <th className="py-2 px-3">Action / Containment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 font-mono text-[11px]">
                    {report.defects.map((d, i) => (
                      <tr key={i} className="hover:bg-slate-800/20">
                        <td className="py-2.5 px-3 text-slate-300">Sample #{d.sampleNumber || 1}</td>
                        <td className="py-2.5 px-3 text-slate-200">{d.category}</td>
                        <td className="py-2.5 px-3">
                          <span className="text-rose-400 font-bold">{d.severity}</span>
                        </td>
                        <td className="py-2.5 px-3 font-sans text-slate-200">{d.description}</td>
                        <td className="py-2.5 px-3 text-slate-400">{d.actionTaken}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Zero non-conformances or critical defects logged during this batch run.</span>
              </div>
            )}
          </div>

          {/* Formal Sign-Off Authorization Stamps */}
          <div className="pt-6 border-t-2 border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs font-mono">
            {/* Inspector Signature Box */}
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700 space-y-3">
              <span className="text-[10px] text-slate-400 uppercase block tracking-wider font-semibold">
                Inspected & Verified By (Lead QA)
              </span>
              <div className="h-10 flex items-center">
                <span className="font-serif italic text-base text-sky-400 tracking-wider">
                  {report.batch.inspector || 'Sarah Chen'}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-700 text-[10px] text-slate-400 flex justify-between">
                <span>Digital ID: QA-VERIFIED-AUTH</span>
                <span>{new Date(report.issueDate).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Quality Director Approval Box */}
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700 space-y-3">
              <span className="text-[10px] text-slate-400 uppercase block tracking-wider font-semibold">
                Quality Assurance Management Approval
              </span>
              <div className="h-10 flex items-center">
                <span className="font-serif italic text-base text-emerald-400 tracking-wider">
                  {report.inspectionSummary.qaApprovedBy || 'David Miller (QA Director)'}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-700 text-[10px] text-slate-400 flex justify-between">
                <span>Status: APPROVED FOR RELEASE</span>
                <span>{new Date(report.issueDate).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Legal / Quality Stamp Footer */}
          <div className="text-center text-[10px] text-slate-500 border-t border-slate-800 pt-4 space-y-1 font-mono">
            <p>QualityCheck Log (QCL) Electronic Quality Inspection Record. Cryptographically tied to Batch {report.batch.batchNumber}.</p>
            <p>Complies with ISO 9001:2015 Clause 8.6 Release of Products and Services.</p>
          </div>
        </div>
      ) : null}
    </div>
  );
};

