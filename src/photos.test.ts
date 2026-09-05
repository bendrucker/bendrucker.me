import { describe, expect, it } from "vitest";
import { contentRange, isVideoKey } from "./photos";

describe("isVideoKey", () => {
  it.each(["a.mp4", "a.MP4", "a.mov", "a.m4v"])("matches %s", (key) => {
    expect(isVideoKey(key)).toBe(true);
  });

  it.each(["a.jpg", "a.jpeg", "a.png", "a.mp4.jpg", "mp4"])(
    "does not match %s",
    (key) => {
      expect(isVideoKey(key)).toBe(false);
    },
  );
});

describe("contentRange", () => {
  it("formats an offset with a length", () => {
    expect(contentRange({ offset: 0, length: 1024 }, 11_421_645)).toBe(
      "bytes 0-1023/11421645",
    );
  });

  // `Range: bytes=1024-` reaches the end of the object, which R2 resolves to an
  // offset alone.
  it("runs an offset without a length to the last byte", () => {
    expect(contentRange({ offset: 1024 }, 4096)).toBe("bytes 1024-4095/4096");
  });

  // `Range: bytes=0-1023` and `bytes=-1024` both name 1024 bytes, and only the
  // second resolves to a length with no offset.
  it("anchors a bare length at the start", () => {
    expect(contentRange({ length: 1024 }, 4096)).toBe("bytes 0-1023/4096");
  });

  it("counts a suffix back from the end", () => {
    expect(contentRange({ suffix: 1024 }, 4096)).toBe("bytes 3072-4095/4096");
  });

  it("formats a single byte", () => {
    expect(contentRange({ offset: 4095, length: 1 }, 4096)).toBe(
      "bytes 4095-4095/4096",
    );
  });
});
