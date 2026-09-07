import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Mic,
  Maximize2,
  Minimize2,
  Clock,
  Sparkles,
  Trophy,
  Image as ImageIcon,
  Disc,
  LogOut,
  Volume2,
  VolumeX,
  Radio,
  AlertTriangle,
  MapPin,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { WheelCanvas } from '../components/common/WheelCanvas';
import { soundEngine } from '../lib/audio';
import type { Topic } from '../types';

export const ProjectorDisplay: React.FC = () => {
  const {
    db,
    allStations,
    isConnected,
    isFullscreen,
    toggleFullscreen,
    setCurrentPage,
    soundUnlocked,
    unlockSound,
  } = useApp();

  // Multi-station / location selection with URL param and localStorage persistence
  const initialStation = useMemo(() => {
    const urlVal = new URLSearchParams(window.location.search).get('station');
    if (urlVal) return urlVal;
    return localStorage.getItem('projector_assigned_station') || (allStations[0]?.id || 'station-a');
  }, [allStations]);

  const [selectedStationId, setSelectedStationId] = useState<string>(initialStation);
  const [showExitModal, setShowExitModal] = useState<boolean>(false);
  const [soundMuted, setSoundMuted] = useState<boolean>(false);

  const handleStationSelect = (stationId: string) => {
    setSelectedStationId(stationId);
    localStorage.setItem('projector_assigned_station', stationId);
  };

  // Read current live state and station-specific state
  const live = db?.liveSync;
  const currentStationState = selectedStationId !== 'all' && db?.stations ? db.stations[selectedStationId] : null;

  // Find active participant for this station or fallback to global live event
  const activeParticipant = useMemo(() => {
    if (currentStationState?.activeParticipant) {
      return currentStationState.activeParticipant;
    }
    if (currentStationState?.activeParticipantId && db?.participants) {
      const match = db.participants.find((p) => p.id === currentStationState.activeParticipantId);
      if (match) return match;
    }
    if (!live?.activeParticipantId || !db?.participants) return null;
    return db.participants.find((p) => p.id === live.activeParticipantId) || null;
  }, [currentStationState, live?.activeParticipantId, db?.participants]);

  const eventName = db?.settings.event.name || 'MIND TO MIC';
  const tagline = db?.settings.event.tagline || 'THINK. SPEAK. EXPRESS.';
  const currentRound = currentStationState?.currentRound || live?.currentRound || 1;

  // Determine active displayed item (image or topic) from station or liveSync
  const activeItem = useMemo(() => {
    if (currentStationState) {
      if (currentRound === 1 && currentStationState.selectedImage) {
        return {
          type: 'image' as const,
          title: currentStationState.selectedImage.name,
          mediaUrl: currentStationState.selectedImage.url,
          id: currentStationState.selectedImage.id,
        };
      }
      if (currentRound === 2 && currentStationState.selectedTopic) {
        return {
          type: 'topic' as const,
          title: currentStationState.selectedTopic.topic,
          id: currentStationState.selectedTopic.id,
          category: currentStationState.selectedTopic.category,
        };
      }
      if (currentRound === 3) {
        return {
          type: 'final' as const,
          title: 'Championship Grand Finals',
        };
      }
    }
    return live?.activeItem;
  }, [currentStationState, currentRound, live?.activeItem]);

  // Real-time Timer Interpolation (station-specific or live)
  const timerMode = currentStationState ? currentStationState.timerMode : (live?.timerMode || 'idle');
  const isTimerRunning = currentStationState ? currentStationState.isTimerRunning : (live?.isTimerRunning || false);
  const timerEndsAt = currentStationState ? currentStationState.timerEndsAt : live?.timerEndsAt;
  const timerTotalSeconds = currentStationState ? currentStationState.timerTotalSeconds : (live?.timerTotalSeconds || 120);
  const timerRemaining = currentStationState ? currentStationState.timerRemainingSeconds : (live?.timerRemainingSeconds ?? 120);

  const [remainingSeconds, setRemainingSeconds] = useState<number>(timerRemaining);

  useEffect(() => {
    if (!isTimerRunning || !timerEndsAt) {
      setRemainingSeconds(timerRemaining);
      return;
    }

    const updateRemaining = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.ceil((timerEndsAt - now) / 1000));
      setRemainingSeconds(diff);
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 200);
    return () => clearInterval(interval);
  }, [isTimerRunning, timerEndsAt, timerRemaining]);

  // Round 2 Wheel Animation in Projector View
  const [wheelAngle, setWheelAngle] = useState(0);
  const [isProjectorWheelSpinning, setIsProjectorWheelSpinning] = useState(false);
  const [projectorWinningTopic, setProjectorWinningTopic] = useState<Topic | null>(null);
  const [projectorWheelTopics, setProjectorWheelTopics] = useState<Topic[]>([]);

  // Reset winning topic when participant changes or round changes
  useEffect(() => {
    setProjectorWinningTopic(null);
  }, [activeParticipant?.id, currentRound, currentStationState?.selectedTopicId]);

  // Default active topics if no wheelTopics supplied
  const defaultWheelTopics = useMemo(() => {
    if (!db?.topics) return [];
    const count = db.settings.round2.activeWheelTopicCount || 20;
    const available = db.topics.filter((t) => t.status === 'available');
    return (available.length > 0 ? available : db.topics).slice(0, count);
  }, [db?.topics, db?.settings.round2.activeWheelTopicCount]);

  // The topics currently rendered on the projector wheel
  const activeTopics = useMemo(() => {
    if (projectorWheelTopics.length > 0) return projectorWheelTopics;
    return defaultWheelTopics;
  }, [projectorWheelTopics, defaultWheelTopics]);

  // Watch for wheel spin events (from station or global)
  useEffect(() => {
    const wheelSpin = currentStationState?.wheelSpin || live?.wheelSpin;
    if (wheelSpin?.isSpinning && !isProjectorWheelSpinning) {
      setIsProjectorWheelSpinning(true);
      setProjectorWinningTopic(null);

      // Slices to use: prioritize wheelTopics transmitted directly from the spin event
      let topicsForSpin =
        wheelSpin.wheelTopics && wheelSpin.wheelTopics.length > 0
          ? [...wheelSpin.wheelTopics]
          : [...activeTopics];

      if (topicsForSpin.length === 0) {
        topicsForSpin = [...defaultWheelTopics];
      }

      // Locate slice index
      let targetIndex =
        typeof wheelSpin.targetSliceIndex === 'number' && wheelSpin.targetSliceIndex >= 0
          ? wheelSpin.targetSliceIndex
          : topicsForSpin.findIndex((t) => t.id === wheelSpin.targetTopicId);

      if (targetIndex === -1 || targetIndex >= topicsForSpin.length) {
        if (wheelSpin.targetTopicId && wheelSpin.targetTopicTitle) {
          const placeholder: Topic = {
            id: wheelSpin.targetTopicId,
            topic: wheelSpin.targetTopicTitle,
            category: wheelSpin.targetTopicCategory || 'General',
            status: 'used',
          };
          topicsForSpin[0] = placeholder;
          targetIndex = 0;
        } else {
          targetIndex = 0;
        }
      }

      setProjectorWheelTopics(topicsForSpin);

      const totalSlices = topicsForSpin.length;
      const sliceAngle = (2 * Math.PI) / totalSlices;
      const POINTER_ANGLE = 1.5 * Math.PI; // Top 12 o'clock pointer
      const TWO_PI = 2 * Math.PI;

      const targetSliceCenter = targetIndex * sliceAngle + sliceAngle / 2;
      const targetNormalized = ((POINTER_ANGLE - targetSliceCenter) % TWO_PI + TWO_PI) % TWO_PI;
      const currentNormalized = ((wheelAngle % TWO_PI) + TWO_PI) % TWO_PI;

      let angleDiff = targetNormalized - currentNormalized;
      if (angleDiff <= 0.05) {
        angleDiff += TWO_PI;
      }

      const extraRotations = 6;
      const desiredFinalAngle = wheelAngle + extraRotations * TWO_PI + angleDiff;

      const startAngle = wheelAngle;
      const distance = desiredFinalAngle - startAngle;
      const duration = wheelSpin.durationMs || 4800;
      const startTime = performance.now();

      let lastTick = -1;

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = startAngle + distance * easeOut;

        setWheelAngle(current);

        const angleUnderPointer = ((POINTER_ANGLE - current) % TWO_PI + TWO_PI) % TWO_PI;
        const curSlice = Math.floor(angleUnderPointer / sliceAngle);
        if (curSlice !== lastTick) {
          lastTick = curSlice;
          if (!soundMuted) soundEngine.playTick();
        }

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setWheelAngle(desiredFinalAngle);
          setIsProjectorWheelSpinning(false);
          const won = topicsForSpin[targetIndex] || {
            id: wheelSpin.targetTopicId || 'winner',
            topic: wheelSpin.targetTopicTitle || 'Selected Topic',
            status: 'used',
          };
          setProjectorWinningTopic(won);
          if (!soundMuted) soundEngine.playChime();
        }
      };

      requestAnimationFrame(animate);
    }
  }, [
    currentStationState?.wheelSpin,
    live?.wheelSpin,
    isProjectorWheelSpinning,
    activeTopics,
    defaultWheelTopics,
    wheelAngle,
    soundMuted,
  ]);

  // Handle keyboard shortcuts (F: fullscreen, Esc: exit confirmation)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowExitModal(true);
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleFullscreen]);

  // Format MM:SS
  const formatTime = (secs: number) => {
    const safeSecs = Math.max(0, Math.floor(secs));
    const m = Math.floor(safeSecs / 60);
    const s = safeSecs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isWarning = remainingSeconds <= 10 && remainingSeconds > 0 && isTimerRunning;
  const isTimeUp = timerMode === 'time_up' || (remainingSeconds === 0 && (timerMode === 'speech' || timerMode === 'prep'));

  // Calculate percentage of timer elapsed
  const progressPercent = Math.min(
    100,
    Math.max(0, timerTotalSeconds > 0 ? ((timerTotalSeconds - remainingSeconds) / timerTotalSeconds) * 100 : 0)
  );

  // Current Round 2 topic to display on projector
  const currentRoundTopic = useMemo(() => {
    if (isProjectorWheelSpinning) return null;
    if (activeItem?.type === 'topic' && activeItem.title) {
      return { title: activeItem.title, category: activeItem.category };
    }
    if (currentStationState?.selectedTopic) {
      return {
        title: currentStationState.selectedTopic.topic,
        category: currentStationState.selectedTopic.category,
      };
    }
    if (projectorWinningTopic) {
      return {
        title: projectorWinningTopic.topic,
        category: projectorWinningTopic.category,
      };
    }
    return null;
  }, [isProjectorWheelSpinning, activeItem, currentStationState?.selectedTopic, projectorWinningTopic]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6 sm:p-10 relative overflow-hidden select-none font-['Outfit']">
      {/* Background ambient lighting effects */}
      <div className="absolute top-0 left-1/4 w-[700px] h-[700px] bg-purple-600/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[700px] h-[700px] bg-blue-600/10 rounded-full blur-[160px] pointer-events-none" />

      {/* Top Bar: Event Branding, Station Selector, Connection & Exit */}
      <header className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-purple-900/40 pb-5">
        {/* Left: Event Logo & Name */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 border border-purple-400/40 flex items-center justify-center text-white shadow-2xl shadow-purple-950/80">
            <Mic className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white font-['Outfit']">
              {eventName}
            </h1>
            <p className="text-xs sm:text-sm font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-indigo-200 to-blue-300 font-mono">
              {tagline}
            </p>
          </div>
        </div>

        {/* Center: Current Round Indicator */}
        <div className="flex items-center gap-2 px-5 py-2 rounded-2xl bg-purple-950/80 border-2 border-purple-500/50 shadow-lg shadow-purple-950/50">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="text-sm sm:text-base font-black tracking-wider uppercase text-purple-200">
            {currentRound === 1 && 'ROUND 1 • IMAGE TO SPEECH'}
            {currentRound === 2 && 'ROUND 2 • SPIN THE TOPIC WHEEL'}
            {currentRound === 3 && 'ROUND 3 • CHAMPIONSHIP FINALS'}
          </span>
        </div>

        {/* Right: Station Selector, Audio, Fullscreen & Exit */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Station Selector for Multi-Stage / Multi-Room Events */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
            <MapPin className="w-3.5 h-3.5 text-indigo-400" />
            <select
              id="projector-station-select"
              value={selectedStationId}
              onChange={(e) => handleStationSelect(e.target.value)}
              className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-white">All Stations (Global)</option>
              {allStations.map((s) => (
                <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                  {s.name} (Round {s.currentRound})
                </option>
              ))}
            </select>
          </div>

          {/* Connection Status Pill */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-colors ${
              isConnected
                ? 'bg-emerald-950/70 border-emerald-800/80 text-emerald-300'
                : 'bg-amber-950/70 border-amber-800/80 text-amber-300 animate-pulse'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]' : 'bg-amber-400'
              }`}
            />
            <span className="hidden md:inline">{isConnected ? 'LIVE SYNC' : 'RECONNECTING'}</span>
          </div>

          {/* Audio Enable / Mute */}
          <button
            onClick={() => {
              if (!soundUnlocked) unlockSound();
              setSoundMuted(!soundMuted);
            }}
            className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
              soundMuted
                ? 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white'
                : 'bg-purple-950/80 text-purple-300 border-purple-800/80 hover:bg-purple-900/80'
            }`}
            title={soundMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
            title="Toggle Fullscreen (F)"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Dedicated Secure Exit Button */}
          <button
            onClick={() => setShowExitModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 text-xs font-bold transition-all shadow-md shadow-rose-950/50"
            title="Exit Projector Display Mode (Esc)"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Exit</span>
          </button>
        </div>
      </header>

      {/* Main Center Stage Area */}
      <main className="relative z-10 my-auto py-6 max-w-7xl mx-auto w-full flex flex-col items-center justify-center text-center space-y-8">
        {/* Active Contestant Spotlight Banner */}
        {activeParticipant ? (
          <div className="space-y-2 animate-in fade-in zoom-in-95 duration-500">
            <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-purple-400 font-mono bg-purple-950/60 px-3 py-1 rounded-full border border-purple-800/60">
              CONTESTANT {activeParticipant.participantNumber} • ON STAGE
            </span>
            <h2 className="text-4xl sm:text-6xl md:text-7xl font-black text-white font-['Outfit'] tracking-tight drop-shadow-2xl">
              {activeParticipant.name}
            </h2>
            <p className="text-lg sm:text-2xl font-bold text-slate-300 font-['Outfit']">
              {activeParticipant.college}
              {activeParticipant.department && ` • ${activeParticipant.department}`}
            </p>
          </div>
        ) : (
          <div className="text-slate-400 font-semibold text-lg flex items-center gap-2">
            <Radio className="w-5 h-5 text-purple-400 animate-pulse" />
            <span>Awaiting Next Contestant...</span>
          </div>
        )}

        {/* Big Live Synchronized Timer Display */}
        <div className="w-full max-w-2xl bg-slate-900/80 backdrop-blur-md border border-purple-900/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4">
          {/* Phase Badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-mono font-bold tracking-wider uppercase text-slate-400">
                {timerMode === 'prep' && 'PREPARATION TIME'}
                {timerMode === 'speech' && 'SPEAKING TIME'}
                {timerMode === 'stopped' && 'TIMER PAUSED'}
                {timerMode === 'time_up' && "TIME'S UP"}
                {timerMode === 'idle' && 'STAGE TIMER'}
              </span>
            </div>

            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                timerMode === 'speech'
                  ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                  : timerMode === 'prep'
                  ? 'bg-blue-950 text-blue-400 border-blue-800'
                  : timerMode === 'time_up'
                  ? 'bg-rose-950 text-rose-400 border-rose-800 animate-pulse'
                  : 'bg-slate-950 text-slate-400 border-slate-800'
              }`}
            >
              {timerMode === 'speech' ? 'LIVE' : timerMode.toUpperCase()}
            </span>
          </div>

          {/* Large Digits */}
          <div
            className={`font-mono text-7xl sm:text-8xl md:text-9xl font-black tracking-tight transition-colors duration-200 ${
              isTimeUp
                ? 'text-rose-500 animate-pulse drop-shadow-[0_0_40px_rgba(244,63,94,0.6)]'
                : isWarning
                ? 'text-rose-400 animate-pulse drop-shadow-[0_0_30px_rgba(244,63,94,0.5)]'
                : timerMode === 'speech'
                ? 'text-emerald-400 drop-shadow-[0_0_30px_rgba(52,211,153,0.3)]'
                : timerMode === 'prep'
                ? 'text-blue-400 drop-shadow-[0_0_30px_rgba(96,165,250,0.3)]'
                : 'text-white'
            }`}
          >
            {formatTime(remainingSeconds)}
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden p-0.5 border border-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isTimeUp
                  ? 'bg-rose-500'
                  : isWarning
                  ? 'bg-rose-500'
                  : timerMode === 'prep'
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-400'
                  : 'bg-gradient-to-r from-purple-500 to-emerald-400'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Time's Up Banner */}
          {isTimeUp && (
            <div className="py-2.5 px-6 rounded-2xl bg-rose-600/30 border border-rose-500/60 text-rose-300 font-bold text-sm sm:text-base animate-bounce">
              ⚠️ TIME EXPIRED • BUZZER ACTIVE
            </div>
          )}
        </div>

        {/* Dynamic Round Prompt Content Display */}
        {/* Round 1: Assigned Image or Awaiting Card */}
        {currentRound === 1 && (
          activeItem?.type === 'image' && activeItem.mediaUrl ? (
            <div className="w-full max-w-3xl rounded-3xl overflow-hidden border-2 border-purple-500/50 shadow-[0_0_60px_rgba(168,85,247,0.3)] bg-slate-900 animate-in zoom-in-95 duration-500">
              <div className="aspect-video relative">
                <img
                  src={activeItem.mediaUrl}
                  alt={activeItem.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent">
                  <span className="text-xs font-mono font-bold text-purple-300 uppercase tracking-widest">
                    ASSIGNED TOPIC PROMPT
                  </span>
                  <h3 className="text-2xl sm:text-4xl font-black text-white font-['Outfit'] drop-shadow-md">
                    {activeItem.title}
                  </h3>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-xl p-8 rounded-3xl bg-slate-900/60 border border-purple-900/30 text-slate-300 flex flex-col items-center space-y-3 animate-in fade-in">
              <Sparkles className="w-10 h-10 text-purple-400 animate-pulse" />
              <div className="space-y-1">
                <h4 className="text-xl font-bold text-white">ROUND 1 • IMAGE TO SPEECH</h4>
                <p className="text-sm text-slate-400">Awaiting random image prompt assignment from operator station</p>
              </div>
            </div>
          )
        )}

        {/* Round 2: Wheel Spinning Animation, Selected Topic, or Wheel Standby */}
        {currentRound === 2 && (
          <div className="w-full max-w-4xl flex flex-col items-center justify-center">
            {isProjectorWheelSpinning ? (
              <div className="flex flex-col items-center space-y-4 animate-in zoom-in-95 duration-300">
                <span className="text-sm font-bold uppercase tracking-widest text-amber-400 animate-pulse flex items-center gap-2">
                  <Disc className="w-4 h-4 animate-spin" />
                  WHEEL IS SPINNING...
                </span>
                <WheelCanvas topics={activeTopics} rotationAngle={wheelAngle} size={460} />
              </div>
            ) : currentRoundTopic ? (
              <div className="w-full p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-purple-950/90 via-slate-900 to-indigo-950/90 border-2 border-purple-500/60 shadow-[0_0_80px_rgba(168,85,247,0.35)] space-y-4 animate-in zoom-in-95 duration-500">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold uppercase tracking-widest text-purple-400 font-mono">
                    SELECTED SPEECH THEME
                  </span>
                  {currentRoundTopic.category && (
                    <span className="text-xs font-mono font-bold px-3 py-1 rounded bg-purple-900/60 text-purple-200 border border-purple-700">
                      {currentRoundTopic.category}
                    </span>
                  )}
                </div>
                <h3 className="text-3xl sm:text-5xl md:text-6xl font-black text-white font-['Outfit'] leading-tight">
                  "{currentRoundTopic.title}"
                </h3>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-4 animate-in fade-in">
                <span className="text-xs font-mono font-bold text-purple-400 uppercase tracking-widest flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  TOPIC WHEEL • READY TO SPIN
                </span>
                <WheelCanvas topics={activeTopics} rotationAngle={wheelAngle} size={360} />
              </div>
            )}
          </div>
        )}

        {/* Round 3: Championship Finals Grand Stage */}
        {currentRound === 3 && (
          <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-indigo-950/60 border-2 border-emerald-500/40 shadow-2xl space-y-4 max-w-3xl animate-in zoom-in-95 duration-500">
            <Trophy className="w-16 h-16 text-amber-400 mx-auto animate-bounce" />
            <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest">
              FINALS ARENA
            </span>
            <h3 className="text-3xl sm:text-5xl font-black text-white font-['Outfit']">
              {activeItem?.title && activeItem.title !== 'Championship Finals Speech'
                ? activeItem.title
                : 'Championship Grand Finals'}
            </h3>
            <p className="text-base sm:text-lg text-slate-300 max-w-xl mx-auto">
              Unrehearsed speaking championship. Think clearly, speak boldly, and express with conviction.
            </p>
          </div>
        )}
      </main>

      {/* Bottom Footer Status Bar */}
      <footer className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-t border-purple-900/40 pt-5 text-xs text-slate-400 font-mono">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          <span>LIVE AUDIENCE BROADCAST • {isConnected ? 'SYNCHRONIZED' : 'CONNECTING'}</span>
        </div>
        <div className="flex items-center gap-4">
          <span>PRESS [F] FULLSCREEN</span>
          <span>•</span>
          <span>PRESS [ESC] EXIT DISPLAY</span>
        </div>
      </footer>

      {/* Secure Exit Confirmation Modal */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-500/40 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl text-center space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center mx-auto">
              <LogOut className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-xl font-black text-white font-['Outfit']">
                Exit Projector Display Mode?
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                This will close the full-screen projector view and return to the Organizer Management Dashboard.
              </p>
            </div>

            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setShowExitModal(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
              >
                Cancel (Stay in Projector)
              </button>
              <button
                onClick={() => {
                  setShowExitModal(false);
                  setCurrentPage('dashboard');
                }}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-950/60 transition-all"
              >
                Yes, Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
