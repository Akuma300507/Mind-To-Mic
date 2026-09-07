import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  AlertTriangle,
  Volume2,
  CheckCircle2,
} from 'lucide-react';
import { soundEngine } from '../../lib/audio';
import { useApp } from '../../context/AppContext';

export type TimerPhase = 'idle' | 'prep' | 'speech' | 'stopped' | 'time_up';

interface TimerProps {
  prepDurationSeconds?: number;
  speechDurationSeconds: number;
  hasPrepPhase?: boolean;
  participantName?: string;
  roundName: 'Round 1' | 'Round 2' | 'Round 3';
  buzzerEnabled?: boolean;
  onFinish?: (data: {
    status: 'completed' | 'completed_early' | 'time_up';
    prepDurationSeconds: number;
    speechDurationSeconds: number;
    startTime: string;
    endTime: string;
  }) => void;
  onPhaseChange?: (phase: TimerPhase) => void;
}

export const Timer: React.FC<TimerProps> = ({
  prepDurationSeconds = 30,
  speechDurationSeconds = 120,
  hasPrepPhase = false,
  participantName,
  roundName,
  buzzerEnabled = true,
  onFinish,
  onPhaseChange,
}) => {
  const {
    triggerBuzzer,
    updateLiveSync,
    sendTimerAction,
    sendStationTimerAction,
    currentStationId,
    setOnTimerStartPause,
    setOnTimerStop,
    setOnTimerReset,
    unlockSound,
    playBuzzerLocal,
  } = useApp();

  const [phase, setPhase] = useState<TimerPhase>('idle');
  const [isRunning, setIsRunning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(
    hasPrepPhase ? prepDurationSeconds : speechDurationSeconds
  );
  const [totalSecondsForPhase, setTotalSecondsForPhase] = useState(
    hasPrepPhase ? prepDurationSeconds : speechDurationSeconds
  );
  const [actualSpeechElapsed, setActualSpeechElapsed] = useState(0);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Time tracking refs to avoid drift
  const startTimeRef = useRef<string>('');
  const speechStartTimeRef = useRef<number | null>(null);
  const phaseEndTimestampRef = useRef<number | null>(null);
  const pausedTimeRemainingRef = useRef<number>(remainingSeconds);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronize phase with parent
  useEffect(() => {
    onPhaseChange?.(phase);
  }, [phase, onPhaseChange]);

  // Synchronize phase state with liveSync
  useEffect(() => {
    updateLiveSync({
      timerMode: phase,
      timerTotalSeconds: totalSecondsForPhase,
      isTimerRunning: isRunning,
    }).catch(() => {});
  }, [phase, isRunning, totalSecondsForPhase, updateLiveSync]);

  // Clear timer interval safely
  const clearIntervalSafe = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearIntervalSafe();
      setOnTimerStartPause(undefined);
      setOnTimerStop(undefined);
      setOnTimerReset(undefined);
    };
  }, [clearIntervalSafe, setOnTimerStartPause, setOnTimerStop, setOnTimerReset]);

  // Helper for starting countdown ticker
  const startTicker = useCallback(
    (targetDurationSeconds: number) => {
      clearIntervalSafe();
      const now = Date.now();
      phaseEndTimestampRef.current = now + targetDurationSeconds * 1000;

      timerIntervalRef.current = setInterval(() => {
        if (!phaseEndTimestampRef.current) return;
        const diff = Math.max(0, Math.ceil((phaseEndTimestampRef.current - Date.now()) / 1000));
        setRemainingSeconds(diff);

        // Warning tick at 10, 5, 4, 3, 2, 1
        if (diff <= 5 && diff > 0) {
          soundEngine.playWarningTick(50);
        }

        if (diff <= 0) {
          clearIntervalSafe();
          // Handle transition or end
          setPhase((currentPhase) => {
            if (currentPhase === 'prep') {
              // Prep is done, transition to speech!
              soundEngine.playPrepEndChime();
              setTotalSecondsForPhase(speechDurationSeconds);
              setRemainingSeconds(speechDurationSeconds);
              speechStartTimeRef.current = Date.now();
              // start speech phase ticker
              setTimeout(() => {
                startTicker(speechDurationSeconds);
              }, 100);
              return 'speech';
            } else if (currentPhase === 'speech' || currentPhase === 'idle') {
              // Time is up!
              setIsRunning(false);
              sendTimerAction({ action: 'time_up', round: roundName });
              if (currentStationId) {
                sendStationTimerAction(currentStationId, { action: 'time_up', phase: 'time_up', remainingSeconds: 0 }).catch(() => {});
              }
              if (buzzerEnabled) {
                triggerBuzzer('Timer Zero (Time Up)', roundName);
              }
              const endTime = new Date().toISOString();
              const speechDuration = speechDurationSeconds;
              setActualSpeechElapsed(speechDuration);
              onFinish?.({
                status: 'time_up',
                prepDurationSeconds: hasPrepPhase ? prepDurationSeconds : 0,
                speechDurationSeconds: speechDuration,
                startTime: startTimeRef.current || new Date().toISOString(),
                endTime,
              });
              return 'time_up';
            }
            return currentPhase;
          });
        }
      }, 250);
    },
    [clearIntervalSafe, speechDurationSeconds, prepDurationSeconds, hasPrepPhase, buzzerEnabled, triggerBuzzer, roundName, onFinish, sendTimerAction, sendStationTimerAction, currentStationId]
  );

  // START action
  const handleStart = useCallback(() => {
    unlockSound();
    if (isRunning) return;

    if (phase === 'idle') {
      startTimeRef.current = new Date().toISOString();
      if (hasPrepPhase) {
        setPhase('prep');
        setTotalSecondsForPhase(prepDurationSeconds);
        setRemainingSeconds(prepDurationSeconds);
        setIsRunning(true);
        sendTimerAction({
          action: 'start',
          phase: 'prep',
          totalSeconds: prepDurationSeconds,
          remainingSeconds: prepDurationSeconds,
          round: roundName,
        });
        if (currentStationId) {
          sendStationTimerAction(currentStationId, {
            action: 'start',
            phase: 'prep',
            totalSeconds: prepDurationSeconds,
            remainingSeconds: prepDurationSeconds,
          }).catch(() => {});
        }
        startTicker(prepDurationSeconds);
      } else {
        setPhase('speech');
        speechStartTimeRef.current = Date.now();
        setTotalSecondsForPhase(speechDurationSeconds);
        setRemainingSeconds(speechDurationSeconds);
        setIsRunning(true);
        sendTimerAction({
          action: 'start',
          phase: 'speech',
          totalSeconds: speechDurationSeconds,
          remainingSeconds: speechDurationSeconds,
          round: roundName,
        });
        if (currentStationId) {
          sendStationTimerAction(currentStationId, {
            action: 'start',
            phase: 'speech',
            totalSeconds: speechDurationSeconds,
            remainingSeconds: speechDurationSeconds,
          }).catch(() => {});
        }
        startTicker(speechDurationSeconds);
      }
    } else if (phase === 'prep' || phase === 'speech') {
      // Resume from pause
      setIsRunning(true);
      sendTimerAction({
        action: 'start',
        phase,
        totalSeconds: totalSecondsForPhase,
        remainingSeconds: pausedTimeRemainingRef.current,
        round: roundName,
      });
      if (currentStationId) {
        sendStationTimerAction(currentStationId, {
          action: 'start',
          phase,
          totalSeconds: totalSecondsForPhase,
          remainingSeconds: pausedTimeRemainingRef.current,
        }).catch(() => {});
      }
      startTicker(pausedTimeRemainingRef.current);
    }
  }, [hasPrepPhase, isRunning, phase, prepDurationSeconds, speechDurationSeconds, startTicker, unlockSound, sendTimerAction, sendStationTimerAction, currentStationId, roundName, totalSecondsForPhase]);

  // PAUSE action
  const handlePause = useCallback(() => {
    if (!isRunning) return;
    clearIntervalSafe();
    setIsRunning(false);
    pausedTimeRemainingRef.current = remainingSeconds;
    sendTimerAction({
      action: 'pause',
      phase,
      remainingSeconds,
      round: roundName,
    });
    if (currentStationId) {
      sendStationTimerAction(currentStationId, {
        action: 'pause',
        phase,
        remainingSeconds,
      }).catch(() => {});
    }
  }, [clearIntervalSafe, isRunning, remainingSeconds, sendTimerAction, sendStationTimerAction, currentStationId, phase, roundName]);

  // Toggle start/pause
  const handleToggleStartPause = useCallback(() => {
    if (isRunning) {
      handlePause();
    } else {
      handleStart();
    }
  }, [isRunning, handlePause, handleStart]);

  // STOP action (organizer manual stop before time runs out)
  const handleStop = useCallback(() => {
    if (phase === 'idle' || phase === 'stopped' || phase === 'time_up') return;

    clearIntervalSafe();
    setIsRunning(false);
    setPhase('stopped');
    sendTimerAction({
      action: 'stop',
      phase: 'stopped',
      remainingSeconds,
      round: roundName,
    });
    if (currentStationId) {
      sendStationTimerAction(currentStationId, {
        action: 'stop',
        phase: 'stopped',
        remainingSeconds,
      }).catch(() => {});
    }

    let speechDuration = 0;
    if (phase === 'speech') {
      speechDuration = Math.max(0, speechDurationSeconds - remainingSeconds);
    } else if (phase === 'prep') {
      speechDuration = 0;
    }
    setActualSpeechElapsed(speechDuration);

    const endTime = new Date().toISOString();
    onFinish?.({
      status: 'completed_early',
      prepDurationSeconds: hasPrepPhase ? prepDurationSeconds : 0,
      speechDurationSeconds: speechDuration,
      startTime: startTimeRef.current || new Date().toISOString(),
      endTime,
    });
  }, [phase, clearIntervalSafe, speechDurationSeconds, remainingSeconds, onFinish, hasPrepPhase, prepDurationSeconds, sendTimerAction, sendStationTimerAction, currentStationId, roundName]);

  // RESET action
  const executeReset = useCallback(() => {
    clearIntervalSafe();
    setIsRunning(false);
    setPhase('idle');
    const initialSeconds = hasPrepPhase ? prepDurationSeconds : speechDurationSeconds;
    setRemainingSeconds(initialSeconds);
    setTotalSecondsForPhase(initialSeconds);
    setActualSpeechElapsed(0);
    speechStartTimeRef.current = null;
    setShowResetConfirm(false);
    sendTimerAction({
      action: 'reset',
      totalSeconds: initialSeconds,
      remainingSeconds: initialSeconds,
      round: roundName,
    });
    if (currentStationId) {
      sendStationTimerAction(currentStationId, {
        action: 'reset',
        totalSeconds: initialSeconds,
        remainingSeconds: initialSeconds,
      }).catch(() => {});
    }
  }, [clearIntervalSafe, hasPrepPhase, prepDurationSeconds, speechDurationSeconds, sendTimerAction, sendStationTimerAction, currentStationId, roundName]);

  // Keyboard shortcut binding
  useEffect(() => {
    setOnTimerStartPause(() => handleToggleStartPause);
    setOnTimerStop(() => handleStop);
    setOnTimerReset(() => () => setShowResetConfirm(true));
  }, [handleToggleStartPause, handleStop, setOnTimerStartPause, setOnTimerStop, setOnTimerReset]);

  // Format time as MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Progress circle math
  const progressPercent =
    totalSecondsForPhase > 0 ? (remainingSeconds / totalSecondsForPhase) * 100 : 0;
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  // Determine stage colors
  let ringColor = 'stroke-purple-500';
  let badgeColor = 'bg-purple-500/20 text-purple-300 border-purple-500/40';
  let phaseLabel = 'READY TO START';

  if (phase === 'prep') {
    ringColor = 'stroke-amber-400';
    badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse';
    phaseLabel = 'PREPARE';
  } else if (phase === 'speech') {
    if (remainingSeconds <= 10) {
      ringColor = 'stroke-rose-500';
      badgeColor = 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-ping';
      phaseLabel = 'FINAL SECONDS';
    } else {
      ringColor = 'stroke-emerald-400';
      badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      phaseLabel = 'SPEAK NOW';
    }
  } else if (phase === 'time_up') {
    ringColor = 'stroke-rose-600';
    badgeColor = 'bg-rose-600 text-white border-rose-500';
    phaseLabel = 'TIME UP';
  } else if (phase === 'stopped') {
    ringColor = 'stroke-blue-400';
    badgeColor = 'bg-blue-500/20 text-blue-300 border-blue-500/40';
    phaseLabel = 'STOPPED';
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-slate-900/90 border border-purple-900/40 rounded-3xl shadow-2xl relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-950/20 via-transparent to-slate-950/50 pointer-events-none" />

      {/* Contestant identifier */}
      {participantName && (
        <div className="mb-4 text-center z-10">
          <span className="text-xs uppercase tracking-widest text-purple-400 font-bold">Speaking Now</span>
          <h2 className="text-2xl sm:text-3xl font-black text-white font-['Outfit'] tracking-tight">
            {participantName}
          </h2>
        </div>
      )}

      {/* Phase Badge */}
      <div className="mb-4 z-10">
        <span
          className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border transition-all duration-300 shadow-lg ${badgeColor}`}
        >
          {phaseLabel}
        </span>
      </div>

      {/* Circular Animated Countdown Dial */}
      <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center z-10">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 280 280">
          {/* Background track */}
          <circle
            cx="140"
            cy="140"
            r={radius}
            className="stroke-slate-800/80"
            strokeWidth="12"
            fill="transparent"
          />
          {/* Animated active track */}
          <circle
            cx="140"
            cy="140"
            r={radius}
            className={`${ringColor} transition-all duration-300 ease-linear`}
            strokeWidth="12"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>

        {/* Center Timer Typography */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none">
          {phase === 'time_up' ? (
            <div className="animate-bounce">
              <span className="text-4xl sm:text-5xl font-black text-rose-500 font-['Outfit'] tracking-tighter">
                TIME UP!
              </span>
              <p className="text-xs text-rose-300 font-bold uppercase tracking-wider mt-1">Buzzer Triggered</p>
            </div>
          ) : (
            <>
              <span className="text-5xl sm:text-6xl font-extrabold text-white font-mono tracking-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
                {formatTime(remainingSeconds)}
              </span>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">
                {phase === 'prep' ? 'Prep Countdown' : phase === 'speech' ? 'Speech Remaining' : 'Ready'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Actual Speech Duration summary if stopped or completed */}
      {(phase === 'stopped' || phase === 'time_up') && (
        <div className="mt-4 px-4 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-center z-10">
          <span className="text-xs text-slate-400">Actual Speech Duration: </span>
          <span className="text-sm font-bold text-purple-300 font-mono">
            {formatTime(actualSpeechElapsed)} ({actualSpeechElapsed} seconds)
          </span>
        </div>
      )}

      {/* Large Event Controller Action Buttons */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4 z-10 w-full max-w-lg">
        {/* START / PAUSE / RESUME */}
        {!isRunning ? (
          <button
            onClick={handleStart}
            disabled={phase === 'time_up' || phase === 'stopped'}
            className="flex-1 min-w-[130px] flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm uppercase tracking-wider shadow-lg shadow-emerald-950/60 hover:shadow-emerald-900/60 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>{phase === 'idle' ? 'START' : 'RESUME'}</span>
          </button>
        ) : (
          <button
            onClick={handlePause}
            className="flex-1 min-w-[130px] flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-sm uppercase tracking-wider shadow-lg shadow-amber-950/60 active:scale-95 transition-all"
          >
            <Pause className="w-5 h-5 fill-current" />
            <span>PAUSE</span>
          </button>
        )}

        {/* STOP (Saves speech duration immediately) */}
        <button
          onClick={handleStop}
          disabled={phase === 'idle' || phase === 'stopped' || phase === 'time_up'}
          className="flex-1 min-w-[130px] flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-sm uppercase tracking-wider shadow-lg shadow-rose-950/60 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          title="Manual stop records actual elapsed speech time"
        >
          <Square className="w-5 h-5 fill-current" />
          <span>STOP</span>
        </button>

        {/* RESET (Requires confirmation) */}
        <button
          onClick={() => setShowResetConfirm(true)}
          className="py-3.5 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-sm tracking-wider border border-slate-700/80 active:scale-95 transition-all"
          title="Reset timer (Shortcut: R)"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      {/* Reset Confirmation Dialog */}
      {showResetConfirm && (
        <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 z-30 text-center animate-in fade-in zoom-in-95 duration-150">
          <AlertTriangle className="w-12 h-12 text-amber-400 mb-3" />
          <h3 className="text-xl font-bold text-white font-['Outfit'] mb-1">Reset Current Timer?</h3>
          <p className="text-xs text-slate-300 max-w-sm mb-6">
            Resetting will stop the current countdown and return to the initial starting duration.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowResetConfirm(false)}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={executeReset}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-950/50"
            >
              Yes, Reset Timer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
