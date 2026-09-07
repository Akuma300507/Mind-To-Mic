import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Search,
  Filter,
  Download,
  Image as ImageIcon,
  Disc,
  Clock,
  CheckCircle2,
  Calendar,
  LayoutDashboard,
  Radio,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { excelService } from '../lib/excel';

export const Results: React.FC = () => {
  const { db, allStations, setCurrentPage } = useApp();

  const [activeTab, setActiveTab] = useState<'round1' | 'round2' | 'round3'>('round1');
  const [searchTerm, setSearchTerm] = useState('');

  const r1Results = db?.round1Results || [];
  const r2Results = db?.round2Results || [];
  const r3Results = db?.round3Results || [];

  const filteredR1 = useMemo(() => {
    return r1Results.filter(
      (r) =>
        r.participantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.college.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.imageName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [r1Results, searchTerm]);

  const filteredR2 = useMemo(() => {
    return r2Results.filter(
      (r) =>
        r.participantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.college.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.topicText.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [r2Results, searchTerm]);

  const filteredR3 = useMemo(() => {
    return r3Results.filter(
      (r) =>
        r.participantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.college.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [r3Results, searchTerm]);

  const handleExportAll = () => {
    if (db) {
      excelService.exportFullEventReport(db);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-['Outfit'] flex items-center gap-3">
            <Trophy className="w-7 h-7 text-amber-400" />
            Competition Results & Scorecard
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Recorded performance logs, speech durations, and timestamps for all three rounds.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentPage('master')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-950/70 hover:bg-purple-900 border border-purple-800/80 text-purple-200 text-xs font-bold transition-all shadow-md"
          >
            <Radio className="w-4 h-4 text-purple-400 animate-pulse" />
            <span>Master Monitor</span>
          </button>

          <button
            onClick={handleExportAll}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/50 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel Report</span>
          </button>
        </div>
      </div>

      {/* Tabs & Search Header */}
      <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Round Switcher Tabs */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setActiveTab('round1')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'round1'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-950/50'
                : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Round 1 ({r1Results.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('round2')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'round2'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-950/50'
                : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            <Disc className="w-3.5 h-3.5" />
            <span>Round 2 ({r2Results.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('round3')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'round3'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Round 3 ({r3Results.length})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search contestant or topic..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {/* Results Tables */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          {activeTab === 'round1' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Contestant</th>
                  <th className="py-3.5 px-4">College</th>
                  <th className="py-3.5 px-4">Image Prompt</th>
                  <th className="py-3.5 px-4 text-center">Prep Duration</th>
                  <th className="py-3.5 px-4 text-center">Speech Duration</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredR1.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No Round 1 speeches recorded yet.
                    </td>
                  </tr>
                ) : (
                  filteredR1.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/40">
                      <td className="py-3.5 px-4 font-bold text-white font-['Outfit']">{r.participantName}</td>
                      <td className="py-3.5 px-4 text-slate-300">{r.college}</td>
                      <td className="py-3.5 px-4 text-purple-300 font-semibold">{r.imageName}</td>
                      <td className="py-3.5 px-4 text-center font-mono text-slate-300">
                        {r.prepDurationSeconds}s
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-400">
                        {r.speechDurationSeconds}s / {r.targetSpeechDurationSeconds}s
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300">
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-400 font-mono text-[11px]">
                        {new Date(r.endTime).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'round2' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Contestant</th>
                  <th className="py-3.5 px-4">College</th>
                  <th className="py-3.5 px-4">Spun Topic</th>
                  <th className="py-3.5 px-4 text-center">Prep Duration</th>
                  <th className="py-3.5 px-4 text-center">Speech Duration</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredR2.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No Round 2 wheel speeches recorded yet.
                    </td>
                  </tr>
                ) : (
                  filteredR2.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/40">
                      <td className="py-3.5 px-4 font-bold text-white font-['Outfit']">{r.participantName}</td>
                      <td className="py-3.5 px-4 text-slate-300">{r.college}</td>
                      <td className="py-3.5 px-4 text-purple-300 font-semibold max-w-xs truncate" title={r.topicText}>
                        {r.topicText}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-slate-300">
                        {r.prepDurationSeconds}s
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-400">
                        {r.speechDurationSeconds}s / {r.targetSpeechDurationSeconds}s
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300">
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-400 font-mono text-[11px]">
                        {new Date(r.endTime).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'round3' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Finalist</th>
                  <th className="py-3.5 px-4">College</th>
                  <th className="py-3.5 px-4 text-center">Speech Duration</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredR3.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      No Championship Finals speeches recorded yet.
                    </td>
                  </tr>
                ) : (
                  filteredR3.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/40">
                      <td className="py-3.5 px-4 font-bold text-white font-['Outfit']">{r.participantName}</td>
                      <td className="py-3.5 px-4 text-slate-300">{r.college}</td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-400 text-sm">
                        {r.speechDurationSeconds}s / {r.targetSpeechDurationSeconds}s
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300">
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-400 font-mono text-[11px]">
                        {new Date(r.endTime).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
