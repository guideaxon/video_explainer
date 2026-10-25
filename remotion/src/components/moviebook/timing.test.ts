import { describe, expect, it } from "vitest";
import { captionOpacity, clipFrameAt, clipFramesInComp, isHolding } from "./timing";

describe("clip timing", () => {
  it("plays once then holds the last frame", () => {
    expect(clipFrameAt(0, 90)).toBe(0);
    expect(clipFrameAt(89, 90)).toBe(89);
    expect(clipFrameAt(200, 90)).toBe(89);
    expect(isHolding(89, 90)).toBe(false);
    expect(isHolding(90, 90)).toBe(true);
  });
  it("never goes negative or past an empty clip", () => {
    expect(clipFrameAt(-5, 90)).toBe(0);
    expect(clipFrameAt(10, 0)).toBe(0);
  });
  it("converts clip length between frame rates", () => {
    expect(clipFramesInComp(90, 24, 24)).toBe(90);
    expect(clipFramesInComp(90, 24, 30)).toBe(113);
  });
  it("fades the caption at both ends", () => {
    expect(captionOpacity(0, 60)).toBe(0);
    expect(captionOpacity(30, 60)).toBe(1);
    expect(captionOpacity(60, 60)).toBe(0);
  });
});
