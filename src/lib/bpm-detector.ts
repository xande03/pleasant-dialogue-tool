import { analyze } from "web-audio-beat-detector";

export async function detectBPM(url: string): Promise<number | null> {
  try {
    const res = await fetch(url);
    const arrayBuffer = await res.arrayBuffer();
    const ctx = new OfflineAudioContext(2, 44100 * 40, 44100);
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    const bpm = await analyze(audioBuffer);
    return Math.round(bpm);
  } catch (e) {
    console.warn("BPM detection failed", e);
    return null;
  }
}
