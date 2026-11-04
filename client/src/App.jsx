import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { ManageBatches } from './pages/ManageBatches';
import { NewInspection } from './pages/NewInspection';
import { BatchComparison } from './pages/BatchComparison';
import { InspectionHistory } from './pages/InspectionHistory';
import { QualityReports } from './pages/QualityReports';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans">
      {/* Top Navbar */}
      <Navbar />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigation Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-950">
          <div className="max-w-7xl mx-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/batches" element={<ManageBatches />} />
              <Route path="/inspect" element={<NewInspection />} />
              <Route path="/compare" element={<BatchComparison />} />
              <Route path="/history" element={<InspectionHistory />} />
              <Route path="/reports" element={<QualityReports />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

