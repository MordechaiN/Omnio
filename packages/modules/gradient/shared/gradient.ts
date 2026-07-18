/**
 * CSS gradient builder — on-device, pure string assembly.
 *
 * Produces a valid `linear-gradient()` / `radial-gradient()` value from an
 * ordered list of color stops. Stop positions are optional; when present they
 * are clamped to 0–100%. Output is a ready-to-paste `background` value.
 */

export type GradientType = "linear" | "radial";

export interface ColorStop {
  color: string;
  /** Percentage 0–100, or undefined to let CSS distribute evenly. */
  position?: number;
}

export function buildGradient(type: GradientType, angle: number, stops: ColorStop[]): string {
  const parts = stops.map((stop) => {
    const pos = stop.position;
    if (pos === undefined || Number.isNaN(pos)) return stop.color;
    const clamped = Math.min(100, Math.max(0, pos));
    return `${stop.color} ${clamped}%`;
  });
  if (type === "radial") {
    return `radial-gradient(circle, ${parts.join(", ")})`;
  }
  const deg = ((angle % 360) + 360) % 360;
  return `linear-gradient(${deg}deg, ${parts.join(", ")})`;
}

export function gradientCss(value: string): string {
  return `background: ${value};`;
}
