// Offline render of the full mix (all tracks + effects + automation) into a single WAV file.

import type { TrackEffects, AutomationLane, MasterSettings } from "./audio-engine";
import { defaultMaster } from "./audio-engine";

export interface ExportTrack {
  id: string;
  url: string;
  fx: TrackEffects;
}

export interface RenderOptions {
  master?: MasterSettings;
  // When true, master gain is ignored during render and computed to bring peak to `normalizeTargetDb`.
  normalize?: boolean;
  normalizeTargetDb?: number; // default -1 dBFS
}

function makeImpulseResponse(ctx: OfflineAudioContext, duration = 2.5, decay = 2.0): AudioBuffer {
  const rate = ctx.sampleRate;
  const length = Math.floor(rate * duration);
  const impulse = ctx.createBuffer(2, length, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return impulse;
}

function scheduleAutomation(
  param: AudioParam,
  lane: AutomationLane,
  fallback: number,
  transform: (v: number) => number,
  duration: number
) {
  if (!lane.enabled || lane.points.length === 0) {
    param.setValueAtTime(transform(fallback), 0);
    return;
  }
  const pts = [...lane.points].sort((a, b) => a.t - b.t);
  // Anchor start
  param.setValueAtTime(transform(pts[0].v), 0);
  pts.forEach((p) => {
    const when = Math.max(0, Math.min(duration, p.t));
    param.linearRampToValueAtTime(transform(p.v), when);
  });
}

async function fetchDecoded(ctx: BaseAudioContext, url: string): Promise<AudioBuffer> {
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  return await ctx.decodeAudioData(buf.slice(0));
}

export async function renderMix(
  tracks: ExportTrack[],
  onProgress?: (pct: number) => void,
  options: RenderOptions = {}
): Promise<AudioBuffer> {
  if (tracks.length === 0) throw new Error("No tracks to export");
  const master = options.master ?? defaultMaster();

  const tmp = new AudioContext();
  onProgress?.(5);
  const decoded = await Promise.all(
    tracks.map(async (t) => ({ ...t, buffer: await fetchDecoded(tmp, t.url) }))
  );
  await tmp.close();
  onProgress?.(25);

  const sampleRate = decoded[0].buffer.sampleRate;
  const duration = decoded.reduce((m, d) => Math.max(m, d.buffer.duration), 0);
  const anySolo = tracks.some((t) => t.fx.solo);

  const build = (masterGainValue: number, applyLimiter: boolean) => {
    const offline = new OfflineAudioContext(2, Math.ceil(duration * sampleRate), sampleRate);
    const reverb = offline.createConvolver();
    reverb.buffer = makeImpulseResponse(offline);

    const masterBus = offline.createGain();
    masterBus.gain.value = Math.max(0, masterGainValue);

    let outNode: AudioNode = masterBus;
    if (applyLimiter) {
      const limiter = offline.createDynamicsCompressor();
      limiter.threshold.value = Math.max(-24, Math.min(0, master.limiterThreshold));
      limiter.knee.value = 0;
      limiter.ratio.value = 20;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.25;
      masterBus.connect(limiter);
      outNode = limiter;
    }
    outNode.connect(offline.destination);

    for (const t of decoded) {
      const audible = anySolo ? t.fx.solo : !t.fx.muted;
      if (!audible) continue;

      const src = offline.createBufferSource();
      src.buffer = t.buffer;

      const low = offline.createBiquadFilter();
      low.type = "lowshelf";
      low.frequency.value = 200;
      low.gain.value = t.fx.low;

      const mid = offline.createBiquadFilter();
      mid.type = "peaking";
      mid.frequency.value = 1000;
      mid.Q.value = 0.8;
      mid.gain.value = t.fx.mid;

      const high = offline.createBiquadFilter();
      high.type = "highshelf";
      high.frequency.value = 4000;
      high.gain.value = t.fx.high;

      const panner = offline.createStereoPanner();
      scheduleAutomation(
        panner.pan,
        t.fx.automation.pan,
        t.fx.pan,
        (v) => Math.max(-1, Math.min(1, v)),
        duration
      );

      const dry = offline.createGain();
      dry.gain.value = 1 - t.fx.reverb / 100;
      const wet = offline.createGain();
      wet.gain.value = t.fx.reverb / 100;

      const trackMaster = offline.createGain();
      scheduleAutomation(
        trackMaster.gain,
        t.fx.automation.volume,
        t.fx.volume,
        (v) => v / 100,
        duration
      );

      src.connect(low);
      low.connect(mid);
      mid.connect(high);
      high.connect(panner);
      panner.connect(dry);
      panner.connect(reverb);
      dry.connect(trackMaster);
      reverb.connect(wet);
      wet.connect(trackMaster);
      trackMaster.connect(masterBus);

      src.start(0);
    }

    return offline.startRendering();
  };

  let masterGainValue = master.gain / 100;
  if (options.normalize) {
    onProgress?.(35);
    const probe = await build(1, false);
    const peak = bufferPeak(probe);
    const targetDb = options.normalizeTargetDb ?? -1;
    const targetLin = Math.pow(10, targetDb / 20);
    masterGainValue = peak > 1e-6 ? Math.min(4, targetLin / peak) : 1;
    onProgress?.(65);
  }

  onProgress?.(75);
  const rendered = await build(masterGainValue, master.limiterEnabled);
  onProgress?.(95);
  return rendered;
}

export function bufferPeak(buffer: AudioBuffer): number {
  let peak = 0;
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < data.length; i++) {
      const a = Math.abs(data[i]);
      if (a > peak) peak = a;
    }
  }
  return peak;
}

// Compute peak (linear 0..1) of the mix with unity master and no limiter.
export async function computeMixPeak(tracks: ExportTrack[]): Promise<number> {
  const buf = await renderMix(tracks, undefined, {
    master: { gain: 100, limiterEnabled: false, limiterThreshold: 0 },
  });
  return bufferPeak(buf);
}

// PCM 16-bit WAV encoder
export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numCh = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const numFrames = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = numCh * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numFrames * blockAlign;
  const bufferSize = 44 + dataSize;

  const ab = new ArrayBuffer(bufferSize);
  const view = new DataView(ab);
  let offset = 0;

  const writeStr = (s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset++, s.charCodeAt(i));
  };
  const writeU32 = (v: number) => {
    view.setUint32(offset, v, true);
    offset += 4;
  };
  const writeU16 = (v: number) => {
    view.setUint16(offset, v, true);
    offset += 2;
  };

  // RIFF header
  writeStr("RIFF");
  writeU32(bufferSize - 8);
  writeStr("WAVE");
  // fmt chunk
  writeStr("fmt ");
  writeU32(16);
  writeU16(1); // PCM
  writeU16(numCh);
  writeU32(sampleRate);
  writeU32(byteRate);
  writeU16(blockAlign);
  writeU16(bytesPerSample * 8);
  // data chunk
  writeStr("data");
  writeU32(dataSize);

  // Interleave channels
  const channels: Float32Array[] = [];
  for (let ch = 0; ch < numCh; ch++) channels.push(buffer.getChannelData(ch));

  for (let i = 0; i < numFrames; i++) {
    for (let ch = 0; ch < numCh; ch++) {
      let s = channels[ch][i];
      s = Math.max(-1, Math.min(1, s));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([ab], { type: "audio/wav" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
