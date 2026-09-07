// Web Audio API Synthesizer for Mind to Mic
// Zero-dependency sound engine that works reliably across all browsers without missing asset errors

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isUnlocked: boolean = false;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public unlock(): boolean {
    try {
      this.initContext();
      if (this.ctx) {
        // Play silent buffer to unlock on iOS / mobile Safari
        const buffer = this.ctx.createBuffer(1, 1, 22050);
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(this.ctx.destination);
        source.start(0);
        this.isUnlocked = true;
        return true;
      }
    } catch (e) {
      console.warn('Audio unlock warning:', e);
    }
    return false;
  }

  public getUnlocked(): boolean {
    return this.isUnlocked;
  }

  public playAudioFile(audioUrl: string, volumePercent: number = 90) {
    this.initContext();
    const volume = Math.max(0, Math.min(1, volumePercent / 100));
    try {
      const audio = new Audio(audioUrl);
      audio.volume = volume;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Audio playback error:', err);
          if (this.ctx) {
            this.playAirHorn(this.ctx.currentTime, volume);
          }
        });
      }
    } catch (err) {
      console.warn('Error playing audio file:', err);
    }
  }

  public playBuzzer(
    sound: 'horn' | 'digital' | 'alarm' | 'siren' | 'custom' = 'horn',
    volumePercent: number = 90,
    customAudioUrl?: string
  ) {
    this.initContext();
    const volume = Math.max(0, Math.min(1, volumePercent / 100));

    if (sound === 'custom' && customAudioUrl) {
      try {
        const audio = new Audio(customAudioUrl);
        audio.volume = volume;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn('Custom audio playback blocked or failed, falling back to air horn:', err);
            if (this.ctx) {
              this.playAirHorn(this.ctx.currentTime, volume);
            }
          });
        }
        return;
      } catch (err) {
        console.warn('Error loading custom audio, falling back:', err);
      }
    }

    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    switch (sound) {
      case 'horn':
        this.playAirHorn(now, volume);
        break;
      case 'digital':
        this.playDigitalKlaxon(now, volume);
        break;
      case 'alarm':
        this.playUrgentAlarm(now, volume);
        break;
      case 'siren':
        this.playDeepSiren(now, volume);
        break;
      default:
        this.playAirHorn(now, volume);
    }
  }

  private playAirHorn(start: number, vol: number) {
    if (!this.ctx) return;
    const duration = 1.4;

    // Dual detuned saw oscillators for intense buzzer roar
    const freqs = [150, 188, 225];
    freqs.forEach((freq) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, start);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.95, start + duration);

      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(vol * 0.35, start + 0.04);
      gain.gain.setValueAtTime(vol * 0.35, start + duration - 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(start);
      osc.stop(start + duration);
    });
  }

  private playDigitalKlaxon(start: number, vol: number) {
    if (!this.ctx) return;
    const duration = 1.2;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(800, start);
    osc.frequency.setValueAtTime(400, start + 0.3);
    osc.frequency.setValueAtTime(800, start + 0.6);
    osc.frequency.setValueAtTime(400, start + 0.9);

    gain.gain.setValueAtTime(vol * 0.4, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(start);
    osc.stop(start + duration);
  }

  private playUrgentAlarm(start: number, vol: number) {
    if (!this.ctx) return;
    for (let i = 0; i < 4; i++) {
      const beepStart = start + i * 0.25;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1050, beepStart);

      gain.gain.setValueAtTime(0, beepStart);
      gain.gain.linearRampToValueAtTime(vol * 0.5, beepStart + 0.02);
      gain.gain.linearRampToValueAtTime(0.001, beepStart + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(beepStart);
      osc.stop(beepStart + 0.2);
    }
  }

  private playDeepSiren(start: number, vol: number) {
    if (!this.ctx) return;
    const duration = 1.5;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(260, start);
    osc.frequency.linearRampToValueAtTime(520, start + duration * 0.5);
    osc.frequency.linearRampToValueAtTime(200, start + duration);

    gain.gain.setValueAtTime(vol * 0.4, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(start);
    osc.stop(start + duration);
  }

  // Pleasant chime when Preparation timer ends and speech begins
  public playPrepEndChime(volumePercent: number = 80) {
    this.initContext();
    if (!this.ctx) return;

    const vol = Math.max(0, Math.min(1, volumePercent / 100));
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 arpeggio

    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const noteStart = now + idx * 0.09;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteStart);

      gain.gain.setValueAtTime(0, noteStart);
      gain.gain.linearRampToValueAtTime(vol * 0.35, noteStart + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.8);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(noteStart);
      osc.stop(noteStart + 0.85);
    });
  }

  // Subtle warning tick (e.g., at 10s remaining)
  public playWarningTick(volumePercent: number = 60) {
    this.initContext();
    if (!this.ctx) return;

    const vol = Math.max(0, Math.min(1, volumePercent / 100));
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, now);

    gain.gain.setValueAtTime(vol * 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.13);
  }

  // Fast mechanical tick for spinning wheel
  public playTick(volumePercent: number = 40) {
    this.initContext();
    if (!this.ctx) return;

    const vol = Math.max(0, Math.min(1, volumePercent / 100));
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.03);

    gain.gain.setValueAtTime(vol * 0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.035);
  }

  // Celebration chime when wheel stops on winning topic
  public playChime(volumePercent: number = 80) {
    this.playPrepEndChime(volumePercent);
  }
}

export const soundEngine = new SoundEngine();
