import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  ChevronRight,
  Sparkles,
  Trophy,
  CheckCircle2,
  AlertCircle,
  Zap,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Timer, TimerPhase } from '../components/common/Timer';
import type { Round3Result } from '../types';

export const Round3: React.FC = () => {
  const {
    db,
    activeParticipant,
    setActiveParticipant,
    selectNextParticipant,
    saveRound3Result,
    updateLiveSync,
    currentStationId,
    setCurrentStationId,
    allStations,
  } = useApp();

  const [timerPhase, setTimerPhase] = useState<TimerPhase>('idle');
  const [lastSavedResult, setLastSavedResult] = useState<Round3Result | null>(null);

  const speechSeconds = db?.settings.round3.speechTimeSeconds ?? 120;
  const buzzerEnabled = db?.settings.round3.buzzerEnabled ?? true;

  // Sync with projector screen
  useEffect(() => {
    updateLiveSync({
      currentRound: 3,
      activeParticipantId: activeParticipant?.id || null,
      locationId: currentStationId,
      activeItem: {
        type: 'final',
        title: 'Championship Finals Speech',
      },
    }).catch(() => {});
  }, [activeParticipant?.id, currentStationId, updateLiveSync]);

  const handleTimerFinish = useCallback(
    async (data: {
      status: 'completed' | 'completed_early' | 'time_up';
      prepDurationSeconds: number;
      speechDurationSeconds: number;
      startTime: string;
      endTime: string;
    }) => {
      if (!activeParticipant) return;

      const resultPayload = {
        participantId: activeParticipant.id,
        participantName: activeParticipant.name,
        college: activeParticipant.college,
        speechDurationSeconds: data.speechDurationSeconds,
        targetSpeechDurationSeconds: speechSeconds,
        startTime: data.startTime,
        endTime: data.endTime,
        status: data.status,
      };

      const saved = await saveRound3Result(resultPayload);
      setLastSavedResult(saved);
    },
    [activeParticipant, speechSeconds, saveRound3Result]
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/90 border border-purple-900/30 p-4 sm:p-5 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800">
                ROUND 3 (FINALS)
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-white font-['Outfit']">
                Championship Speaking Timer
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Target Duration: {speechSeconds}s • Precision Audio Warnings • Automatic Klaxon Buzzer
            </p>
          </div>
        </div>

        {/* Station & Contestant Bar */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-400">Station:</span>
            <select
              value={currentStationId || ''}
              onChange={(e) => setCurrentStationId(e.target.value)}
              className="bg-transparent text-emerald-300 font-semibold focus:outline-none"
            >
              {allStations.map((s) => (
                <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                  {s.name} (Round {s.currentRound})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-400">Finalist:</span>
            <select
              value={activeParticipant?.id || ''}
              onChange={(e) => {
                const p = db?.participants.find((item) => item.id === e.target.value);
                if (p) setActiveParticipant(p);
              }}
              className="bg-transparent text-white font-bold font-['Outfit'] focus:outline-none"
            >
              {db?.participants.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                  {p.participantNumber} — {p.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={selectNextParticipant}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md shadow-purple-950/50"
            title="Next Participant (Shortcut: N)"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid: Contestant Spotlight Stage (Left) & Large Timer (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Contestant Stage Info Card */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-purple-900/30 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Finalist Stage Spotlight
            </span>
            <span className="text-xs font-mono font-bold text-slate-400">
              {activeParticipant?.participantNumber || 'NO SELECTION'}
            </span>
          </div>

          {activeParticipant ? (
            <div className="space-y-4">
              <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-950 to-indigo-950/40 border border-emerald-800/40 space-y-2">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Active Speaker on Podium
                </span>
                <h2 className="text-3xl sm:text-4xl font-black text-white font-['Outfit']">
                  {activeParticipant.name}
                </h2>
                <p className="text-sm font-semibold text-slate-300">
                  {activeParticipant.college} • {activeParticipant.department}
                </p>
              </div>

              {/* Progress Summary in Previous Rounds */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-400 font-semibold">Round 1 Speech</span>
                  <div className="text-base font-black text-blue-300 font-['Outfit']">
                    {activeParticipant.round1Status === 'completed'
                      ? 'Completed'
                      : activeParticipant.round1Status}
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-400 font-semibold">Round 2 Speech</span>
                  <div className="text-base font-black text-purple-300 font-['Outfit']">
                    {activeParticipant.round2Status === 'completed'
                      ? 'Completed'
                      : activeParticipant.round2Status}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500">
              <p>No participant selected. Please choose a contestant from the top bar.</p>
            </div>
          )}

          {/* Last Result Log */}
          {lastSavedResult && (
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-200">
                  Final speech saved for <strong>{lastSavedResult.participantName}</strong>:{' '}
                  <span className="text-emerald-300 font-mono font-bold">
                    {lastSavedResult.speechDurationSeconds}s
                  </span>{' '}
                  ({lastSavedResult.status})
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {new Date(lastSavedResult.endTime).toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>

        {/* Right Column: Timer Engine */}
        <div className="lg:col-span-5">
          <Timer
            prepDurationSeconds={0}
            speechDurationSeconds={speechSeconds}
            hasPrepPhase={false}
            participantName={activeParticipant?.name}
            roundName="Round 3 Finals"
            buzzerEnabled={buzzerEnabled}
            onPhaseChange={setTimerPhase}
            onFinish={handleTimerFinish}
          />
        </div>
      </div>
    </div>
  );
};
