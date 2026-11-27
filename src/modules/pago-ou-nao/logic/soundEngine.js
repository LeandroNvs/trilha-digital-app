// ============================================================================
// MOTOR DE ÁUDIO DINÂMICO (Web Audio API — Zero arquivos externos!)
// Trilha Sonora Dinâmica ("Estado COM Recursos" / "SEM Recursos" / "Votação")
// + Efeitos Sonoros de Mensagem, Dado, Pulo de Peão, Alerta e Vitória
// ============================================================================

class PagoOuNaoSoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;

    this.muted = false;
    this.musicEnabled = false;
    this.mood = 'calm'; // 'calm' | 'tense' | 'vote'

    this.stepIndex = 0;
    this.schedulerTimer = null;
  }

  ensureContext() {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 1;
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.14;
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.35;
      this.sfxGain.connect(this.masterGain);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  unlock() {
    const ctx = this.ensureContext();
    if (ctx && this.musicEnabled && !this.muted && !this.schedulerTimer) {
      this.startLoop();
    }
  }

  setConfig({ muted, musicEnabled, mood }) {
    if (typeof muted === 'boolean') {
      this.muted = muted;
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.05);
      }
    }
    if (typeof mood === 'string' && mood !== this.mood) {
      this.mood = mood;
      this.stepIndex = 0;
    }
    if (typeof musicEnabled === 'boolean') {
      this.musicEnabled = musicEnabled;
    }

    if (this.musicEnabled && !this.muted) {
      if (!this.schedulerTimer) {
        this.startLoop();
      }
    } else {
      this.stopLoop();
    }
  }

  startLoop() {
    if (this.schedulerTimer) return;
    const tick = () => {
      if (!this.musicEnabled || this.muted) {
        this.stopLoop();
        return;
      }
      if (this.ctx && this.ctx.state === 'running') {
        this.playNextMusicStep();
      }
      const intervalMs = this.mood === 'vote' ? 280 : this.mood === 'tense' ? 420 : 340;
      this.schedulerTimer = setTimeout(tick, intervalMs);
    };
    this.schedulerTimer = setTimeout(tick, 120);
  }

  stopLoop() {
    if (this.schedulerTimer) {
      clearTimeout(this.schedulerTimer);
      this.schedulerTimer = null;
    }
  }

  playTone({
    freq,
    duration = 0.25,
    type = 'sine',
    volume = 0.15,
    targetGain = 'music',
    delay = 0,
    slideToFreq = null
  }) {
    if (this.muted) return;
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideToFreq) {
      osc.frequency.exponentialRampToValueAtTime(slideToFreq, now + duration);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(targetGain === 'sfx' ? this.sfxGain : this.musicGain);

    osc.start(now);
    osc.stop(now + duration + 0.03);
  }

  // Sequenciador leve com 3 climas musicais (COM Recursos, SEM Recursos, Votação)
  playNextMusicStep() {
    const step = this.stepIndex % 16;
    this.stepIndex += 1;

    if (this.mood === 'calm') {
      // Clima alegre e estratégico de tabuleiro (Cmaj7 -> Fmaj7 -> Am7 -> G6)
      const chords = [
        [261.63, 329.63, 392.0, 493.88], // Cmaj7
        [349.23, 440.0, 523.25, 659.25], // Fmaj7
        [220.0, 261.63, 329.63, 392.0], // Am7
        [196.0, 246.94, 293.66, 329.63] // G6
      ];
      const bar = Math.floor(step / 4);
      const beat = step % 4;
      const chord = chords[bar];

      if (beat === 0) {
        // Baixo macio + nota base
        this.playTone({ freq: chord[0] / 2, duration: 0.9, type: 'sine', volume: 0.22 });
        this.playTone({ freq: chord[1], duration: 0.6, type: 'triangle', volume: 0.09 });
      }
      // Arpejo leve estilo marimba/piano elétrico
      const melodyIdx = [0, 2, 3, 2][beat];
      this.playTone({
        freq: chord[melodyIdx],
        duration: 0.35,
        type: 'sine',
        volume: beat === 0 ? 0.14 : 0.1
      });
    } else if (this.mood === 'tense') {
      // Clima nublado / sonegação (Am -> Dm -> F -> E7sus4)
      const chords = [
        [220.0, 261.63, 329.63], // Am
        [293.66, 349.23, 440.0], // Dm
        [174.61, 220.0, 261.63], // F
        [164.81, 220.0, 246.94] // E7sus4
      ];
      const bar = Math.floor(step / 4);
      const beat = step % 4;
      const chord = chords[bar];

      if (beat === 0) {
        this.playTone({ freq: chord[0] / 2, duration: 1.0, type: 'triangle', volume: 0.22 });
      }
      if (beat === 0 || beat === 2) {
        this.playTone({ freq: chord[beat === 0 ? 1 : 2], duration: 0.5, type: 'sine', volume: 0.11 });
      }
    } else if (this.mood === 'vote') {
      // Clima de decisão "Pago ou Não?" (pulso suave de suspense)
      const bassNotes = [220.0, 220.0, 246.94, 196.0];
      const bar = Math.floor(step / 4);
      const beat = step % 4;

      if (beat % 2 === 0) {
        this.playTone({
          freq: bassNotes[bar] / 2,
          duration: 0.26,
          type: 'triangle',
          volume: 0.18
        });
      }
      if (beat === 1 || beat === 3) {
        this.playTone({
          freq: bassNotes[bar] * 2,
          duration: 0.18,
          type: 'sine',
          volume: 0.08
        });
      }
    }
  }

  // ==========================================================================
  // EFEITOS SONOROS (SFX)
  // ==========================================================================

  // 1. Som cristalino de Mensagem / Aviso no Telão ou Celular
  playMessageSfx() {
    if (this.muted) return;
    if (!this.ensureContext()) return;
    this.playTone({ freq: 587.33, duration: 0.16, type: 'sine', volume: 0.24, targetGain: 'sfx', delay: 0 }); // D5
    this.playTone({ freq: 880.0, duration: 0.34, type: 'sine', volume: 0.26, targetGain: 'sfx', delay: 0.09 }); // A5
  }

  // 2. Som tátil de dado rolando
  playDiceRollSfx() {
    if (this.muted) return;
    if (!this.ensureContext()) return;
    const freqs = [260, 340, 290, 410, 320];
    freqs.forEach((f, idx) => {
      this.playTone({
        freq: f,
        duration: 0.06,
        type: 'triangle',
        volume: 0.14,
        targetGain: 'sfx',
        delay: idx * 0.09
      });
    });
  }

  // 3. "Toc" suave de peão pulando casa a casa
  playPawnHopSfx() {
    if (this.muted) return;
    if (!this.ctx || this.ctx.state !== 'running') return;
    this.playTone({
      freq: 360,
      slideToFreq: 520,
      duration: 0.09,
      type: 'sine',
      volume: 0.16,
      targetGain: 'sfx'
    });
  }

  // 4. Alerta discreto para Carta Vermelha / Sonegação
  playAlertSfx() {
    if (this.muted) return;
    if (!this.ensureContext()) return;
    this.playTone({ freq: 246.94, duration: 0.2, type: 'sawtooth', volume: 0.12, targetGain: 'sfx', delay: 0 });
    this.playTone({ freq: 196.0, duration: 0.32, type: 'sawtooth', volume: 0.12, targetGain: 'sfx', delay: 0.16 });
  }

  // 5. Fanfarra de chegada / vitória
  playVictorySfx() {
    if (this.muted) return;
    if (!this.ensureContext()) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      this.playTone({
        freq,
        duration: idx === 3 ? 0.55 : 0.18,
        type: 'triangle',
        volume: 0.26,
        targetGain: 'sfx',
        delay: idx * 0.11
      });
    });
  }

  // 6. Catraca da Roleta da Loteria girando e desacelerando (~3.7s)
  playWheelSpinSfx() {
    if (this.muted) return;
    if (!this.ensureContext()) return;
    let elapsed = 0;
    const totalTicks = 28;
    for (let i = 0; i < totalTicks; i++) {
      const progress = i / totalTicks;
      const stepDelay = 0.045 + Math.pow(progress, 2.3) * 0.34;
      elapsed += stepDelay;
      if (elapsed > 3.75) break;
      const freq = 520 + (i % 2) * 140 - progress * 110;
      this.playTone({
        freq,
        duration: 0.035,
        type: 'triangle',
        volume: 0.16,
        targetGain: 'sfx',
        delay: elapsed
      });
    }
  }

  // 7. Som de "Que pena ($0)" na Loteria
  playLotteryZeroSfx() {
    if (this.muted) return;
    if (!this.ensureContext()) return;
    this.playTone({ freq: 329.63, slideToFreq: 277.18, duration: 0.24, type: 'sawtooth', volume: 0.13, targetGain: 'sfx', delay: 0 });
    this.playTone({ freq: 261.63, slideToFreq: 196.0, duration: 0.42, type: 'sawtooth', volume: 0.14, targetGain: 'sfx', delay: 0.22 });
  }
}

export const soundEngine = new PagoOuNaoSoundEngine();
