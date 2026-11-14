import type { Clock } from "../../ports";

export const systemClock: Clock = { now: () => new Date() };

/** Controllable clock for tests and scripts. */
export class FixedClock implements Clock {
  constructor(private current: Date) {}

  now(): Date {
    return new Date(this.current.getTime());
  }

  set(d: Date): void {
    this.current = new Date(d.getTime());
  }

  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}
