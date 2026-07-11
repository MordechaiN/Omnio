export interface HealthPayload {
  status: "ok";
  service: "omnio-worker";
  uptimeSec: number;
}

export function healthPayload(uptimeSec: number): HealthPayload {
  if (!Number.isFinite(uptimeSec) || uptimeSec < 0) {
    throw new RangeError(`uptimeSec must be a non-negative finite number, got ${uptimeSec}`);
  }
  return { status: "ok", service: "omnio-worker", uptimeSec };
}
