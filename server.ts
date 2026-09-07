import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

// Types representation for server
import type {
  AppDatabase,
  Participant,
  Topic,
  EventImage,
  CustomFieldDefinition,
  EventSettings,
  EventLog,
  LiveSyncState,
  StationState,
  StationStatus,
  StationWheelSpin,
} from './src/types';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial default seed
const defaultSettings: EventSettings = {
  event: {
    name: 'MIND TO MIC',
    tagline: 'THINK. SPEAK. EXPRESS.',
    logoText: 'MIND TO MIC',
  },
  round1: {
    prepTimeSeconds: 30,
    speechTimeSeconds: 120,
    allowImageReuse: false,
    buzzerEnabled: true,
  },
  round2: {
    activeWheelTopicCount: 20,
    prepTimeSeconds: 0,
    speechTimeSeconds: 120,
    prepEnabled: false, // Round 2 has NO preparation time
    topicReuseAllowed: false,
    buzzerEnabled: true,
  },
  round3: {
    speechTimeSeconds: 120,
    buzzerEnabled: true,
  },
  buzzer: {
    laptopBuzzer: true,
    mobileBuzzer: true,
    volume: 90,
    sound: 'horn',
    autoBuzzerOnZero: true,
  },
  stations: [
    { id: 'station-a', name: 'Station A', location: 'Room 101' },
    { id: 'station-b', name: 'Station B', location: 'Room 102' },
    { id: 'station-c', name: 'Station C', location: 'Room 103' },
    { id: 'station-d', name: 'Station D', location: 'Auditorium Stage' },
  ],
};

const defaultCustomFields: CustomFieldDefinition[] = [
  {
    id: 'f_phone',
    name: 'Phone Number',
    key: 'phone',
    type: 'text',
    required: false,
    isSystem: false,
  },
];

const defaultParticipants: Participant[] = [
  {
    id: 'p-101',
    participantNumber: 'M2M-001',
    name: 'Aarav Sharma',
    college: 'Delhi Technological University',
    department: 'Computer Science',
    status: 'active',
    round1Status: 'pending',
    round2Status: 'pending',
    round3Status: 'pending',
    customData: { phone: '+91 98765 43210' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'p-102',
    participantNumber: 'M2M-002',
    name: 'Maya Chen',
    college: 'Metropolitan Institute of Technology',
    department: 'Literature & Communications',
    status: 'active',
    round1Status: 'pending',
    round2Status: 'pending',
    round3Status: 'pending',
    customData: { phone: '+1 415 555 0192' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'p-103',
    participantNumber: 'M2M-003',
    name: 'Lucas Dupont',
    college: 'Sorbonne University',
    department: 'Philosophy & Ethics',
    status: 'active',
    round1Status: 'pending',
    round2Status: 'pending',
    round3Status: 'pending',
    customData: { phone: '+33 6 12 34 56 78' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'p-104',
    participantNumber: 'M2M-004',
    name: 'Priya Patel',
    college: 'National Law School',
    department: 'Public Policy',
    status: 'active',
    round1Status: 'pending',
    round2Status: 'pending',
    round3Status: 'pending',
    customData: { phone: '+91 91234 56789' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'p-105',
    participantNumber: 'M2M-005',
    name: 'David Kim',
    college: 'Seoul National University',
    department: 'Economics',
    status: 'active',
    round1Status: 'pending',
    round2Status: 'pending',
    round3Status: 'pending',
    customData: { phone: '+82 10 9876 5432' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'p-106',
    participantNumber: 'M2M-006',
    name: 'Zara Al-Mansoor',
    college: 'King Fahd University',
    department: 'Media Studies',
    status: 'active',
    round1Status: 'pending',
    round2Status: 'pending',
    round3Status: 'pending',
    customData: { phone: '+971 50 123 4567' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const defaultTopics: Topic[] = [
  { id: 'top-1', topic: 'Is AI creative or merely a parrot of human culture?', category: 'Technology', status: 'available' },
  { id: 'top-2', topic: 'The Power of Silence in an Age of Constant Noise', category: 'Philosophy', status: 'available' },
  { id: 'top-3', topic: 'Should college degrees remain the benchmark for intellect?', category: 'Education', status: 'available' },
  { id: 'top-4', topic: 'Digital Privacy: A Universal Right or a Modern Myth?', category: 'Society', status: 'available' },
  { id: 'top-5', topic: 'Can empathy be taught or is it hardwired?', category: 'Psychology', status: 'available' },
  { id: 'top-6', topic: 'The Myth of the Overnight Success Story', category: 'Mindset', status: 'available' },
  { id: 'top-7', topic: 'Why Failure is the Highest Form of Curriculum', category: 'Mindset', status: 'available' },
  { id: 'top-8', topic: 'Are algorithms polarizing human empathy?', category: 'Technology', status: 'available' },
  { id: 'top-9', topic: 'The Future of Clean Energy: Science vs Politics', category: 'Environment', status: 'available' },
  { id: 'top-10', topic: 'Is Cancel Culture Accountability or Retribution?', category: 'Culture', status: 'available' },
  { id: 'top-11', topic: 'The Vanishing Art of Deep Focused Work', category: 'Productivity', status: 'available' },
  { id: 'top-12', topic: 'Does Wealth Obligate Philanthropy?', category: 'Ethics', status: 'available' },
  { id: 'top-13', topic: 'Space Colonization vs Fixing Earth: Where should billions go?', category: 'Future', status: 'available' },
  { id: 'top-14', topic: 'The Illusion of Infinite Free Time', category: 'Time', status: 'available' },
  { id: 'top-15', topic: 'Is Social Media Making Us lonelier together?', category: 'Society', status: 'available' },
  { id: 'top-16', topic: 'Leadership in Crisis: Decisiveness vs Compassion', category: 'Leadership', status: 'available' },
  { id: 'top-17', topic: 'The Paradox of Choice: Does more freedom bring happiness?', category: 'Philosophy', status: 'available' },
  { id: 'top-18', topic: 'Virtual Reality vs Physical Reality: The new divide', category: 'Technology', status: 'available' },
  { id: 'top-19', topic: 'Who is responsible for climate action: Individuals or Corporations?', category: 'Environment', status: 'available' },
  { id: 'top-20', topic: 'The Price of Perfectionism in Youth', category: 'Psychology', status: 'available' },
  { id: 'top-21', topic: 'Can Humor be used as an Instrument of Truth?', category: 'Culture', status: 'available' },
  { id: 'top-22', topic: 'Why We Need More Generalists, Not Just Specialists', category: 'Career', status: 'available' },
  { id: 'top-23', topic: 'The Ethics of Human Genetic Engineering', category: 'Bioethics', status: 'available' },
  { id: 'top-24', topic: 'The Art of Disagreeing Without Becoming Enemies', category: 'Communication', status: 'available' },
  { id: 'top-25', topic: 'Will Automation Create a Leisure Society or Economic Despair?', category: 'Economics', status: 'available' },
];

const defaultImages: EventImage[] = [
  {
    id: 'img-1',
    name: 'A Solitary Mic on a Dark Stage',
    url: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1200&q=80',
    status: 'available',
  },
  {
    id: 'img-2',
    name: 'The Clockwork Gears of Thought',
    url: 'https://images.unsplash.com/photo-1508962914676-134849a727f0?auto=format&fit=crop&w=1200&q=80',
    status: 'available',
  },
  {
    id: 'img-3',
    name: 'Neon Labyrinth of the City',
    url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80',
    status: 'available',
  },
  {
    id: 'img-4',
    name: 'Human Hand Meeting Robotic Fingers',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    status: 'available',
  },
  {
    id: 'img-5',
    name: 'Roots of an Ancient Tree in Stone',
    url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80',
    status: 'available',
  },
  {
    id: 'img-6',
    name: 'Astronaut Staring into the Cosmic Abyss',
    url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
    status: 'available',
  },
  {
    id: 'img-7',
    name: 'A Single Lighthouse in a Stormy Ocean',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    status: 'available',
  },
  {
    id: 'img-8',
    name: 'Chess King Toppled in Moonlight',
    url: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?auto=format&fit=crop&w=1200&q=80',
    status: 'available',
  },
];

const defaultHistory: EventLog[] = [
  {
    id: 'log-1',
    timestamp: new Date().toISOString(),
    action: 'Event Initialized',
    round: 'General',
    details: 'Mind to Mic competition platform booted with initial participant and topic roster.',
  },
];

function createInitialStationState(id: string, name: string, location: string): StationState {
  return {
    id,
    name,
    location,
    currentRound: 1,
    status: 'WAITING',
    activeParticipantId: null,
    activeParticipant: null,
    selectedImageId: null,
    selectedImage: null,
    selectedTopicId: null,
    selectedTopic: null,
    wheelSpin: null,
    timerMode: 'idle',
    timerTotalSeconds: 120,
    timerRemainingSeconds: 120,
    isTimerRunning: false,
    timerStartedAt: null,
    timerEndsAt: null,
    controllerDeviceId: null,
    controllerDeviceName: null,
    lastHeartbeat: 0,
  };
}

function getInitialDatabase(): AppDatabase {
  const stations: Record<string, StationState> = {};
  (defaultSettings.stations || []).forEach((s) => {
    stations[s.id] = createInitialStationState(s.id, s.name, s.location);
  });

  return {
    participants: defaultParticipants,
    customFields: defaultCustomFields,
    topics: defaultTopics,
    images: defaultImages,
    round1Results: [],
    round2Results: [],
    round3Results: [],
    settings: defaultSettings,
    history: defaultHistory,
    stations,
    liveSync: {
      currentRound: 1,
      activeParticipantId: null,
      timerMode: 'idle',
      timerRemainingSeconds: 120,
      timerTotalSeconds: 120,
      isTimerRunning: false,
      stationStates: stations,
    },
  };
}

let db: AppDatabase;

try {
  if (fs.existsSync(DB_FILE)) {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    db = JSON.parse(raw);
    // Ensure all keys exist
    if (!db.settings) db.settings = defaultSettings;
    if (!db.settings.stations || db.settings.stations.length === 0) {
      db.settings.stations = defaultSettings.stations;
    }
    if (!db.participants) db.participants = defaultParticipants;
    if (!db.topics) db.topics = defaultTopics;
    if (!db.images) db.images = defaultImages;
    if (!db.customFields) db.customFields = defaultCustomFields;
    if (!db.round1Results) db.round1Results = [];
    if (!db.round2Results) db.round2Results = [];
    if (!db.round3Results) db.round3Results = [];
    if (!db.history) db.history = defaultHistory;
    if (!db.stations) db.stations = {};

    // Ensure all configured stations have station states
    (db.settings.stations || []).forEach((s) => {
      if (!db.stations![s.id]) {
        db.stations![s.id] = createInitialStationState(s.id, s.name, s.location);
      } else {
        // Sync name & location
        db.stations![s.id].name = s.name;
        db.stations![s.id].location = s.location;
      }
    });

    if (!db.liveSync) db.liveSync = getInitialDatabase().liveSync;
    db.liveSync.stationStates = db.stations;
  } else {
    db = getInitialDatabase();
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  }
} catch (err) {
  console.error('Error loading db.json, resetting to initial defaults', err);
  db = getInitialDatabase();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

// Helper to persist data to disk
let saveTimeout: NodeJS.Timeout | null = null;
function persistDB() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      if (db.stations) {
        db.liveSync.stationStates = db.stations;
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist database:', err);
    }
  }, 100);
}

// Synchronous persistence for critical actions like Reset
function persistDBSync() {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
  try {
    if (db.stations) {
      db.liveSync.stationStates = db.stations;
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist database synchronously:', err);
  }
}

// SSE clients for real-time mobile buzzer & projector sync
interface SSEClient {
  id: string;
  res: Response;
  type: 'projector' | 'buzzer' | 'organizer';
}
const sseClients: SSEClient[] = [];

function broadcastSSE(event: string, data: any) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach((client) => {
    try {
      client.res.write(payload);
    } catch {
      // client dropped
    }
  });
}

function logAction(action: string, details: string, round?: 'Round 1' | 'Round 2' | 'Round 3' | 'General', participantId?: string, participantName?: string) {
  const newLog: EventLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    timestamp: new Date().toISOString(),
    action,
    round: round || 'General',
    participantId,
    participantName,
    details,
  };
  db.history.unshift(newLog);
  if (db.history.length > 500) {
    db.history = db.history.slice(0, 500);
  }
  persistDB();
  broadcastSSE('history_updated', newLog);
}

// ================= API ROUTES =================

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), participantsCount: db.participants.length });
});

// Full state
app.get('/api/state', (req: Request, res: Response) => {
  res.json(db);
});

// Reset database to initial factory defaults
app.post('/api/reset-data', (req: Request, res: Response) => {
  db = getInitialDatabase();
  persistDB();
  logAction('Reset All Data', 'Organizer restored factory defaults for the event database.');
  broadcastSSE('state_reset', db);
  res.json({ success: true, message: 'Database reset to initial template state.' });
});

// SSE Endpoint for Live Sync and Buzzer
app.get('/api/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const type = (req.query.type as 'projector' | 'buzzer' | 'organizer') || 'organizer';
  const client: SSEClient = { id: clientId, res, type };
  sseClients.push(client);

  // Send initial ping and live sync state
  res.write(`event: connected\ndata: ${JSON.stringify({ clientId, liveSync: db.liveSync })}\n\n`);

  req.on('close', () => {
    const idx = sseClients.findIndex((c) => c.id === clientId);
    if (idx !== -1) sseClients.splice(idx, 1);
  });
});

// Buzzer trigger
app.post('/api/buzzer/trigger', (req: Request, res: Response) => {
  const { source, reason, round, participantName } = req.body;
  const triggerPayload = {
    timestamp: Date.now(),
    source: source || 'organizer',
    reason: reason || 'Manual Buzzer',
    round: round || 'General',
    sound: db.settings.buzzer.sound,
    volume: db.settings.buzzer.volume,
  };

  db.liveSync.buzzerTimestamp = triggerPayload.timestamp;
  broadcastSSE('buzzer_trigger', triggerPayload);
  logAction('Buzzer Triggered', `${reason || 'Manual Buzzer'} sounded by ${source || 'organizer'} (${round || 'General'}) ${participantName ? 'for ' + participantName : ''}`);

  res.json({ success: true, triggerPayload });
});

// Custom Buzzer Sound Upload / Management
app.post('/api/buzzer/custom-sound', (req: Request, res: Response) => {
  const { audioData, fileName } = req.body;
  if (!audioData) {
    return res.status(400).json({ error: 'Audio data is required' });
  }

  db.settings.buzzer.sound = 'custom';
  db.settings.buzzer.customAudioUrl = audioData;
  db.settings.buzzer.customAudioName = fileName || 'custom_buzzer_audio';

  persistDB();
  logAction('Custom Buzzer Updated', `Custom buzzer sound uploaded: ${fileName || 'custom audio'}`);
  broadcastSSE('settings_updated', db.settings);
  res.json({ success: true, buzzer: db.settings.buzzer });
});

app.delete('/api/buzzer/custom-sound', (req: Request, res: Response) => {
  db.settings.buzzer.sound = 'horn';
  delete db.settings.buzzer.customAudioUrl;
  delete db.settings.buzzer.customAudioName;

  persistDB();
  logAction('Custom Buzzer Reset', 'Custom buzzer sound removed, reset to classic air horn');
  broadcastSSE('settings_updated', db.settings);
  res.json({ success: true, buzzer: db.settings.buzzer });
});

// Live Sync (organizer updates projector & mobile display)
app.get('/api/live-sync', (req: Request, res: Response) => {
  res.json(db.liveSync);
});

app.post('/api/live-sync', (req: Request, res: Response) => {
  const updates: Partial<LiveSyncState> = req.body;
  db.liveSync = { ...db.liveSync, ...updates };
  broadcastSSE('live_sync_update', db.liveSync);
  res.json({ success: true, liveSync: db.liveSync });
});

// Synchronized Timer Action Endpoint
app.post('/api/timer/action', (req: Request, res: Response) => {
  const { action, phase, totalSeconds, remainingSeconds, round, endsAt } = req.body;
  const now = Date.now();

  if (action === 'start') {
    const rem = typeof remainingSeconds === 'number' ? remainingSeconds : totalSeconds;
    db.liveSync.timerMode = phase || 'speech';
    db.liveSync.timerTotalSeconds = totalSeconds;
    db.liveSync.timerRemainingSeconds = rem;
    db.liveSync.isTimerRunning = true;
    db.liveSync.timerStartedAt = now;
    db.liveSync.timerEndsAt = typeof endsAt === 'number' ? endsAt : now + rem * 1000;
  } else if (action === 'pause') {
    let rem = db.liveSync.timerRemainingSeconds;
    if (db.liveSync.isTimerRunning && db.liveSync.timerEndsAt) {
      rem = Math.max(0, Math.ceil((db.liveSync.timerEndsAt - now) / 1000));
    }
    db.liveSync.isTimerRunning = false;
    db.liveSync.timerRemainingSeconds = rem;
    db.liveSync.timerStartedAt = null;
    db.liveSync.timerEndsAt = null;
  } else if (action === 'stop' || action === 'reset') {
    db.liveSync.isTimerRunning = false;
    db.liveSync.timerMode = action === 'reset' ? 'idle' : 'stopped';
    db.liveSync.timerRemainingSeconds = totalSeconds || db.liveSync.timerTotalSeconds;
    db.liveSync.timerStartedAt = null;
    db.liveSync.timerEndsAt = null;
  } else if (action === 'time_up') {
    db.liveSync.isTimerRunning = false;
    db.liveSync.timerMode = 'time_up';
    db.liveSync.timerRemainingSeconds = 0;
    db.liveSync.timerStartedAt = null;
    db.liveSync.timerEndsAt = null;

    if (db.settings.buzzer.autoBuzzerOnZero) {
      db.liveSync.buzzerTimestamp = now;
      broadcastSSE('buzzer_trigger', {
        timestamp: now,
        source: 'timer_auto',
        reason: 'Time Expired (00:00)',
        round: round || 'General',
        sound: db.settings.buzzer.sound,
        volume: db.settings.buzzer.volume,
      });
    }
  }

  persistDB();
  broadcastSSE('timer_update', {
    timerMode: db.liveSync.timerMode,
    timerTotalSeconds: db.liveSync.timerTotalSeconds,
    timerRemainingSeconds: db.liveSync.timerRemainingSeconds,
    isTimerRunning: db.liveSync.isTimerRunning,
    timerStartedAt: db.liveSync.timerStartedAt,
    timerEndsAt: db.liveSync.timerEndsAt,
  });
  broadcastSSE('live_sync_update', db.liveSync);

  res.json({ success: true, liveSync: db.liveSync });
});

// Atomic Round 1 Image Assignment (No-repeat across devices/stations)
app.post('/api/round1/assign-image', (req: Request, res: Response) => {
  const { participantId, participantName, stationId } = req.body;

  // Filter available images
  let candidates = db.images.filter((img) => img.status === 'available');
  if (candidates.length === 0) {
    if (db.settings.round1.allowImageReuse) {
      candidates = db.images;
    } else {
      return res.status(409).json({
        error: 'No unused images left in the pool. Reset image pool or allow image reuse in settings.',
      });
    }
  }

  // Random selection
  const chosen = candidates[Math.floor(Math.random() * candidates.length)];

  // Mark as used
  if (!db.settings.round1.allowImageReuse) {
    chosen.status = 'used';
    chosen.usedByParticipantId = participantId;
    chosen.usedByParticipantName = participantName;
    chosen.usedAt = new Date().toISOString();
  }

  // Update live sync
  db.liveSync.currentRound = 1;
  if (participantId) db.liveSync.activeParticipantId = participantId;
  db.liveSync.activeItem = {
    type: 'image',
    title: chosen.name,
    mediaUrl: chosen.url,
    id: chosen.id,
  };

  persistDB();
  logAction('Image Assigned', `Assigned image "${chosen.name}" to contestant ${participantName || participantId || 'N/A'}`);
  broadcastSSE('images_updated', db.images);
  broadcastSSE('live_sync_update', db.liveSync);

  res.json({ success: true, image: chosen, liveSync: db.liveSync });
});

// Atomic Round 2 Topic Spin (synchronized spin across devices & projector)
app.post('/api/round2/spin-topic', (req: Request, res: Response) => {
  const { participantId, participantName, stationId, wheelTopicIds } = req.body;

  // Pool of available topics
  let pool = db.topics.filter((t) => t.status === 'available');
  if (pool.length === 0) {
    if (db.settings.round2.topicReuseAllowed) {
      pool = db.topics;
    } else {
      return res.status(409).json({
        error: 'No unused topics left in the pool. Reset topic pool or allow topic reuse in settings.',
      });
    }
  }

  // Ensure selection is strictly among topics rendered on the active wheel
  const wheelCount = db.settings.round2.activeWheelTopicCount || 20;
  let candidates = pool;
  if (Array.isArray(wheelTopicIds) && wheelTopicIds.length > 0) {
    const fromWheel = pool.filter((t) => wheelTopicIds.includes(t.id));
    if (fromWheel.length > 0) {
      candidates = fromWheel;
    } else {
      candidates = pool.slice(0, wheelCount);
    }
  } else {
    candidates = pool.slice(0, wheelCount);
  }

  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  const targetIndex = candidates.findIndex((t) => t.id === chosen.id);

  if (!db.settings.round2.topicReuseAllowed) {
    chosen.status = 'used';
    chosen.usedByParticipantId = participantId;
    chosen.usedByParticipantName = participantName;
    chosen.usedAt = new Date().toISOString();
  }

  const spinDurationMs = 4800;
  const startedAt = Date.now();

  db.liveSync.currentRound = 2;
  if (participantId) db.liveSync.activeParticipantId = participantId;
  db.liveSync.wheelSpin = {
    isSpinning: true,
    targetTopicId: chosen.id,
    targetTopicTitle: chosen.topic,
    targetIndex: targetIndex >= 0 ? targetIndex : 0,
    wheelTopics: candidates,
    startedAt,
    durationMs: spinDurationMs,
  };
  // Topic text remains hidden while wheel is spinning
  db.liveSync.activeItem = undefined;

  persistDB();
  logAction('Topic Spun', `Wheel spin initiated: landed on "${chosen.topic}" for contestant ${participantName || participantId || 'N/A'}`);

  broadcastSSE('wheel_spin_started', {
    topic: chosen,
    targetTopicId: chosen.id,
    targetIndex: targetIndex >= 0 ? targetIndex : 0,
    wheelTopics: candidates,
    startedAt,
    durationMs: spinDurationMs,
  });
  broadcastSSE('topics_updated', db.topics);
  broadcastSSE('live_sync_update', db.liveSync);

  res.json({
    success: true,
    topic: chosen,
    startedAt,
    durationMs: spinDurationMs,
    liveSync: db.liveSync,
  });
});

// ================= STATION API ROUTES =================

// Helper to get or create station
function getStation(id: string): StationState {
  if (!db.stations) db.stations = {};
  if (!db.stations[id]) {
    const configStation = db.settings.stations?.find((s) => s.id === id);
    db.stations[id] = createInitialStationState(
      id,
      configStation?.name || `Station ${id.toUpperCase()}`,
      configStation?.location || 'Auditorium'
    );
  }
  return db.stations[id];
}

// Get all stations
app.get('/api/stations', (req: Request, res: Response) => {
  if (!db.stations) db.stations = {};
  res.json(Object.values(db.stations));
});

// Get single station
app.get('/api/stations/:id', (req: Request, res: Response) => {
  const station = getStation(req.params.id);
  res.json(station);
});

// Claim station (with takeover conflict detection)
app.post('/api/stations/:id/claim', (req: Request, res: Response) => {
  const station = getStation(req.params.id);
  const { deviceId, deviceName, force } = req.body;

  if (!deviceId) {
    return res.status(400).json({ error: 'deviceId is required' });
  }

  const now = Date.now();
  const isCurrentlyControlled =
    station.controllerDeviceId &&
    station.controllerDeviceId !== deviceId &&
    now - (station.lastHeartbeat || 0) < 25000;

  if (isCurrentlyControlled && !force) {
    return res.status(409).json({
      conflict: true,
      currentDeviceName: station.controllerDeviceName || 'Another Device',
      message: `${station.name} is currently active on another device.`,
    });
  }

  station.controllerDeviceId = deviceId;
  station.controllerDeviceName = deviceName || `Device ${deviceId.slice(-4)}`;
  station.lastHeartbeat = now;
  if (station.status === 'DISCONNECTED') {
    station.status = 'WAITING';
  }

  persistDB();
  broadcastSSE('station_updated', station);
  logAction('Station Claimed', `${station.controllerDeviceName} assumed control of ${station.name}`);
  res.json({ success: true, station });
});

// Heartbeat to keep station controller active
app.post('/api/stations/:id/heartbeat', (req: Request, res: Response) => {
  const station = getStation(req.params.id);
  const { deviceId, deviceName } = req.body;

  if (deviceId) {
    if (!station.controllerDeviceId || station.controllerDeviceId === deviceId) {
      station.controllerDeviceId = deviceId;
      if (deviceName) station.controllerDeviceName = deviceName;
      station.lastHeartbeat = Date.now();
    }
  }

  persistDB();
  res.json({ success: true, station });
});

// Release station control
app.post('/api/stations/:id/release', (req: Request, res: Response) => {
  const station = getStation(req.params.id);
  const { deviceId } = req.body;

  if (station.controllerDeviceId === deviceId) {
    station.controllerDeviceId = null;
    station.controllerDeviceName = null;
    station.lastHeartbeat = 0;
    persistDB();
    broadcastSSE('station_updated', station);
  }

  res.json({ success: true });
});

// Set Station Round (Round is station-specific, not event-global!)
app.post('/api/stations/:id/set-round', (req: Request, res: Response) => {
  const station = getStation(req.params.id);
  const { round } = req.body;

  if (![1, 2, 3].includes(Number(round))) {
    return res.status(400).json({ error: 'Invalid round number. Must be 1, 2, or 3.' });
  }

  station.currentRound = Number(round) as 1 | 2 | 3;
  station.status = 'WAITING';
  station.selectedImageId = null;
  station.selectedImage = null;
  station.selectedTopicId = null;
  station.selectedTopic = null;
  station.wheelSpin = null;

  db.liveSync.currentRound = station.currentRound;
  db.liveSync.wheelSpin = null;
  db.liveSync.activeItem = undefined;

  const roundDuration =
    station.currentRound === 1
      ? db.settings.round1.speechTimeSeconds || 120
      : station.currentRound === 2
      ? db.settings.round2.speechTimeSeconds || 120
      : db.settings.round3.speechTimeSeconds || 120;

  station.timerMode = 'idle';
  station.timerTotalSeconds = roundDuration;
  station.timerRemainingSeconds = roundDuration;
  station.isTimerRunning = false;
  station.timerStartedAt = null;
  station.timerEndsAt = null;

  db.liveSync.timerMode = 'idle';
  db.liveSync.timerTotalSeconds = roundDuration;
  db.liveSync.timerRemainingSeconds = roundDuration;
  db.liveSync.isTimerRunning = false;
  db.liveSync.timerStartedAt = null;
  db.liveSync.timerEndsAt = null;

  persistDB();
  logAction('Station Round Updated', `${station.name} switched to Round ${station.currentRound}`);
  broadcastSSE('station_updated', station);
  broadcastSSE('live_sync_update', db.liveSync);
  res.json({ success: true, station });
});

// Set Station Active Participant
app.post('/api/stations/:id/set-participant', (req: Request, res: Response) => {
  const station = getStation(req.params.id);
  const { participantId } = req.body;

  station.activeParticipantId = participantId || null;
  station.activeParticipant = participantId
    ? db.participants.find((p) => p.id === participantId) || null
    : null;

  db.liveSync.activeParticipantId = participantId || null;
  db.liveSync.activeItem = undefined;
  db.liveSync.wheelSpin = null;

  // Reset current station item if contestant changes
  station.selectedImageId = null;
  station.selectedImage = null;
  station.selectedTopicId = null;
  station.selectedTopic = null;
  station.wheelSpin = null;
  station.status = 'WAITING';

  persistDB();
  broadcastSSE('station_updated', station);
  broadcastSSE('live_sync_update', db.liveSync);
  res.json({ success: true, station });
});

// Atomic Round 1 Image Assignment for Station (Global Uniqueness)
app.post('/api/stations/:id/assign-image', (req: Request, res: Response) => {
  const station = getStation(req.params.id);
  const { participantId, participantName } = req.body;

  if (participantId) {
    station.activeParticipantId = participantId;
    station.activeParticipant = db.participants.find((p) => p.id === participantId) || station.activeParticipant;
  }

  // Filter available images globally
  let candidates = db.images.filter((img) => img.status === 'available');
  if (candidates.length === 0) {
    if (db.settings.round1.allowImageReuse) {
      candidates = db.images;
    } else {
      return res.status(409).json({
        error: 'No unused images left in the pool. Reset image pool or allow image reuse in settings.',
      });
    }
  }

  // Random selection
  const chosen = candidates[Math.floor(Math.random() * candidates.length)];

  // Mark as used globally
  if (!db.settings.round1.allowImageReuse) {
    chosen.status = 'used';
    chosen.usedByParticipantId = station.activeParticipantId || undefined;
    chosen.usedByParticipantName = participantName || station.activeParticipant?.name || undefined;
    chosen.usedAt = new Date().toISOString();
  }

  station.selectedImageId = chosen.id;
  station.selectedImage = chosen;
  station.currentRound = 1;

  const hasPrep = (db.settings.round1.prepTimeSeconds || 0) > 0;
  if (hasPrep) {
    station.status = 'PREPARING';
    station.timerMode = 'prep';
    station.timerTotalSeconds = db.settings.round1.prepTimeSeconds || 30;
    station.timerRemainingSeconds = db.settings.round1.prepTimeSeconds || 30;
  } else {
    station.status = 'SPEAKING';
    station.timerMode = 'speech';
    station.timerTotalSeconds = db.settings.round1.speechTimeSeconds || 120;
    station.timerRemainingSeconds = db.settings.round1.speechTimeSeconds || 120;
  }

  station.isTimerRunning = false;
  station.timerStartedAt = null;
  station.timerEndsAt = null;

  persistDB();
  logAction('Image Assigned', `Assigned image "${chosen.name}" at ${station.name} to contestant ${participantName || station.activeParticipant?.name || 'Contestant'}`);

  // Mirror to liveSync
  db.liveSync.currentRound = 1;
  if (station.activeParticipantId) db.liveSync.activeParticipantId = station.activeParticipantId;
  db.liveSync.activeItem = {
    type: 'image',
    title: chosen.name,
    mediaUrl: chosen.url,
    id: chosen.id,
  };
  db.liveSync.timerMode = station.timerMode;
  db.liveSync.timerTotalSeconds = station.timerTotalSeconds;
  db.liveSync.timerRemainingSeconds = station.timerRemainingSeconds;
  db.liveSync.isTimerRunning = false;
  db.liveSync.timerStartedAt = null;
  db.liveSync.timerEndsAt = null;

  broadcastSSE('images_updated', db.images);
  broadcastSSE('station_updated', station);
  broadcastSSE('live_sync_update', db.liveSync);

  res.json({ success: true, image: chosen, station });
});

// Atomic Round 2 Topic Spin for Station (Single Source of Truth, Global Uniqueness)
app.post('/api/stations/:id/spin-topic', (req: Request, res: Response) => {
  const station = getStation(req.params.id);
  const { participantId, participantName, wheelTopicIds } = req.body;

  if (participantId) {
    station.activeParticipantId = participantId;
    station.activeParticipant = db.participants.find((p) => p.id === participantId) || station.activeParticipant;
  }

  // Pool of available topics globally
  let pool = db.topics.filter((t) => t.status === 'available');
  if (pool.length === 0) {
    if (db.settings.round2.topicReuseAllowed) {
      pool = db.topics;
    } else {
      return res.status(409).json({
        error: 'No unused topics left in the pool. Reset topic pool or allow topic reuse in settings.',
      });
    }
  }

  // Ensure candidates are selected from the active wheel slices
  const wheelCount = db.settings.round2.activeWheelTopicCount || 20;
  let candidates = pool;
  if (Array.isArray(wheelTopicIds) && wheelTopicIds.length > 0) {
    const fromWheel = pool.filter((t) => wheelTopicIds.includes(t.id));
    if (fromWheel.length > 0) {
      candidates = fromWheel;
    } else {
      candidates = pool.slice(0, wheelCount);
    }
  } else {
    candidates = pool.slice(0, wheelCount);
  }

  // Select EXACTLY ONE topic in backend from the wheel candidates
  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  const targetIndex = candidates.findIndex((t) => t.id === chosen.id);

  // Immediately claim as USED in backend
  if (!db.settings.round2.topicReuseAllowed) {
    chosen.status = 'used';
    chosen.usedByParticipantId = station.activeParticipantId || undefined;
    chosen.usedByParticipantName = participantName || station.activeParticipant?.name || undefined;
    chosen.usedAt = new Date().toISOString();
  }

  const spinDurationMs = 4800;
  const startedAt = Date.now();

  station.currentRound = 2;
  // Keep topic hidden while wheel is spinning!
  station.selectedTopicId = null;
  station.selectedTopic = null;
  station.pendingTopic = chosen;
  station.status = 'SPINNING';
  station.wheelSpin = {
    isSpinning: true,
    targetTopicId: chosen.id,
    targetTopicTitle: chosen.topic,
    targetTopicCategory: chosen.category,
    targetSliceIndex: targetIndex >= 0 ? targetIndex : 0,
    wheelTopics: candidates,
    startedAt,
    durationMs: spinDurationMs,
  };

  // Mirror to liveSync without revealing activeItem text until spin completes
  db.liveSync.currentRound = 2;
  if (station.activeParticipantId) db.liveSync.activeParticipantId = station.activeParticipantId;
  db.liveSync.activeItem = undefined;
  db.liveSync.wheelSpin = station.wheelSpin;

  persistDB();
  logAction('Topic Spun', `Wheel spin initiated at ${station.name} for contestant ${participantName || station.activeParticipant?.name || 'Contestant'}`);

  broadcastSSE('wheel_spin_started', {
    stationId: station.id,
    topic: chosen,
    targetTopicId: chosen.id,
    targetIndex: targetIndex >= 0 ? targetIndex : 0,
    wheelTopics: candidates,
    startedAt,
    durationMs: spinDurationMs,
  });
  broadcastSSE('topics_updated', db.topics);
  broadcastSSE('station_updated', station);
  broadcastSSE('live_sync_update', db.liveSync);

  res.json({
    success: true,
    topic: chosen,
    startedAt,
    durationMs: spinDurationMs,
    station,
  });
});

// Complete Round 2 Spin -> Reveal topic and transition to Speaking mode
app.post('/api/stations/:id/spin-complete', (req: Request, res: Response) => {
  const station = getStation(req.params.id);
  const speechSec = db.settings.round2.speechTimeSeconds || 120;

  // Reveal winning topic now that spin is fully complete
  const winningTopic = station.pendingTopic || station.selectedTopic || db.topics.find((t) => t.id === station.wheelSpin?.targetTopicId);
  if (winningTopic) {
    station.selectedTopic = winningTopic;
    station.selectedTopicId = winningTopic.id;
    db.liveSync.activeItem = {
      type: 'topic',
      title: winningTopic.topic,
      id: winningTopic.id,
      category: winningTopic.category,
    };
  }
  station.pendingTopic = undefined;
  station.wheelSpin = null;
  db.liveSync.wheelSpin = null;

  // Setup speaking timer ready for operator to start (avoid auto-start desync with operator dashboard)
  station.status = 'READY_TO_SPEAK';
  station.timerMode = 'speech';
  station.timerTotalSeconds = speechSec;
  station.timerRemainingSeconds = speechSec;
  station.isTimerRunning = false;
  station.timerStartedAt = null;
  station.timerEndsAt = null;

  db.liveSync.timerMode = 'speech';
  db.liveSync.timerTotalSeconds = speechSec;
  db.liveSync.timerRemainingSeconds = speechSec;
  db.liveSync.isTimerRunning = false;
  db.liveSync.timerStartedAt = null;
  db.liveSync.timerEndsAt = null;

  persistDB();
  broadcastSSE('station_updated', station);
  broadcastSSE('live_sync_update', db.liveSync);
  res.json({ success: true, station, winningTopic });
});

// Independent Station Timer Action
app.post('/api/stations/:id/timer', (req: Request, res: Response) => {
  const station = getStation(req.params.id);
  const { action, phase, totalSeconds, remainingSeconds, round, endsAt } = req.body;
  const now = Date.now();

  if (action === 'start') {
    const rem = typeof remainingSeconds === 'number' ? remainingSeconds : totalSeconds || station.timerRemainingSeconds;
    station.timerMode = phase || station.timerMode || 'speech';
    station.timerTotalSeconds = totalSeconds || station.timerTotalSeconds;
    station.timerRemainingSeconds = rem;
    station.isTimerRunning = true;
    station.timerStartedAt = now;
    station.timerEndsAt = typeof endsAt === 'number' ? endsAt : now + rem * 1000;
    station.status = station.timerMode === 'prep' ? 'PREPARING' : 'SPEAKING';

    db.liveSync.timerMode = station.timerMode;
    db.liveSync.timerTotalSeconds = station.timerTotalSeconds;
    db.liveSync.timerRemainingSeconds = station.timerRemainingSeconds;
    db.liveSync.isTimerRunning = true;
    db.liveSync.timerStartedAt = station.timerStartedAt;
    db.liveSync.timerEndsAt = station.timerEndsAt;
  } else if (action === 'pause') {
    let rem = station.timerRemainingSeconds;
    if (station.isTimerRunning && station.timerEndsAt) {
      rem = Math.max(0, Math.ceil((station.timerEndsAt - now) / 1000));
    }
    station.isTimerRunning = false;
    station.status = 'PAUSED';
    station.timerRemainingSeconds = rem;
    station.timerStartedAt = null;
    station.timerEndsAt = null;

    db.liveSync.isTimerRunning = false;
    db.liveSync.timerRemainingSeconds = rem;
    db.liveSync.timerStartedAt = null;
    db.liveSync.timerEndsAt = null;
  } else if (action === 'stop' || action === 'stop_with_buzzer') {
    // STOP TIMER: Immediately stops timer and triggers buzzer
    station.isTimerRunning = false;
    station.status = 'TIME_UP';
    station.timerMode = 'stopped';
    station.timerRemainingSeconds = typeof remainingSeconds === 'number' ? remainingSeconds : station.timerRemainingSeconds;
    station.timerStartedAt = null;
    station.timerEndsAt = null;
    station.buzzerTimestamp = now;
    station.lastBuzzerEventId = `buzzer-${now}-${station.id}`;

    db.liveSync.isTimerRunning = false;
    db.liveSync.timerMode = 'stopped';
    db.liveSync.timerRemainingSeconds = station.timerRemainingSeconds;
    db.liveSync.timerStartedAt = null;
    db.liveSync.timerEndsAt = null;

    broadcastSSE('buzzer_trigger', {
      timestamp: now,
      eventId: station.lastBuzzerEventId,
      stationId: station.id,
      stationName: station.name,
      source: 'operator_stop',
      reason: 'Operator Stopped Speech',
      round: round || `Round ${station.currentRound}`,
      participantName: station.activeParticipant?.name,
      sound: db.settings.buzzer.sound,
      volume: db.settings.buzzer.volume,
    });
  } else if (action === 'time_up') {
    // Time expired (00:00)
    station.isTimerRunning = false;
    station.status = 'TIME_UP';
    station.timerMode = 'time_up';
    station.timerRemainingSeconds = 0;
    station.timerStartedAt = null;
    station.timerEndsAt = null;
    station.buzzerTimestamp = now;
    station.lastBuzzerEventId = `buzzer-${now}-${station.id}`;

    db.liveSync.isTimerRunning = false;
    db.liveSync.timerMode = 'time_up';
    db.liveSync.timerRemainingSeconds = 0;
    db.liveSync.timerStartedAt = null;
    db.liveSync.timerEndsAt = null;

    if (db.settings.buzzer.autoBuzzerOnZero) {
      broadcastSSE('buzzer_trigger', {
        timestamp: now,
        eventId: station.lastBuzzerEventId,
        stationId: station.id,
        stationName: station.name,
        source: 'timer_auto',
        reason: 'Time Expired (00:00)',
        round: round || `Round ${station.currentRound}`,
        participantName: station.activeParticipant?.name,
        sound: db.settings.buzzer.sound,
        volume: db.settings.buzzer.volume,
      });
    }
  } else if (action === 'reset') {
    station.isTimerRunning = false;
    station.status = 'WAITING';
    station.timerMode = 'idle';
    station.timerRemainingSeconds = totalSeconds || station.timerTotalSeconds;
    station.timerStartedAt = null;
    station.timerEndsAt = null;

    db.liveSync.isTimerRunning = false;
    db.liveSync.timerMode = 'idle';
    db.liveSync.timerRemainingSeconds = station.timerRemainingSeconds;
    db.liveSync.timerStartedAt = null;
    db.liveSync.timerEndsAt = null;
  }

  persistDB();
  broadcastSSE('station_updated', station);
  broadcastSSE('live_sync_update', db.liveSync);
  res.json({ success: true, station });
});

// RESET ALL STATUSES (Master / Admin Command)
// Resets temporary event progress, timers, used images, used topics, active station states
// Preserves all permanent participant data!
app.post('/api/event/reset-all-statuses', (req: Request, res: Response) => {
  // 1. Reset all stations to initial WAITING state
  if (!db.stations) db.stations = {};
  (db.settings.stations || []).forEach((s) => {
    db.stations![s.id] = createInitialStationState(s.id, s.name, s.location);
  });

  // 2. Reset participants round statuses (DO NOT DELETE PARTICIPANT RECORDS!)
  db.participants.forEach((p) => {
    p.status = 'active';
    p.round1Status = 'pending';
    p.round2Status = 'pending';
    p.round3Status = 'pending';
  });

  // 3. Reset all images to available
  db.images.forEach((img) => {
    img.status = 'available';
    delete img.usedByParticipantId;
    delete img.usedByParticipantName;
    delete img.usedAt;
  });

  // 4. Reset all topics to available
  db.topics.forEach((t) => {
    t.status = 'available';
    delete t.usedByParticipantId;
    delete t.usedByParticipantName;
    delete t.usedAt;
  });

  // 5. Clear round results
  db.round1Results = [];
  db.round2Results = [];
  db.round3Results = [];

  // 6. Reset global live sync
  const defaultSpeechSec = db.settings.round1.speechTimeSeconds || 120;
  db.liveSync = {
    currentRound: 1,
    activeParticipantId: null,
    timerMode: 'idle',
    timerRemainingSeconds: defaultSpeechSec,
    timerTotalSeconds: defaultSpeechSec,
    isTimerRunning: false,
    timerStartedAt: null,
    timerEndsAt: null,
    wheelSpin: null,
    activeItem: undefined,
    stationStates: db.stations,
  };

  // 7. Synchronously persist to database file immediately so refresh NEVER restores old state
  persistDBSync();

  logAction(
    'Reset All Statuses',
    'Organizer performed complete status reset: all timers, station activities, and item pools cleared.'
  );

  // 8. Realtime broadcast to all connected devices (Master, Stations, Projectors, Mobile)
  broadcastSSE('reset_all_statuses', {
    stations: db.stations,
    participants: db.participants,
    images: db.images,
    topics: db.topics,
    liveSync: db.liveSync,
  });
  broadcastSSE('state_reset', db);
  broadcastSSE('stations_updated', Object.values(db.stations));

  res.json({
    success: true,
    message: 'All event statuses, station activities, timers, and pools successfully reset.',
    db,
  });
});

// Start New Event (Resets rounds, results, images, topics without deleting participants)
app.post('/api/event/start-new', (req: Request, res: Response) => {
  // Reset all stations
  if (!db.stations) db.stations = {};
  (db.settings.stations || []).forEach((s) => {
    db.stations![s.id] = createInitialStationState(s.id, s.name, s.location);
  });

  // Reset participants round statuses
  db.participants.forEach((p) => {
    p.status = 'active';
    p.round1Status = 'pending';
    p.round2Status = 'pending';
    p.round3Status = 'pending';
  });

  // Reset images
  db.images.forEach((img) => {
    img.status = 'available';
    delete img.usedByParticipantId;
    delete img.usedByParticipantName;
    delete img.usedAt;
  });

  // Reset topics
  db.topics.forEach((t) => {
    t.status = 'available';
    delete t.usedByParticipantId;
    delete t.usedByParticipantName;
    delete t.usedAt;
  });

  // Clear results
  db.round1Results = [];
  db.round2Results = [];
  db.round3Results = [];

  // Reset Live Sync
  db.liveSync = {
    currentRound: 1,
    activeParticipantId: db.participants[0]?.id || null,
    timerMode: 'idle',
    timerRemainingSeconds: db.settings.round1.speechTimeSeconds || 120,
    timerTotalSeconds: db.settings.round1.speechTimeSeconds || 120,
    isTimerRunning: false,
    timerStartedAt: null,
    timerEndsAt: null,
    locationId: 'station-a',
    wheelSpin: null,
    activeItem: db.images[0]
      ? {
          type: 'image',
          title: db.images[0].name,
          mediaUrl: db.images[0].url,
          id: db.images[0].id,
        }
      : undefined,
    stationStates: db.stations,
  };

  persistDBSync();
  logAction('Event Reset', 'Organizer started a fresh event. All round progress and item pools reset.');
  broadcastSSE('state_reset', db);
  broadcastSSE('stations_updated', Object.values(db.stations));

  res.json({ success: true, message: 'Fresh event initialized successfully.' });
});

// Participants CRUD
app.get('/api/participants', (req: Request, res: Response) => {
  res.json(db.participants);
});

app.post('/api/participants', (req: Request, res: Response) => {
  const p: Partial<Participant> = req.body;
  if (!p.name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const newId = `p-${Date.now()}`;
  const count = db.participants.length + 1;
  const participantNumber = p.participantNumber || `M2M-${String(count).padStart(3, '0')}`;

  const newParticipant: Participant = {
    id: newId,
    participantNumber,
    name: p.name.trim(),
    college: p.college?.trim() || 'Unknown College',
    department: p.department?.trim() || 'General',
    status: p.status || 'active',
    round1Status: p.round1Status || 'pending',
    round2Status: p.round2Status || 'pending',
    round3Status: p.round3Status || 'pending',
    customData: p.customData || {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.participants.push(newParticipant);
  persistDB();
  logAction('Participant Added', `Added ${newParticipant.name} (${newParticipant.participantNumber}) from ${newParticipant.college}`);
  broadcastSSE('participant_created', newParticipant);
  res.json(newParticipant);
});

app.put('/api/participants/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const idx = db.participants.findIndex((p) => p.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Participant not found' });
  }

  const updated: Participant = {
    ...db.participants[idx],
    ...req.body,
    id: db.participants[idx].id, // protect id
    updatedAt: new Date().toISOString(),
  };

  db.participants[idx] = updated;
  persistDB();
  logAction('Participant Updated', `Updated details for ${updated.name} (${updated.participantNumber})`);
  broadcastSSE('participant_updated', updated);
  res.json(updated);
});

app.delete('/api/participants/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const target = db.participants.find((p) => p.id === id);
  if (!target) {
    return res.status(404).json({ error: 'Participant not found' });
  }

  db.participants = db.participants.filter((p) => p.id !== id);
  persistDB();
  logAction('Participant Deleted', `Deleted participant ${target.name} (${target.participantNumber})`);
  broadcastSSE('participant_deleted', { id });
  res.json({ success: true, id });
});

app.post('/api/participants/batch', (req: Request, res: Response) => {
  const items: Partial<Participant>[] = req.body.participants || [];
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'No participants provided' });
  }

  const created: Participant[] = [];
  let counter = db.participants.length + 1;

  for (const item of items) {
    if (!item.name) continue;
    const p: Participant = {
      id: `p-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      participantNumber: item.participantNumber || `M2M-${String(counter++).padStart(3, '0')}`,
      name: item.name.trim(),
      college: item.college?.trim() || 'General Institution',
      department: item.department?.trim() || 'General',
      status: item.status || 'active',
      round1Status: item.round1Status || 'pending',
      round2Status: item.round2Status || 'pending',
      round3Status: item.round3Status || 'pending',
      customData: item.customData || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.participants.push(p);
    created.push(p);
  }

  persistDB();
  logAction('Batch Participant Import', `Imported ${created.length} participants into the event`);
  broadcastSSE('participants_batch_imported', created);
  res.json({ success: true, count: created.length, participants: created });
});

// Custom Fields
app.get('/api/custom-fields', (req: Request, res: Response) => {
  res.json(db.customFields);
});

app.post('/api/custom-fields', (req: Request, res: Response) => {
  const { name, key, type, options, required } = req.body;
  if (!name || !type) {
    return res.status(400).json({ error: 'Name and type are required' });
  }

  const generatedKey = (key || name.toLowerCase().replace(/[^a-z0-9]/g, '_')).trim();
  const newField: CustomFieldDefinition = {
    id: `f_${Date.now()}`,
    name: name.trim(),
    key: generatedKey,
    type,
    options: options || [],
    required: !!required,
    isSystem: false,
  };

  db.customFields.push(newField);
  persistDB();
  logAction('Custom Field Added', `Added field '${newField.name}' of type '${newField.type}'`);
  res.json(newField);
});

app.put('/api/custom-fields/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const idx = db.customFields.findIndex((f) => f.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Field not found' });

  db.customFields[idx] = {
    ...db.customFields[idx],
    ...req.body,
    id: db.customFields[idx].id,
    isSystem: db.customFields[idx].isSystem,
  };

  persistDB();
  logAction('Custom Field Updated', `Updated field definition for '${db.customFields[idx].name}'`);
  res.json(db.customFields[idx]);
});

app.delete('/api/custom-fields/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const field = db.customFields.find((f) => f.id === id);
  if (!field) return res.status(404).json({ error: 'Field not found' });
  if (field.isSystem) return res.status(400).json({ error: 'Cannot delete protected system field' });

  db.customFields = db.customFields.filter((f) => f.id !== id);
  persistDB();
  logAction('Custom Field Deleted', `Removed custom field '${field.name}'`);
  res.json({ success: true, id });
});

// Topics CRUD
app.get('/api/topics', (req: Request, res: Response) => {
  res.json(db.topics);
});

app.post('/api/topics', (req: Request, res: Response) => {
  const { topic, category } = req.body;
  if (!topic) return res.status(400).json({ error: 'Topic text is required' });

  const newTopic: Topic = {
    id: `top-${Date.now()}`,
    topic: topic.trim(),
    category: category?.trim() || 'General',
    status: 'available',
  };

  db.topics.push(newTopic);
  persistDB();
  logAction('Topic Created', `Added topic: "${newTopic.topic.substring(0, 40)}..."`);
  res.json(newTopic);
});

app.put('/api/topics/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const idx = db.topics.findIndex((t) => t.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Topic not found' });

  db.topics[idx] = {
    ...db.topics[idx],
    ...req.body,
    id: db.topics[idx].id,
  };

  persistDB();
  res.json(db.topics[idx]);
});

app.delete('/api/topics/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  db.topics = db.topics.filter((t) => t.id !== id);
  persistDB();
  res.json({ success: true, id });
});

app.post('/api/topics/batch', (req: Request, res: Response) => {
  const items: { topic: string; category?: string }[] = req.body.topics || [];
  const added: Topic[] = [];

  for (const item of items) {
    if (!item.topic) continue;
    const t: Topic = {
      id: `top-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      topic: item.topic.trim(),
      category: item.category?.trim() || 'General',
      status: 'available',
    };
    db.topics.push(t);
    added.push(t);
  }

  persistDB();
  logAction('Batch Topics Import', `Imported ${added.length} topics into topic repository`);
  res.json({ success: true, count: added.length, topics: added });
});

app.post('/api/topics/reset-status', (req: Request, res: Response) => {
  db.topics.forEach((t) => {
    t.status = 'available';
    delete t.usedByParticipantId;
    delete t.usedByParticipantName;
    delete t.usedAt;
  });
  persistDB();
  logAction('Topics Reset', 'Reset all topics to available status');
  res.json({ success: true, message: 'All topics reset to available' });
});

// Images CRUD
app.get('/api/images', (req: Request, res: Response) => {
  res.json(db.images);
});

app.post('/api/images', (req: Request, res: Response) => {
  const { name, url } = req.body;
  if (!url) return res.status(400).json({ error: 'Image URL is required' });

  const newImg: EventImage = {
    id: `img-${Date.now()}`,
    name: name?.trim() || `Image #${db.images.length + 1}`,
    url: url.trim(),
    status: 'available',
  };

  db.images.push(newImg);
  persistDB();
  logAction('Image Added', `Added image: "${newImg.name}"`);
  res.json(newImg);
});

app.delete('/api/images/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  db.images = db.images.filter((img) => img.id !== id);
  persistDB();
  res.json({ success: true, id });
});

app.post('/api/images/reset-status', (req: Request, res: Response) => {
  db.images.forEach((img) => {
    img.status = 'available';
    delete img.usedByParticipantId;
    delete img.usedByParticipantName;
    delete img.usedAt;
  });
  persistDB();
  logAction('Images Reset', 'Reset all images to available status');
  res.json({ success: true, message: 'All images reset to available' });
});

// Settings API
app.get('/api/settings', (req: Request, res: Response) => {
  res.json(db.settings);
});

app.put('/api/settings', (req: Request, res: Response) => {
  db.settings = {
    ...db.settings,
    ...req.body,
  };
  persistDB();
  logAction('Settings Updated', 'Organizer modified event configuration');
  broadcastSSE('settings_updated', db.settings);
  res.json(db.settings);
});

// History Logs API
app.get('/api/history', (req: Request, res: Response) => {
  res.json(db.history);
});

app.post('/api/history', (req: Request, res: Response) => {
  const { action, details, round, participantId, participantName } = req.body;
  logAction(action, details, round, participantId, participantName);
  res.json({ success: true });
});

app.delete('/api/history', (req: Request, res: Response) => {
  db.history = [];
  persistDB();
  res.json({ success: true, message: 'History cleared' });
});

// Results API
app.get('/api/results', (req: Request, res: Response) => {
  res.json({
    round1: db.round1Results,
    round2: db.round2Results,
    round3: db.round3Results,
  });
});

app.post('/api/results/round1', (req: Request, res: Response) => {
  const result = req.body;
  result.id = `r1-${Date.now()}`;
  db.round1Results.push(result);

  // Update participant status
  const p = db.participants.find((item) => item.id === result.participantId);
  if (p) {
    p.round1Status = result.status;
  }

  // Update image status
  if (!db.settings.round1.allowImageReuse) {
    const img = db.images.find((i) => i.id === result.imageId);
    if (img) {
      img.status = 'used';
      img.usedByParticipantId = result.participantId;
      img.usedByParticipantName = result.participantName;
      img.usedAt = new Date().toISOString();
    }
  }

  persistDB();
  logAction('Round 1 Completed', `Participant ${result.participantName} completed Round 1 speech (${result.speechDurationSeconds}s)`, 'Round 1', result.participantId, result.participantName);
  broadcastSSE('result_added', { round: 1, result });
  res.json(result);
});

app.post('/api/results/round2', (req: Request, res: Response) => {
  const result = req.body;
  result.id = `r2-${Date.now()}`;
  db.round2Results.push(result);

  const p = db.participants.find((item) => item.id === result.participantId);
  if (p) {
    p.round2Status = result.status;
  }

  // Update topic status
  if (!db.settings.round2.topicReuseAllowed) {
    const top = db.topics.find((t) => t.id === result.topicId);
    if (top) {
      top.status = 'used';
      top.usedByParticipantId = result.participantId;
      top.usedByParticipantName = result.participantName;
      top.usedAt = new Date().toISOString();
    }
  }

  persistDB();
  logAction('Round 2 Completed', `Participant ${result.participantName} completed Round 2 on topic "${result.topic}" (${result.speechDurationSeconds}s)`, 'Round 2', result.participantId, result.participantName);
  broadcastSSE('result_added', { round: 2, result });
  res.json(result);
});

app.post('/api/results/round3', (req: Request, res: Response) => {
  const result = req.body;
  result.id = `r3-${Date.now()}`;
  db.round3Results.push(result);

  const p = db.participants.find((item) => item.id === result.participantId);
  if (p) {
    p.round3Status = result.status;
  }

  persistDB();
  logAction('Round 3 Completed', `Participant ${result.participantName} completed Round 3 speech (${result.speechDurationSeconds}s)`, 'Round 3', result.participantId, result.participantName);
  broadcastSSE('result_added', { round: 3, result });
  res.json(result);
});

// START SERVER WITH VITE INTEGRATION
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Mind to Mic server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
