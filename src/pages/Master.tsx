import React, { useState, useMemo, useEffect } from 'react';
import {
  ShieldAlert,
  Radio,
  Clock,
  Play,
  Pause,
  Square,
  RotateCcw,
  Zap,
  Image as ImageIcon,
  Disc,
  User,
  Users,
  AlertTriangle,
  Tv,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { computeStationTimer } from '../lib/timerUtils';
import type { StationState, StationStatus } from '../types';

export const Master: React.FC = () => {
  const {
    allStations,
    db,
    setStationRound,
    setStationParticipant,
    sendStationTimerAction,
    requestResetAllStatuses,
    claimStation,
    setCurrentPage,
    setCurrentStationId,
    setDeviceRole,
  } = useApp();

  const [selectedRoundFilter, setSelectedRoundFilter] = useState<'all' | '1' | '2' | '3'>('all');

  // Live millisecond reference synchronized with projector & backend
  const [nowMs, setNowMs] = useState<number>(Date.now());
  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Format seconds to MM:SS
  const formatTime = (secs: number) => {
    const s = Math.max(0, Math.floor(secs));
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  const getStatusBadge = (status: StationStatus) => {
    switch (status) {
      case 'SPEAKING':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse';
      case 'PREPARING':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse';
      case 'SPINNING':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40 animate-spin';
      case 'TIME_UP':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-bounce';
      case 'PAUSED':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
      case 'COMPLETED':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'WAITING':
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  // Filter stations
  const filteredStations = useMemo(() => {
    if (selectedRoundFilter === 'all') return allStations;
    const r = parseInt(selectedRoundFilter, 10);
    return allStations.filter((s) => s.currentRound === r);
  }, [allStations, selectedRoundFilter]);

  // Overall event metrics
  const activeSpeakingCount = allStations.filter(
    (s) => s.status === 'SPEAKING' || s.status === 'PREPARING'
  ).length;
  const onlineStationsCount = allStations.filter((s) => {
    if (!s.claimedByDeviceId) return false;
    return Date.now() - (s.lastHeartbeat || 0) < 25000;
  }).length;

  const handleTakeOverStation = async (stationId: string) => {
    setDeviceRole('station');
    setCurrentStationId(stationId);
    await claimStation(stationId, true);
    const station = allStations.find((s) => s.id === stationId);
    const round = station?.currentRound || 1;
    if (round === 1) setCurrentPage('round1');
    else if (round === 2) setCurrentPage('round2');
    else setCurrentPage('round3');
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-purple-900/40 p-5 md:p-6 rounded-3xl shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-rose-600 p-0.5 shadow-xl shadow-purple-950/60 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <ShieldAlert className="w-7 h-7 text-purple-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight font-['Outfit']">
                Master Operations Dashboard
              </h1>
              <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-full">
                ADMIN / MASTER
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-300 mt-0.5">
              Real-time multi-station supervisor, live station synchronization, and global event controls.
            </p>
          </div>
        </div>

        {/* Global Reset All Statuses Button */}
        <div className="flex items-center gap-3">
          <button
            id="master-reset-all-statuses-btn"
            onClick={requestResetAllStatuses}
            className="px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs uppercase tracking-wider shadow-xl shadow-rose-950/70 border border-rose-400/40 flex items-center gap-2.5 transition-all hover:scale-[1.02] active:scale-[0.98]"
            title="Reset temporary event progress, timers, active stations, and used tags while preserving permanent participant data."
          >
            <RefreshCw className="w-4 h-4" />
            <span>RESET ALL STATUSES</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Total Stations</span>
            <Radio className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-black text-white">{allStations.length}</p>
          <span className="text-[10px] text-purple-300">Parallel event stages</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Connected Devices</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400">{onlineStationsCount}</p>
          <span className="text-[10px] text-slate-400">Heartbeat active (&lt;25s)</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Active Speeches</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-400">{activeSpeakingCount}</p>
          <span className="text-[10px] text-slate-400">Timers currently running</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Total Participants</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-blue-400">{db?.participants?.length || 0}</p>
          <span className="text-[10px] text-slate-400">Permanent registry</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b border-purple-900/20 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-2">Filter:</span>
          {(['all', '1', '2', '3'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setSelectedRoundFilter(r)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                selectedRoundFilter === r
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-950'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300'
              }`}
            >
              {r === 'all' ? 'All Stations' : `Round ${r}`}
            </button>
          ))}
        </div>
      </div>

      {/* Station Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredStations.map((station) => {
          const isOnline = station.claimedByDeviceId && Date.now() - (station.lastHeartbeat || 0) < 25000;
          const computedTimer = computeStationTimer(station, nowMs);
          const isRunning = computedTimer.isRunning;
          const remainingSecs = computedTimer.remainingSeconds;
          const totalSecs = computedTimer.durationSeconds;
          const progressPct = computedTimer.progressPercent;
          const isOvertime = computedTimer.isOvertime;
          const timerPhase = computedTimer.phase;

          return (
            <div
              key={station.id}
              id={`station-card-${station.id}`}
              className="bg-slate-900/90 border border-purple-900/30 rounded-3xl p-5 shadow-xl hover:border-purple-600/40 transition-all flex flex-col justify-between space-y-4"
            >
              {/* Top Station Header */}
              <div className="flex items-start justify-between gap-3 border-b border-purple-900/20 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-950 border border-purple-800/40 flex items-center justify-center text-purple-300 font-bold text-sm">
                    {station.name.substring(station.name.length - 1) || 'S'}
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-white font-['Outfit']">{station.name}</h3>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-400">{station.location}</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-purple-300 font-semibold font-mono">
                        Round {station.currentRound}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status and Device Indicator */}
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${getStatusBadge(
                      station.status
                    )}`}
                  >
                    {station.status}
                  </span>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isOnline ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-slate-600'
                      }`}
                    />
                    <span className="text-slate-400 font-mono">
                      {station.claimedByDeviceName ? station.claimedByDeviceName : 'Unclaimed'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Station Round Selector */}
              <div className="flex items-center justify-between gap-2 bg-slate-950 p-2.5 rounded-2xl border border-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider pl-1">
                  Station Round:
                </span>
                <div className="flex items-center gap-1.5">
                  {([1, 2, 3] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setStationRound(station.id, r)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                        station.currentRound === r
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      Round {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Contestant Information */}
              <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-purple-400" />
                    Active Contestant
                  </span>
                  {station.activeParticipant ? (
                    <button
                      onClick={() => setStationParticipant(station.id, null)}
                      className="text-[10px] text-rose-400 hover:underline"
                    >
                      Clear
                    </button>
                  ) : null}
                </div>

                {station.activeParticipant ? (
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h4 className="font-extrabold text-white text-base leading-tight">
                        {station.activeParticipant.name}
                      </h4>
                      <p className="text-xs text-slate-400">
                        #{station.activeParticipant.participantNumber} • {station.activeParticipant.organization || 'General'}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 bg-purple-950/60 border border-purple-700/50 text-purple-300 text-[10px] font-bold rounded-lg uppercase">
                      Current
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 italic">No contestant currently staged</span>
                    <select
                      onChange={(e) => setStationParticipant(station.id, e.target.value || null)}
                      className="bg-slate-900 border border-slate-700 text-xs text-slate-300 rounded-lg px-2 py-1"
                      defaultValue=""
                    >
                      <option value="">Assign Contestant...</option>
                      {db?.participants?.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.participantNumber} - {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Assigned Media / Topic Preview */}
              <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80 text-xs">
                {station.currentRound === 1 && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                      Assigned Image:
                    </span>
                    <span className="font-bold text-white">
                      {station.assignedImage?.title || 'None assigned yet'}
                    </span>
                  </div>
                )}
                {station.currentRound === 2 && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Disc className="w-3.5 h-3.5 text-purple-400" />
                      Wheel Topic:
                    </span>
                    <span className="font-bold text-purple-300 truncate max-w-[200px]">
                      {station.wheelSpin?.targetTopicTitle || station.assignedTopic?.topic || 'Not spun yet'}
                    </span>
                  </div>
                )}
                {station.currentRound === 3 && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      Topic / Prompt:
                    </span>
                    <span className="font-bold text-amber-300 truncate max-w-[200px]">
                      {station.assignedTopic?.topic || 'Direct speech topic'}
                    </span>
                  </div>
                )}
              </div>

              {/* Live Station Digital Timer Display */}
              <div className="bg-gradient-to-b from-slate-950 to-slate-900 p-4 rounded-2xl border border-purple-900/30 text-center space-y-3">
                <div className="flex items-center justify-between text-xs px-2">
                  <span className="text-purple-300 font-bold uppercase tracking-wider text-[10px]">
                    {isOvertime
                      ? 'Speech Overtime'
                      : timerPhase === 'prep'
                      ? 'Preparation Timer'
                      : 'Speech Timer'}
                  </span>
                  <span
                    className={`font-mono font-bold text-xs ${
                      isOvertime
                        ? 'text-rose-400 animate-pulse'
                        : isRunning
                        ? 'text-emerald-400 animate-pulse'
                        : 'text-slate-500'
                    }`}
                  >
                    {isOvertime ? 'OVERTIME' : isRunning ? 'RUNNING' : 'PAUSED/STOPPED'}
                  </span>
                </div>

                <div
                  className={`text-4xl md:text-5xl font-black font-mono tracking-tight select-none ${
                    isOvertime
                      ? 'text-rose-400 drop-shadow-[0_0_20px_rgba(244,63,94,0.6)]'
                      : remainingSecs <= 10 && remainingSecs > 0 && isRunning
                      ? 'text-amber-400 animate-pulse'
                      : 'text-white'
                  }`}
                >
                  {isOvertime ? computedTimer.formattedOvertime : computedTimer.formattedCountdown}
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isOvertime
                        ? 'bg-rose-500'
                        : remainingSecs <= 10 && remainingSecs > 0
                        ? 'bg-amber-500 animate-pulse'
                        : 'bg-gradient-to-r from-purple-500 to-emerald-500'
                    }`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>

                {/* Quick Skip Prep to Speech Button if station is in prep */}
                {timerPhase === 'prep' && (
                  <button
                    onClick={() =>
                      sendStationTimerAction(station.id, {
                        action: 'transition_to_speech',
                        phase: 'speech',
                        totalSeconds: 120,
                        remainingSeconds: 120,
                      })
                    }
                    className="w-full py-1.5 px-3 rounded-xl bg-purple-600/90 hover:bg-purple-600 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-purple-950 border border-purple-400/40"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Skip Prep ➔ Start Speaking Timer</span>
                  </button>
                )}

                {/* Master Quick Timer Controls for Station */}
                <div className="grid grid-cols-4 gap-2 pt-1">
                  <button
                    onClick={() =>
                      sendStationTimerAction(station.id, {
                        action: isRunning ? 'pause' : 'start',
                        phase: timerPhase === 'idle' ? (station.currentRound === 1 ? 'prep' : 'speech') : timerPhase,
                        remainingSeconds: remainingSecs,
                        totalSeconds: totalSecs,
                      })
                    }
                    className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                      isRunning
                        ? 'bg-amber-600 hover:bg-amber-500 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    {isRunning ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                    <span>{isRunning ? 'Pause' : 'Start'}</span>
                  </button>

                  <button
                    onClick={() =>
                      sendStationTimerAction(station.id, {
                        action: 'stop',
                        phase: timerPhase,
                        remainingSeconds: 0,
                      })
                    }
                    className="py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-rose-950"
                    title="Stop and fire buzzer"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Stop</span>
                  </button>

                  <button
                    onClick={() =>
                      sendStationTimerAction(station.id, {
                        action: 'reset',
                        phase: 'idle',
                        totalSeconds: totalSecs,
                        remainingSeconds: totalSecs,
                      })
                    }
                    className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>

                  <button
                    onClick={() => handleTakeOverStation(station.id)}
                    className="py-2 rounded-xl bg-purple-600/80 hover:bg-purple-600 text-white text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                    title="Switch this device to operate this station directly"
                  >
                    <span>Operate</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Station Footer Links */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-purple-900/20 text-slate-400">
                <button
                  onClick={() =>
                    window.open(`${window.location.origin}/?page=projector&station=${station.id}`, '_blank')
                  }
                  className="hover:text-blue-300 flex items-center gap-1 text-[11px] transition-colors"
                  title="Open dedicated projector display for this station"
                >
                  <Tv className="w-3.5 h-3.5 text-blue-400" />
                  <span>Station Projector</span>
                  <ExternalLink className="w-3 h-3" />
                </button>

                <button
                  onClick={() => handleTakeOverStation(station.id)}
                  className="hover:text-purple-300 text-[11px] font-semibold transition-colors"
                >
                  Control Stage →
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
