// Web Audio graph per track: source -> lowEQ -> midEQ -> highEQ -> pan -> dryGain + reverb(wetGain) -> masterGain -> destination

export interface TrackEffects {
  volume: number; // 0-100
  muted: boolean;
  solo: boolean;
  pan: number; // -1 to 1
  low: number; // -12 to 12 dB
  mid: number;
  high: number;
  reverb: number; // 0-100 (wet %)
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
  destination: AudioNode;
  tracks: Map<string, TrackNode> = new Map();

  constructor() {
    this.ctx = new AudioContext();
    this.reverb = this.ctx.createConvolver();
    this.reverb.buffer = this.createImpulseResponse(2.5, 2.0);
    this.destination = this.ctx.destination;
  }

  // Simple synthetic reverb impulse (decay in seconds, intensity)
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

    // Wire graph
    source.connect(lowEQ);
    lowEQ.connect(midEQ);
    midEQ.connect(highEQ);
    highEQ.connect(panner);
    panner.connect(dryGain);
    panner.connect(this.reverb);
    dryGain.connect(masterGain);
    // Reverb send has its own wet gain
    this.reverb.connect(wetGain);
    wetGain.connect(masterGain);
    masterGain.connect(this.destination);

    const node: TrackNode = {
      audio,
      source,
      lowEQ,
      midEQ,
      highEQ,
      panner,
      dryGain,
      wetGain,
      masterGain,
    };
    this.tracks.set(id, node);
    return audio;
  }

  applyEffects(id: string, fx: TrackEffects, anySolo: boolean) {
    const node = this.tracks.get(id);
    if (!node) return;
    const audible = anySolo ? fx.solo : !fx.muted;
    node.masterGain.gain.value = audible ? fx.volume / 100 : 0;
    node.panner.pan.value = Math.max(-1, Math.min(1, fx.pan));
    node.lowEQ.gain.value = fx.low;
    node.midEQ.gain.value = fx.mid;
    node.highEQ.gain.value = fx.high;
    node.dryGain.gain.value = 1 - fx.reverb / 100;
    node.wetGain.gain.value = fx.reverb / 100;
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
