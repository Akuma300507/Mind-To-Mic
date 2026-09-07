import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Disc,
  Play,
  RotateCw,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  Clock,
  Volume2,
  AlertCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Timer, TimerPhase } from '../components/common/Timer';
import { WheelCanvas } from '../components/common/WheelCanvas';
import { soundEngine } from '../lib/audio';
import type { Topic, Round2Result } from '../types';

export const Round2: React.FC = () => {
  const {
    db,
    activeParticipant,
    setActiveParticipant,
    selectNextParticipant,
    saveRound2Result,
    updateLiveSync,
    spinStationTopic,
    completeStationSpin,
    resetTopicsStatus,
    unlockSound,
    currentStationId,
    setCurrentStationId,
    currentStation,
    allStations,
  } = useApp();

  // Wheel state
  const [isSpinning, setIsSpinning] = useState(false);
  const [winningTopic, setWinningTopic] = useState<Topic | null>(null);
  const [rotationAngle, setRotationAngle] = useState(0); // in radians
  const [timerPhase, setTimerPhase] = useState<TimerPhase>('idle');
  const [lastSavedResult, setLastSavedResult] = useState<Round2Result | null>(null);
  const [poolNotice, setPoolNotice] = useState<string | null>(null);
  const [lockedWheelTopics, setLockedWheelTopics] = useState<Topic[] | null>(null);

  const topicsPool = db?.topics || [];
  const wheelCount = db?.settings.round2.activeWheelTopicCount ?? 20;
  const speechSeconds = db?.settings.round2.speechTimeSeconds ?? 120;
  const buzzerEnabled = db?.settings.round2.buzzerEnabled ?? true;
  const reuseAllowed = db?.settings.round2.topicReuseAllowed ?? false;

  // Sync winningTopic if currentStation already has a selectedTopic
  useEffect(() => {
    if (currentStation?.selectedTopic) {
      setWinningTopic(currentStation.selectedTopic);
    } else if (!currentStation?.selectedTopicId) {
      setWinningTopic(null);
    }
  }, [currentStation?.selectedTopicId, currentStation?.selectedTopic]);

  // When active participant changes, reset locked topics and winning topic if not matching
  const prevParticipantId = useRef<string | null>(null);
  useEffect(() => {
    if (activeParticipant?.id && activeParticipant.id !== prevParticipantId.current) {
      prevParticipantId.current = activeParticipant.id;
      setWinningTopic(currentStation?.selectedTopic || null);
      setLockedWheelTopics(null);
    }
  }, [activeParticipant?.id, currentStation?.selectedTopic]);

  const unusedCount = useMemo(() => topicsPool.filter((t) => t.status === 'available').length, [topicsPool]);
  const usedCount = topicsPool.length - unusedCount;

  // Compute active wheel topics when not locked
  const dynamicWheelTopics = useMemo(() => {
    if (topicsPool.length === 0) return [];

    let available = reuseAllowed
      ? [...topicsPool]
      : topicsPool.filter((t) => t.status === 'available');

    // If winning topic exists, ensure it is represented on the wheel
    const activeSelected = winningTopic || currentStation?.selectedTopic;
    if (activeSelected && !available.some((t) => t.id === activeSelected.id)) {
      available = [activeSelected, ...available];
    }

    if (available.length === 0) {
      available = [...topicsPool];
    }

    return available.slice(0, wheelCount);
  }, [topicsPool, wheelCount, reuseAllowed, winningTopic, currentStation?.selectedTopic]);

  // Actual topics rendered on the wheel: locked takes priority during/after spin
  const activeWheelTopics = lockedWheelTopics || dynamicWheelTopics;

  // Color palette for slices
  const sliceColors = useMemo(
    () => [
      '#6366f1', // indigo
      '#8b5cf6', // purple
      '#a855f7', // purple-500
      '#3b82f6', // blue
      '#06b6d4', // cyan
      '#ec4899', // pink
      '#10b981', // emerald
      '#f59e0b', // amber
      '#14b8a6', // teal
      '#84cc16', // lime
    ],
    []
  );

  // Handle Spin Logic
  const handleSpin = async () => {
    if (isSpinning || activeWheelTopics.length === 0) return;
    unlockSound();
    setPoolNotice(null);

    // Freeze current wheel topics before initiating spin
    const currentWheel = [...activeWheelTopics];
    setLockedWheelTopics(currentWheel);
    setIsSpinning(true);
    setWinningTopic(null);

    let chosenTopic: Topic;
    try {
      const wheelTopicIds = currentWheel.map((t) => t.id);
      const res = await spinStationTopic(currentStationId, wheelTopicIds);
      chosenTopic = res.topic;
    } catch (err: any) {
      setIsSpinning(false);
      setLockedWheelTopics(null);
      setPoolNotice(err.message || 'No unused topics remaining. Please reset topic pool or allow reuse.');
      return;
    }

    // Verify chosenTopic is positioned in currentWheel
    let targetIndex = currentWheel.findIndex((t) => t.id === chosenTopic.id);
    if (targetIndex === -1) {
      currentWheel[0] = chosenTopic;
      targetIndex = 0;
      setLockedWheelTopics([...currentWheel]);
    }

    const totalSlices = currentWheel.length;
    const sliceAngle = (2 * Math.PI) / totalSlices;
    const POINTER_ANGLE = 1.5 * Math.PI; // Top of the wheel (12 o'clock)
    const TWO_PI = 2 * Math.PI;

    // Angle of slice center relative to wheel rotation
    const targetSliceCenter = targetIndex * sliceAngle + sliceAngle / 2;

    // Target rotation angle so targetSliceCenter aligns with POINTER_ANGLE
    const targetNormalized = ((POINTER_ANGLE - targetSliceCenter) % TWO_PI + TWO_PI) % TWO_PI;
    const currentNormalized = ((rotationAngle % TWO_PI) + TWO_PI) % TWO_PI;

    let angleDiff = targetNormalized - currentNormalized;
    if (angleDiff <= 0.05) {
      angleDiff += TWO_PI;
    }

    const extraRotations = 6;
    const desiredFinalAngle = rotationAngle + extraRotations * TWO_PI + angleDiff;
    const startAngle = rotationAngle;
    const distance = desiredFinalAngle - startAngle;
    const duration = 4800; // ms
    const startTime = performance.now();

    let lastTickSlice = -1;

    const animateSpin = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      // Ease out cubic deceleration
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = startAngle + distance * easeOut;

      setRotationAngle(current);

      // Synthesize tick sound when passing a slice boundary under the top pointer
      const angleUnderPointer = ((POINTER_ANGLE - current) % TWO_PI + TWO_PI) % TWO_PI;
      const currentSlice = Math.floor(angleUnderPointer / sliceAngle);
      if (currentSlice !== lastTickSlice) {
        lastTickSlice = currentSlice;
        soundEngine.playTick();
      }

      if (progress < 1) {
        requestAnimationFrame(animateSpin);
      } else {
        setRotationAngle(desiredFinalAngle);
        setIsSpinning(false);
        setWinningTopic(chosenTopic);
        soundEngine.playChime(); // celebration chime

        // Inform backend spin completed for this station
        completeStationSpin(currentStationId).catch(() => {});

        // Sync with projector display
        updateLiveSync({
          currentRound: 2,
          activeParticipantId: activeParticipant?.id || null,
          locationId: currentStationId,
          activeItem: {
            type: 'topic',
            title: chosenTopic.topic,
            id: chosenTopic.id,
            category: chosenTopic.category,
          },
          wheelSpin: {
            isSpinning: false,
            targetTopicId: chosenTopic.id,
            targetTopicTitle: chosenTopic.topic,
            targetIndex,
            wheelTopics: currentWheel,
            startedAt: 0,
            durationMs: 0,
          },
        }).catch(() => {});
      }
    };

    requestAnimationFrame(animateSpin);
  };

  // Callback when timer completes
  const handleTimerFinish = useCallback(
    async (data: {
      status: 'completed' | 'completed_early' | 'time_up';
      prepDurationSeconds: number;
      speechDurationSeconds: number;
      startTime: string;
      endTime: string;
    }) => {
      if (!activeParticipant || !winningTopic) return;

      const resultPayload = {
        participantId: activeParticipant.id,
        participantName: activeParticipant.name,
        college: activeParticipant.college,
        topicId: winningTopic.id,
        topicText: winningTopic.topic,
        prepDurationSeconds: 0,
        speechDurationSeconds: data.speechDurationSeconds,
        targetSpeechDurationSeconds: speechSeconds,
        startTime: data.startTime,
        endTime: data.endTime,
        status: data.status,
      };

      const saved = await saveRound2Result(resultPayload);
      setLastSavedResult(saved);
    },
    [activeParticipant, winningTopic, speechSeconds, saveRound2Result]
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/90 border border-purple-900/30 p-4 sm:p-5 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
            <Disc className="w-6 h-6 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-purple-400 px-2 py-0.5 rounded bg-purple-950/60 border border-purple-800">
                ROUND 2
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-white font-['Outfit']">Spin the Topic Wheel</h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {activeWheelTopics.length} Wheel Topics • Immediate Speech: {speechSeconds}s (No Prep) • Buzzer: {buzzerEnabled ? 'ON' : 'OFF'}
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
              className="bg-transparent text-purple-300 font-semibold focus:outline-none"
            >
              {allStations.map((s) => (
                <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                  {s.name} (Round {s.currentRound})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-400">Contestant:</span>
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

      {/* Topic Pool Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Topic Pool:</span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 font-mono font-bold text-[11px]">
            {unusedCount} Available
          </span>
          <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[11px]">
            {usedCount} Used
          </span>
          {reuseAllowed && (
            <span className="text-[10px] text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
              Reuse Allowed
            </span>
          )}
        </div>

        {usedCount > 0 && (
          <button
            onClick={async () => {
              if (confirm('Reset all used topics back to available?')) {
                await resetTopicsStatus();
              }
            }}
            className="flex items-center gap-1 text-[11px] text-purple-400 hover:text-purple-300 font-semibold"
          >
            <RotateCw className="w-3 h-3" />
            <span>Reset Used Topics</span>
          </button>
        )}
      </div>

      {poolNotice && (
        <div className="p-3 bg-amber-950/50 border border-amber-500/50 rounded-xl text-xs text-amber-200 flex items-center justify-between">
          <span>{poolNotice}</span>
          <button
            onClick={() => resetTopicsStatus()}
            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-[11px]"
          >
            Reset Pool Now
          </button>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Canvas Spinning Wheel */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-purple-900/30 rounded-3xl p-6 shadow-2xl flex flex-col items-center justify-between space-y-6">
          <div className="w-full flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Dynamic Wheel Arena ({activeWheelTopics.length} Slices)
            </span>

            <button
              onClick={handleSpin}
              disabled={isSpinning || timerPhase === 'speech'}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white font-bold text-xs shadow-lg shadow-purple-950/60 transition-all active:scale-95"
            >
              <RotateCw className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} />
              <span>{isSpinning ? 'SPINNING...' : 'SPIN THE WHEEL'}</span>
            </button>
          </div>

          {/* Wheel Canvas & Top Pointer */}
          <div className="relative flex items-center justify-center p-2">
            <WheelCanvas
              topics={activeWheelTopics}
              rotationAngle={rotationAngle}
              size={460}
              sliceColors={sliceColors}
            />
          </div>

          {/* Selected Topic Reveal Display Card */}
          <div className="w-full">
            {winningTopic ? (
              <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950/80 border-2 border-purple-500/60 shadow-xl space-y-2 animate-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Selected Topic
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-900/60 text-purple-200 border border-purple-700">
                    {winningTopic.category || 'General'}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-white font-['Outfit'] leading-snug">
                  "{winningTopic.topic}"
                </h3>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-500">
                Click <strong>SPIN THE WHEEL</strong> above to randomly select a topic for {activeParticipant?.name || 'the contestant'}.
              </div>
            )}
          </div>

          {/* Last Result Log */}
          {lastSavedResult && (
            <div className="w-full p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs flex items-center justify-between">
              <span className="text-slate-300">
                Saved: <strong>{lastSavedResult.participantName}</strong> spoke for{' '}
                <strong className="text-emerald-300 font-mono">{lastSavedResult.speechDurationSeconds}s</strong>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {new Date(lastSavedResult.endTime).toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>

        {/* Right Column: Timer Engine (No prep for Round 2) */}
        <div className="lg:col-span-5">
          <Timer
            speechDurationSeconds={speechSeconds}
            hasPrepPhase={false}
            participantName={activeParticipant?.name}
            roundName="Round 2"
            buzzerEnabled={buzzerEnabled}
            onPhaseChange={setTimerPhase}
            onFinish={handleTimerFinish}
          />
        </div>
      </div>
    </div>
  );
};
