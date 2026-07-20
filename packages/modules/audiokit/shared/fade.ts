/**
 * Fade envelope math — pure, testable. Applies a linear or equal-power
 * (sine-based) ramp over the fade window at each end of the buffer.
 */
export type FadeCurve = "linear" | "equalPower";

function envelopeAt(position: number, curve: FadeCurve): number {
  // position in [0, 1]: 0 = silent, 1 = full volume.
  return curve === "linear" ? position : Math.sin((position * Math.PI) / 2);
}

export function applyFade(
  samples: Float32Array,
  sampleRate: number,
  fadeInSeconds: number,
  fadeOutSeconds: number,
  curve: FadeCurve,
): Float32Array {
  const out = new Float32Array(samples.length);
  const fadeInSamples = Math.min(samples.length, Math.round(fadeInSeconds * sampleRate));
  const fadeOutSamples = Math.min(samples.length, Math.round(fadeOutSeconds * sampleRate));
  const fadeOutStart = samples.length - fadeOutSamples;

  for (let i = 0; i < samples.length; i += 1) {
    let gain = 1;
    if (i < fadeInSamples && fadeInSamples > 0) {
      gain = Math.min(gain, envelopeAt(i / fadeInSamples, curve));
    }
    if (i >= fadeOutStart && fadeOutSamples > 0) {
      gain = Math.min(gain, envelopeAt((samples.length - 1 - i) / fadeOutSamples, curve));
    }
    out[i] = samples[i]! * gain;
  }
  return out;
}
