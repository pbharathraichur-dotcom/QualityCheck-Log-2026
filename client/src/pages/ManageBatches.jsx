import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { StatusBadge, PriorityBadge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { 
  Boxes, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle, 
  AlertTriangle, 
  Trash2, 
  Eye, 
  FileText, 
  ClipboardCheck, 
  Layers, 
  RefreshCw,
  Wrench,
  X
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export const ManageBatches = () => {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDispositionOpen, setIsDispositionOpen] = useState(false);
  const [dispositionForm, setDispositionForm] = useState({ type: 'Rework', notes: '', decidedBy: 'QA Lead' });

  // New Batch Form state
  const [newBatch, setNewBatch] = useState({
    batchNumber: '',
    sku: '',
    productName: '',
    totalQuantity: 25,
    sampleSize: 5,
    productionLine: 'Line 1 - Precision CNC',
    operator: 'Operator 1',
    inspector: 'Sarah Chen (Lead QA)',
    priority: 'Medium',
    notes: '',
    checkpoints: [
      {
        name: 'Outer Dimension (OD)',
        type: 'quantitative',
        unit: 'mm',
        nominal: 25.0,
        minTolerance: 24.8,
        maxTolerance: 25.2,
        critical: true,
        instructions: 'Calibrated digital caliper at midpoint'
      },
      {
        name: 'Length / Depth',
        type: 'quantitative',
        unit: 'mm',
        nominal: 40.0,
        minTolerance: 39.7,
        maxTolerance: 40.3,
        critical: false,
        instructions: 'Overall part length'
      },
      {
        name: 'Visual & Surface Deburring',
        type: 'qualitative',
        unit: 'Pass/Fail',
        nominal: 1,
        minTolerance: 1,
        maxTolerance: 1,
        critical: true,
        instructions: 'No sharp flash, chatter marks or scratches'
      }
    ]
  });

  const navigate = useNavigate();

  const loadBatches = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getBatches({
        status: statusFilter,
        priority: priorityFilter,
        search: searchTerm
      });
      if (res.success) {
        setBatches(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch batches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBatches();
  }, [statusFilter, priorityFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadBatches();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleAddCheckpoint = () => {
    setNewBatch(prev => ({
      ...prev,
      checkpoints: [
        ...prev.checkpoints,
        {
          name: '',
          type: 'quantitative',
          unit: 'mm',
          nominal: 10.0,
          minTolerance: 9.8,
          maxTolerance: 10.2,
          critical: false,
          instructions: ''
        }
      ]
    }));
  };

  const handleRemoveCheckpoint = (idx) => {
    setNewBatch(prev => ({
      ...prev,
      checkpoints: prev.checkpoints.filter((_, i) => i !== idx)
    }));
  };

  const handleCheckpointChange = (idx, field, value) => {
    setNewBatch(prev => {
      const updated = [...prev.checkpoints];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...prev, checkpoints: updated };
    });
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!newBatch.batchNumber || !newBatch.sku || !newBatch.productName) {
        alert('Please fill all mandatory fields (Batch #, SKU, Product Name).');
        return;
      }
      const res = await api.createBatch(newBatch);
      if (res.success) {
        setIsCreateOpen(false);
        // Reset form
        setNewBatch(prev => ({
          ...prev,
          batchNumber: '',
          sku: '',
          productName: '',
          notes: ''
        }));
        loadBatches();
      }
    } catch (err) {
      alert(`Error creating batch: ${err.message}`);
    }
  };

  const handleDeleteBatch = async (id, batchNumber) => {
    if (!window.confirm(`Are you sure you want to delete Batch "${batchNumber}" and its inspections?`)) return;
    try {
      await api.deleteBatch(id);
      loadBatches();
    } catch (err) {
      alert(`Delete error: ${err.message}`);
    }
  };

  const handleOpenDetails = async (id) => {
    try {
      const res = await api.getBatchById(id);
      if (res.success) {
        setSelectedBatch(res.data);
        setIsDetailOpen(true);
      }
    } catch (err) {
      alert('Could not load batch details');
    }
  };

  const handleOpenDisposition = (batch) => {
    setSelectedBatch(batch);
    setDispositionForm({
      type: batch.disposition?.type !== 'None' ? batch.disposition.type : 'Rework',
      notes: batch.disposition?.notes || '',
      decidedBy: 'QA Lead'
    });
    setIsDispositionOpen(true);
  };

  const handleSaveDisposition = async (e) => {
    e.preventDefault();
    try {
      await api.updateDisposition(selectedBatch._id, dispositionForm);
      setIsDispositionOpen(false);
      loadBatches();
    } catch (err) {
      alert(`Disposition error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Batch Quality Management</h1>
          <p className="text-xs text-slate-400 mt-1">Configure production work orders, checkpoints, and quality quarantine states</p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-600/20 flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Batch</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Batch #, SKU, or Product..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Passed">Passed</option>
              <option value="Quarantined">Quarantined</option>
              <option value="Reworked">Reworked</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="All">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          <button
            onClick={loadBatches}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Batches Table */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-800/60 border-b border-slate-800 text-slate-400 font-mono uppercase text-[11px]">
                <th className="py-3 px-4 font-semibold">Batch Number</th>
                <th className="py-3 px-4 font-semibold">SKU / Product</th>
                <th className="py-3 px-4 font-semibold">Line / Station</th>
                <th className="py-3 px-4 font-semibold">Lot / Sample Qty</th>
                <th className="py-3 px-4 font-semibold">Priority</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-400" />
                    Loading batches...
                  </td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-500">
                    No batches match the selected criteria.
                  </td>
                </tr>
              ) : (
                batches.map((batch) => (
                  <tr key={batch._id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-sky-400">
                      {batch.batchNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-100">{batch.productName}</div>
                      <div className="text-[11px] font-mono text-slate-400">{batch.sku}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      <div>{batch.productionLine}</div>
                      <div className="text-[10px] text-slate-500">{batch.operator}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-200">
                      {batch.sampleSize} / {batch.totalQuantity} units
                    </td>
                    <td className="py-3.5 px-4">
                      <PriorityBadge priority={batch.priority} />
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={batch.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Inspect Button */}
                        <Link
                          to={`/inspect?batchId=${batch._id}`}
                          title="Run Inspection"
                          className="px-2.5 py-1 rounded bg-sky-600/20 hover:bg-sky-600/30 text-sky-400 border border-sky-600/30 font-medium inline-flex items-center gap-1 text-[11px]"
                        >
                          <ClipboardCheck className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </Link>

                        {/* View Details */}
                        <button
                          onClick={() => handleOpenDetails(batch._id)}
                          title="View Specifications & History"
                          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Disposition button for Quarantined / Rejected */}
                        {(batch.status === 'Quarantined' || batch.status === 'Rejected') && (
                          <button
                            onClick={() => handleOpenDisposition(batch)}
                            title="Manage Quarantine Disposition"
                            className="p-1.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30"
                          >
                            <Wrench className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* CoA Report */}
                        <Link
                          to={`/reports?batchId=${batch._id}`}
                          title="Certificate of Analysis"
                          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </Link>

                        {/* Delete */}
                        <button
                          onClick={() => handleDeleteBatch(batch._id, batch.batchNumber)}
                          title="Delete Batch"
                          className="p-1.5 rounded bg-slate-800 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 border border-slate-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE NEW BATCH MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Small Batch Order"
        subtitle="Specify product attributes, lot volume, and quality inspection criteria"
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">Batch Number *</label>
              <input
                type="text"
                placeholder="e.g. BAT-2026-007"
                required
                value={newBatch.batchNumber}
                onChange={(e) => setNewBatch({ ...newBatch, batchNumber: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white uppercase focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">Product SKU *</label>
              <input
                type="text"
                placeholder="e.g. SKU-AERO-02"
                required
                value={newBatch.sku}
                onChange={(e) => setNewBatch({ ...newBatch, sku: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white uppercase focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-mono text-slate-300 mb-1">Product Name & Description *</label>
              <input
                type="text"
                placeholder="e.g. Precision CNC Machined Shaft 15mm"
                required
                value={newBatch.productName}
                onChange={(e) => setNewBatch({ ...newBatch, productName: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">Total Lot Quantity *</label>
              <input
                type="number"
                min="1"
                required
                value={newBatch.totalQuantity}
                onChange={(e) => setNewBatch({ ...newBatch, totalQuantity: Number(e.target.value) })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">Quality Sample Size *</label>
              <input
                type="number"
                min="1"
                required
                value={newBatch.sampleSize}
                onChange={(e) => setNewBatch({ ...newBatch, sampleSize: Number(e.target.value) })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">Production Cell / Line</label>
              <input
                type="text"
                value={newBatch.productionLine}
                onChange={(e) => setNewBatch({ ...newBatch, productionLine: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">Priority Level</label>
              <select
                value={newBatch.priority}
                onChange={(e) => setNewBatch({ ...newBatch, priority: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>

          {/* Dynamic Checkpoints Section */}
          <div className="pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="text-xs font-semibold uppercase font-mono text-sky-400">Quality Checkpoints & Tolerances</h4>
                <p className="text-[11px] text-slate-400">Define dimensional specifications (Nominal ± Tolerance) and visual criteria</p>
              </div>
              <button
                type="button"
                onClick={handleAddCheckpoint}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 text-xs flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>Add Checkpoint</span>
              </button>
            </div>

            <div className="space-y-3">
              {newBatch.checkpoints.map((cp, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-slate-800/60 border border-slate-700 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono text-slate-400 font-semibold">#{idx + 1}</span>
                    <input
                      type="text"
                      placeholder="Checkpoint Name (e.g. Outer Diameter)"
                      required
                      value={cp.name}
                      onChange={(e) => handleCheckpointChange(idx, 'name', e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white"
                    />
                    <select
                      value={cp.type}
                      onChange={(e) => handleCheckpointChange(idx, 'type', e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300"
                    >
                      <option value="quantitative">Quantitative (Tolerance)</option>
                      <option value="qualitative">Qualitative (Pass/Fail)</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => handleRemoveCheckpoint(idx)}
                      disabled={newBatch.checkpoints.length <= 1}
                      className="p-1 text-slate-500 hover:text-rose-400 disabled:opacity-30"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {cp.type === 'quantitative' && (
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 font-mono">Nominal</span>
                        <input
                          type="number"
                          step="any"
                          value={cp.nominal}
                          onChange={(e) => handleCheckpointChange(idx, 'nominal', parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-mono">Min (LSL)</span>
                        <input
                          type="number"
                          step="any"
                          value={cp.minTolerance}
                          onChange={(e) => handleCheckpointChange(idx, 'minTolerance', parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-mono">Max (USL)</span>
                        <input
                          type="number"
                          step="any"
                          value={cp.maxTolerance}
                          onChange={(e) => handleCheckpointChange(idx, 'maxTolerance', parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-mono">Unit</span>
                        <input
                          type="text"
                          value={cp.unit}
                          placeholder="mm"
                          onChange={(e) => handleCheckpointChange(idx, 'unit', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs pt-1">
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={cp.critical}
                        onChange={(e) => handleCheckpointChange(idx, 'critical', e.target.checked)}
                        className="rounded border-slate-700 text-sky-500 focus:ring-0 bg-slate-900"
                      />
                      <span className="text-[11px] font-medium text-amber-400">Critical Checkpoint (Failure flags immediate Quarantine)</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-600/20"
            >
              Save Batch Specification
            </button>
          </div>
        </form>
      </Modal>

      {/* BATCH DETAIL MODAL */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={selectedBatch ? `Batch Specification: ${selectedBatch.batchNumber}` : 'Batch Details'}
        subtitle={selectedBatch?.productName}
        maxWidth="max-w-2xl"
      >
        {selectedBatch && (
          <div className="space-y-4 text-xs">
            {/* Meta Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-slate-800/60 border border-slate-700">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono">SKU Code</span>
                <p className="font-mono text-slate-200 font-semibold">{selectedBatch.sku}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono">Status</span>
                <div className="mt-0.5"><StatusBadge status={selectedBatch.status} /></div>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono">Lot & Sample</span>
                <p className="font-mono text-slate-200">{selectedBatch.sampleSize} of {selectedBatch.totalQuantity} inspected</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono">Production Line</span>
                <p className="text-slate-200">{selectedBatch.productionLine}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono">Operator</span>
                <p className="text-slate-200">{selectedBatch.operator}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono">Priority</span>
                <div className="mt-0.5"><PriorityBadge priority={selectedBatch.priority} /></div>
              </div>
            </div>

            {/* Quarantine disposition if present */}
            {selectedBatch.disposition && selectedBatch.disposition.type !== 'None' && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 space-y-1">
                <span className="text-[10px] uppercase font-mono font-bold text-amber-400">
                  Disposition Decision: {selectedBatch.disposition.type}
                </span>
                <p className="text-xs text-amber-200">{selectedBatch.disposition.notes}</p>
                <div className="text-[10px] text-amber-400/80 font-mono">
                  Decided by {selectedBatch.disposition.decidedBy} on {new Date(selectedBatch.disposition.decidedAt).toLocaleString()}
                </div>
              </div>
            )}

            {/* Checkpoints */}
            <div>
              <h4 className="font-semibold text-white mb-2 uppercase font-mono text-[11px] text-sky-400">Configured Checkpoints</h4>
              <div className="space-y-2">
                {selectedBatch.checkpoints?.map((cp, i) => (
                  <div key={i} className="p-2.5 rounded bg-slate-800 border border-slate-700 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-slate-200 flex items-center gap-2">
                        <span>{cp.name}</span>
                        {cp.critical && (
                          <span className="px-1.5 py-0.2 rounded bg-rose-950 text-rose-400 border border-rose-800 text-[9px] uppercase font-mono">
                            Critical
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">{cp.instructions}</p>
                    </div>

                    <div className="text-right font-mono text-[11px] text-slate-300">
                      {cp.type === 'quantitative' ? (
                        <div>
                          <div>Nominal: {cp.nominal} {cp.unit}</div>
                          <div className="text-slate-400 text-[10px]">[{cp.minTolerance} to {cp.maxTolerance}] {cp.unit}</div>
                        </div>
                      ) : (
                        <span className="text-sky-400">Qualitative Pass/Fail</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <Link
                to={`/inspect?batchId=${selectedBatch._id}`}
                className="px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs"
              >
                Start Inspection
              </Link>
            </div>
          </div>
        )}
      </Modal>

      {/* DISPOSITION MODAL */}
      <Modal
        isOpen={isDispositionOpen}
        onClose={() => setIsDispositionOpen(false)}
        title="Quarantine Material Review Board (MRB)"
        subtitle={`Disposition for Batch ${selectedBatch?.batchNumber}`}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveDisposition} className="space-y-4">
          <p className="text-xs text-slate-300">
            This batch has non-conformances. Assign an authorized MRB disposition to resolve or route the materials.
          </p>

          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1">Disposition Action *</label>
            <select
              value={dispositionForm.type}
              onChange={(e) => setDispositionForm({ ...dispositionForm, type: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
            >
              <option value="Rework">Rework (Remachine / Adjust & Re-inspect)</option>
              <option value="Scrap">Scrap (Discard lot permanently)</option>
              <option value="Concession">Concession (Approved for Use As-Is with Deviation Waiver)</option>
              <option value="Released">Released (False alarm / Verified Conforming)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1">Corrective Actions & Justification *</label>
            <textarea
              required
              rows="3"
              placeholder="State reason, corrective tooling adjustments, or customer authorization..."
              value={dispositionForm.notes}
              onChange={(e) => setDispositionForm({ ...dispositionForm, notes: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1">Decided By (QA Lead Signature)</label>
            <input
              type="text"
              value={dispositionForm.decidedBy}
              onChange={(e) => setDispositionForm({ ...dispositionForm, decidedBy: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsDispositionOpen(false)}
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-lg shadow-amber-600/20"
            >
              Authorize Disposition
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

