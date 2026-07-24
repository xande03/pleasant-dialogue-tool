// Web Audio graph per track: source -> lowEQ -> midEQ -> highEQ -> pan -> dryGain + reverb(wetGain) -> masterGain -> destination

export type AutomationPoint = { t: number; v: number };
export type AutomationLane = { enabled: boolean; points: AutomationPoint[] };

export interface TrackEffects {
  volume: number; // 0-100
  muted: boolean;
  solo: boolean;
  pan: number; // -1 to 1
  low: number; // -12 to 12 dB
  mid: number;
  high: number;
  reverb: number; // 0-100 (wet %)
  automation: {
    volume: AutomationLane; // v in 0-100
    pan: AutomationLane; // v in -1..1
  };
}

export const defaultEffects = (): TrackEffects => ({
  volume: 80,
  muted: false,
  solo: false,
  pan: 0,
  low: 0,
  mid: 0,
  high: 0,
  reverb: 0,
  automation: {
    volume: { enabled: false, points: [] },
    pan: { enabled: false, points: [] },
  },
});

export function valueAt(lane: AutomationLane, t: number, fallback: number): number {
  if (!lane.enabled || lane.points.length === 0) return fallback;
  const pts = [...lane.points].sort((a, b) => a.t - b.t);
  if (t <= pts[0].t) return pts[0].v;
  if (t >= pts[pts.length - 1].t) return pts[pts.length - 1].v;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (t >= a.t && t <= b.t) {
      const r = (t - a.t) / (b.t - a.t || 1);
      return a.v + (b.v - a.v) * r;
    }
  }
  return fallback;
}

export interface MasterSettings {
  gain: number; // 0-200 (%). 100 = unity.
  limiterEnabled: boolean;
  limiterThreshold: number; // dB, -24 to 0
}

export const defaultMaster = (): MasterSettings => ({
  gain: 100,
  limiterEnabled: true,
  limiterThreshold: -1,
});

export interface TrackNode {
  audio: HTMLAudioElement;
  source: MediaElementAudioSourceNode;
  lowEQ: BiquadFilterNode;
  midEQ: BiquadFilterNode;
  highEQ: BiquadFilterNode;
  panner: StereoPannerNode;
  dryGain: GainNode;
  wetGain: GainNode;
  masterGain: GainNode;
}

export class AudioEngine {
  ctx: AudioContext;
  reverb: ConvolverNode;
  masterBus: GainNode;
  limiter: DynamicsCompressorNode;
  private limiterEnabled: boolean;
  tracks: Map<string, TrackNode> = new Map();

  constructor() {
    this.ctx = new AudioContext();
    this.reverb = this.ctx.createConvolver();
    this.reverb.buffer = this.createImpulseResponse(2.5, 2.0);

    // Master chain: tracks -> masterBus -> [limiter] -> destination
    this.masterBus = this.ctx.createGain();
    this.masterBus.gain.value = 1;

    this.limiter = this.ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -1;
    this.limiter.knee.value = 0;
    this.limiter.ratio.value = 20;
    this.limiter.attack.value = 0.003;
    this.limiter.release.value = 0.25;

    this.limiterEnabled = true;
    this.masterBus.connect(this.limiter);
    this.limiter.connect(this.ctx.destination);
  }

  private createImpulseResponse(duration: number, decay: number): AudioBuffer {
    const rate = this.ctx.sampleRate;
    const length = rate * duration;
    const impulse = this.ctx.createBuffer(2, length, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    return impulse;
  }

  addTrack(id: string, url: string): HTMLAudioElement {
    const audio = new Audio(url);
    audio.crossOrigin = "anonymous";

    const source = this.ctx.createMediaElementSource(audio);
    const lowEQ = this.ctx.createBiquadFilter();
    lowEQ.type = "lowshelf";
    lowEQ.frequency.value = 200;
    const midEQ = this.ctx.createBiquadFilter();
    midEQ.type = "peaking";
    midEQ.frequency.value = 1000;
    midEQ.Q.value = 0.8;
    const highEQ = this.ctx.createBiquadFilter();
    highEQ.type = "highshelf";
    highEQ.frequency.value = 4000;

    const panner = this.ctx.createStereoPanner();
    const dryGain = this.ctx.createGain();
    const wetGain = this.ctx.createGain();
    wetGain.gain.value = 0;
    const masterGain = this.ctx.createGain();

    source.connect(lowEQ);
    lowEQ.connect(midEQ);
    midEQ.connect(highEQ);
    highEQ.connect(panner);
    panner.connect(dryGain);
    panner.connect(this.reverb);
    dryGain.connect(masterGain);
    this.reverb.connect(wetGain);
    wetGain.connect(masterGain);
    masterGain.connect(this.masterBus);

    const node: TrackNode = {
      audio, source, lowEQ, midEQ, highEQ, panner, dryGain, wetGain, masterGain,
    };
    this.tracks.set(id, node);
    return audio;
  }

  // Static effects only (EQ + reverb). Volume/pan handled separately.
  applyStaticEffects(id: string, fx: TrackEffects) {
    const node = this.tracks.get(id);
    if (!node) return;
    node.lowEQ.gain.value = fx.low;
    node.midEQ.gain.value = fx.mid;
    node.highEQ.gain.value = fx.high;
    node.dryGain.gain.value = 1 - fx.reverb / 100;
    node.wetGain.gain.value = fx.reverb / 100;
  }

  // Sets volume+pan, either static or schedules automation from playbackTime forward.
  applyVolumePan(
    id: string,
    fx: TrackEffects,
    anySolo: boolean,
    playbackTime: number,
    isPlaying: boolean
  ) {
    const node = this.tracks.get(id);
    if (!node) return;
    const now = this.ctx.currentTime;
    const audible = anySolo ? fx.solo : !fx.muted;
    const muteGain = audible ? 1 : 0;

    // ---- Volume ----
    const volParam = node.masterGain.gain;
    volParam.cancelScheduledValues(now);
    const volAuto = fx.automation.volume;
    if (volAuto.enabled && volAuto.points.length > 0) {
      const startVal = (valueAt(volAuto, playbackTime, fx.volume) / 100) * muteGain;
      volParam.setValueAtTime(startVal, now);
      if (isPlaying) {
        const sorted = [...volAuto.points].sort((a, b) => a.t - b.t);
        sorted.forEach((p) => {
          if (p.t > playbackTime) {
            const when = now + (p.t - playbackTime);
            volParam.linearRampToValueAtTime((p.v / 100) * muteGain, when);
          }
        });
      }
    } else {
      volParam.setValueAtTime((fx.volume / 100) * muteGain, now);
    }

    // ---- Pan ----
    const panParam = node.panner.pan;
    panParam.cancelScheduledValues(now);
    const panAuto = fx.automation.pan;
    const clamp = (v: number) => Math.max(-1, Math.min(1, v));
    if (panAuto.enabled && panAuto.points.length > 0) {
      panParam.setValueAtTime(clamp(valueAt(panAuto, playbackTime, fx.pan)), now);
      if (isPlaying) {
        const sorted = [...panAuto.points].sort((a, b) => a.t - b.t);
        sorted.forEach((p) => {
          if (p.t > playbackTime) {
            const when = now + (p.t - playbackTime);
            panParam.linearRampToValueAtTime(clamp(p.v), when);
          }
        });
      }
    } else {
      panParam.setValueAtTime(clamp(fx.pan), now);
    }
  }

  applyMaster(settings: MasterSettings) {
    const now = this.ctx.currentTime;
    this.masterBus.gain.cancelScheduledValues(now);
    this.masterBus.gain.setValueAtTime(Math.max(0, settings.gain / 100), now);
    this.limiter.threshold.setValueAtTime(
      Math.max(-24, Math.min(0, settings.limiterThreshold)),
      now
    );
    if (settings.limiterEnabled !== this.limiterEnabled) {
      try {
        this.masterBus.disconnect();
        this.limiter.disconnect();
      } catch {}
      if (settings.limiterEnabled) {
        this.masterBus.connect(this.limiter);
        this.limiter.connect(this.ctx.destination);
      } else {
        this.masterBus.connect(this.ctx.destination);
      }
      this.limiterEnabled = settings.limiterEnabled;
    }
  }

  async resume() {
    if (this.ctx.state === "suspended") await this.ctx.resume();
  }

  dispose() {
    this.tracks.forEach((n) => {
      n.audio.pause();
      n.audio.src = "";
      try {
        n.source.disconnect();
        n.masterGain.disconnect();
      } catch {}
    });
    this.tracks.clear();
    this.ctx.close();
  }
}
