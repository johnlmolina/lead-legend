import { describe, expect, it } from "vitest";
import { validateAppointmentTime } from "@/lib/appointment-validation";

const NOW = new Date("2026-06-15T12:00:00Z");

describe("validateAppointmentTime", () => {
  it("accepts a future time and computes the correct end time", () => {
    const result = validateAppointmentTime("2026-06-16T09:00:00Z", 60, NOW);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.start.toISOString()).toBe("2026-06-16T09:00:00.000Z");
      expect(result.end.toISOString()).toBe("2026-06-16T10:00:00.000Z");
    }
  });

  it("rejects a time in the past", () => {
    const result = validateAppointmentTime("2026-06-14T09:00:00Z", 60, NOW);
    expect(result.valid).toBe(false);
  });

  it("rejects an unparseable date string", () => {
    const result = validateAppointmentTime("not-a-date", 60, NOW);
    expect(result.valid).toBe(false);
  });

  it("rejects a zero or negative duration", () => {
    expect(validateAppointmentTime("2026-06-16T09:00:00Z", 0, NOW).valid).toBe(false);
    expect(validateAppointmentTime("2026-06-16T09:00:00Z", -30, NOW).valid).toBe(false);
  });

  it("respects a custom duration", () => {
    const result = validateAppointmentTime("2026-06-16T09:00:00Z", 30, NOW);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.end.toISOString()).toBe("2026-06-16T09:30:00.000Z");
    }
  });
});
