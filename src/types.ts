export type RoundStatus = 'pending' | 'ready' | 'in_progress' | 'completed' | 'completed_early' | 'time_up' | 'cancelled';

export type CustomFieldType = 'text' | 'number' | 'date' | 'dropdown' | 'checkbox';

export interface CustomFieldDefinition {
  id: string;
  name: string;
  key: string;
  type: CustomFieldType;
  options?: string[]; // for dropdown
  required?: boolean;
  isSystem?: boolean;
}

export interface Participant {
  id: string;
  participantNumber: string; // e.g., P-101
  name: string;
  college: string;
  department: string;
  status: 'registered' | 'checked_in' | 'active' | 'eliminated' | 'completed';
  round1Status: RoundStatus;
  round2Status: RoundStatus;
  round3Status: RoundStatus;
  customData: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface Topic {
  id: string;
  topic: string;
  category?: string;
  status: 'available' | 'used';
  usedByParticipantId?: string;
  usedByParticipantName?: string;
  usedAt?: string;
}

export interface EventImage {
  id: string;
  name: string;
  url: string;
  status: 'available' | 'used';
  usedByParticipantId?: string;
  usedByParticipantName?: string;
  usedAt?: string;
}

export interface Round1Result {
  id: string;
  participantId: string;
  participantName: string;
  college: string;
  imageId: string;
  imageName: string;
  imageUrl: string;
  prepDurationSeconds: number;
  speechDurationSeconds: number;
  targetSpeechDurationSeconds: number;
  startTime: string;
  endTime: string;
  status: RoundStatus;
  notes?: string;
}

export interface Round2Result {
  id: string;
  participantId: string;
  participantName: string;
  college: string;
  topicId: string;
  topic: string;
  prepDurationSeconds: number;
  speechDurationSeconds: number;
  targetSpeechDurationSeconds: number;
  startTime: string;
  endTime: string;
  status: RoundStatus;
  notes?: string;
}

export interface Round3Result {
  id: string;
  participantId: string;
  participantName: string;
  college: string;
  speechDurationSeconds: number;
  targetSpeechDurationSeconds: number;
  startTime: string;
  endTime: string;
  status: RoundStatus;
  notes?: string;
}

export interface EventStation {
  id: string;
  name: string;
  location: string;
}

export interface EventSettings {
  event: {
    name: string;
    tagline: string;
    logoText: string;
  };
  round1: {
    prepEnabled: boolean; // default true
    prepTimeSeconds: number; // default 30
    speechTimeSeconds: number; // default 120
    buzzerEnabled: boolean; // default true
    buzzerTimeSeconds: number; // default 120
    allowImageReuse: boolean;
  };
  round2: {
    prepEnabled: boolean; // default false (Round 2 starts speaking immediately)
    prepTimeSeconds: number; // default 0
    speechTimeSeconds: number; // default 120
    buzzerEnabled: boolean; // default true
    buzzerTimeSeconds: number; // default 120
    activeWheelTopicCount: number; // default 16
    topicReuseAllowed: boolean;
  };
  round3: {
    prepEnabled: boolean; // default false
    prepTimeSeconds: number; // default 0
    speechTimeSeconds: number; // default 120
    buzzerEnabled: boolean; // default true
    buzzerTimeSeconds: number; // default 120
  };
  buzzer: {
    laptopBuzzer: boolean;
    mobileBuzzer: boolean;
    volume: number; // 0 - 100
    sound: 'horn' | 'digital' | 'alarm' | 'siren' | 'custom';
    customAudioUrl?: string; // base64 or audio URL
    customAudioName?: string;
    autoBuzzerOnZero?: boolean;
  };
  stations?: EventStation[];
}

export interface EventLog {
  id: string;
  timestamp: string;
  action: string;
  round?: 'Round 1' | 'Round 2' | 'Round 3' | 'General';
  participantId?: string;
  participantName?: string;
  details: string;
}

export type StationStatus =
  | 'WAITING'
  | 'PREPARING'
  | 'SPINNING'
  | 'READY_TO_SPEAK'
  | 'SPEAKING'
  | 'TIME_UP'
  | 'PAUSED'
  | 'COMPLETED'
  | 'DISCONNECTED';

export interface StationWheelSpin {
  isSpinning: boolean;
  targetTopicId?: string;
  targetTopicTitle?: string;
  targetTopicCategory?: string;
  targetSliceIndex?: number;
  wheelTopics?: Topic[];
  startedAt?: number;
  durationMs?: number;
}

export interface StationState {
  id: string; // e.g. 'station-a', 'station-b'
  name: string;
  location: string;
  currentRound: 1 | 2 | 3;
  status: StationStatus;
  activeParticipantId: string | null;
  activeParticipant?: Participant | null;

  // Selected media / topic
  selectedImageId: string | null;
  selectedImage?: EventImage | null;
  selectedTopicId: string | null;
  selectedTopic?: Topic | null;
  pendingTopic?: Topic | null;

  // Round 2 Wheel Animation
  wheelSpin: StationWheelSpin | null;

  // Robust Shared Backend Timers
  timerMode: 'idle' | 'prep' | 'speech' | 'stopped' | 'time_up';
  timerStatus?: 'idle' | 'running' | 'paused' | 'stopped' | 'time_up';
  timerDuration?: number; // Configured total duration in seconds
  timerStartTime?: number | null; // Millisecond timestamp when current run started
  timerAccumulatedMs?: number; // Total milliseconds elapsed prior to current run
  timerStopTime?: number | null; // Millisecond timestamp when timer stopped
  timerTotalSeconds: number; // Legacy total seconds
  timerRemainingSeconds: number; // Legacy remaining seconds
  isTimerRunning: boolean;
  timerStartedAt?: number | null; // Legacy ms timestamp
  timerEndsAt?: number | null; // Millisecond timestamp when configured limit ends

  // Overtime and buzzer state
  buzzerTimeSeconds?: number;
  buzzerPlayed?: boolean;
  isOvertime?: boolean;
  overtimeSeconds?: number;

  // Buzzer
  buzzerTimestamp?: number;
  lastBuzzerEventId?: string;

  // Connected operator device tracking & lock
  claimedByDeviceId?: string | null;
  claimedByDeviceName?: string | null;
  controllerDeviceId?: string | null;
  controllerDeviceName?: string | null;
  lastHeartbeat?: number;
}

export interface LiveSyncState {
  currentRound: 1 | 2 | 3 | null;
  activeParticipantId: string | null;
  timerMode: 'idle' | 'prep' | 'speech' | 'stopped' | 'time_up';
  timerStatus?: 'idle' | 'running' | 'paused' | 'stopped' | 'time_up';
  timerDuration?: number;
  timerStartTime?: number | null;
  timerAccumulatedMs?: number;
  timerStopTime?: number | null;
  timerRemainingSeconds: number;
  timerTotalSeconds: number;
  isTimerRunning: boolean;
  timerStartedAt?: number | null;
  timerEndsAt?: number | null;
  buzzerTimeSeconds?: number;
  buzzerPlayed?: boolean;
  isOvertime?: boolean;
  overtimeSeconds?: number;
  activeItem?: {
    type: 'image' | 'topic' | 'final';
    title: string;
    mediaUrl?: string;
    id?: string;
    category?: string;
  };
  wheelSpin?: {
    isSpinning: boolean;
    targetTopicId?: string;
    targetTopicTitle?: string;
    targetIndex?: number;
    targetAngle?: number;
    wheelTopics?: Topic[];
    startedAt?: number;
    durationMs?: number;
  } | null;
  buzzerTimestamp?: number;
  locationId?: string;
  stationStates?: Record<string, StationState>;
}

export interface AppDatabase {
  participants: Participant[];
  customFields: CustomFieldDefinition[];
  topics: Topic[];
  images: EventImage[];
  round1Results: Round1Result[];
  round2Results: Round2Result[];
  round3Results: Round3Result[];
  settings: EventSettings;
  history: EventLog[];
  liveSync: LiveSyncState;
  stations?: Record<string, StationState>;
}

export type DeviceRole = 'station' | 'master' | 'projector';

export type PageId =
  | 'dashboard'
  | 'master'
  | 'participants'
  | 'round1'
  | 'round2'
  | 'round3'
  | 'topics'
  | 'images'
  | 'results'
  | 'excel'
  | 'history'
  | 'settings'
  | 'buzzer'
  | 'projector';
