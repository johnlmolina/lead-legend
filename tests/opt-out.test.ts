import { describe, expect, it } from "vitest";
import { isStopKeyword, isStartKeyword } from "@/lib/twilio/opt-out";

describe("isStopKeyword", () => {
  it.each(["STOP", "stop", "Stop", "StopAll", "unsubscribe", "cancel", "end", "quit"])(
    "recognizes %s",
    (word) => {
      expect(isStopKeyword(word)).toBe(true);
    }
  );

  it("tolerates surrounding whitespace and trailing punctuation", () => {
    expect(isStopKeyword("  STOP  ")).toBe(true);
    expect(isStopKeyword("Stop!")).toBe(true);
    expect(isStopKeyword("stop.")).toBe(true);
  });

  it("does not treat ordinary messages as STOP", () => {
    expect(isStopKeyword("please stop by tomorrow")).toBe(false);
    expect(isStopKeyword("Yes I'm interested")).toBe(false);
    expect(isStopKeyword("")).toBe(false);
  });
});

describe("isStartKeyword", () => {
  it.each(["START", "start", "YES", "unstop"])("recognizes %s", (word) => {
    expect(isStartKeyword(word)).toBe(true);
  });

  it("does not treat ordinary messages as START", () => {
    expect(isStartKeyword("yes, that works for the estimate")).toBe(false);
  });
});
