import { describe, expect, it } from "vitest";
import type { PhotoBucket, PhotoObject, Square } from "./photos";
import { contentRange, isVideoKey, servePhoto, serveThumbnail } from "./photos";

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

const PHOTO = "raw/strava/activities/1/photos/a.jpg";
const VIDEO = "raw/strava/activities/1/photos/a.mp4";
const OPAQUE = "raw/strava/activities/1/photos/a.bin";

function stream(text: string): ReadableStream {
  return new Blob([text]).stream();
}

function object(overrides: Partial<PhotoObject> = {}): PhotoObject {
  return {
    body: stream("bytes"),
    size: 4096,
    httpEtag: '"tag"',
    ...overrides,
  };
}

/** A bucket holding one object, or failing the way R2 does. */
function bucket(
  stored: PhotoObject | null,
  fail?: Error,
): PhotoBucket & { gets: ({ range?: Headers } | undefined)[] } {
  const gets: ({ range?: Headers } | undefined)[] = [];
  return {
    gets,
    async get(_key, options) {
      gets.push(options);
      if (fail) throw fail;
      return stored;
    },
    async head() {
      return stored && { size: stored.size };
    },
  };
}

function ranged(range: string): Request {
  return new Request("https://example.com/", { headers: { range } });
}

describe("servePhoto", () => {
  it("answers the whole object and caches it", async () => {
    const etags: string[] = [];
    const response = await servePhoto(
      bucket(object({ httpMetadata: { contentType: "image/jpeg" } })),
      PHOTO,
      new Request("https://example.com/"),
      (etag) => etags.push(etag),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(response.headers.get("accept-ranges")).toBe("bytes");
    expect(response.headers.get("content-range")).toBeNull();
    expect(etags).toEqual(['"tag"']);
  });

  // R2 fills `range` in on every get, so only the request can say whether the
  // reader asked for a partial.
  it("answers a whole-object get 200 even though R2 reports a range", async () => {
    const response = await servePhoto(
      bucket(object({ range: { offset: 0, length: 4096 } })),
      PHOTO,
      new Request("https://example.com/"),
      () => {},
    );

    expect(response.status).toBe(200);
  });

  it("answers a range 206 and leaves it out of the cache", async () => {
    const etags: string[] = [];
    const store = bucket(object({ range: { offset: 0, length: 1024 } }));
    const response = await servePhoto(
      store,
      VIDEO,
      ranged("bytes=0-1023"),
      (etag) => etags.push(etag),
    );

    expect(response.status).toBe(206);
    expect(response.headers.get("content-range")).toBe("bytes 0-1023/4096");
    expect(response.headers.get("accept-ranges")).toBe("bytes");
    expect(etags).toEqual([]);
    expect(store.gets[0]?.range).toBeInstanceOf(Headers);
  });

  it("names the object's length in a 416", async () => {
    const response = await servePhoto(
      bucket(object(), new Error("range not satisfiable")),
      VIDEO,
      ranged("bytes=99999-999999"),
      () => {},
    );

    expect(response.status).toBe(416);
    expect(response.headers.get("content-range")).toBe("bytes */4096");
    expect(response.headers.get("accept-ranges")).toBe("bytes");
  });

  // A 416 would blame the reader for the store failing.
  it("lets a failure on an unranged get through", async () => {
    const failure = new Error("R2 is down");
    await expect(
      servePhoto(
        bucket(object(), failure),
        PHOTO,
        new Request("https://example.com/"),
        () => {},
      ),
    ).rejects.toThrow(failure);
  });

  it("serves a video stored without a content type as mp4", async () => {
    const response = await servePhoto(
      bucket(object()),
      VIDEO,
      new Request("https://example.com/"),
      () => {},
    );

    expect(response.headers.get("content-type")).toBe("video/mp4");
  });

  it("404s a key the bucket does not hold", async () => {
    const response = await servePhoto(
      bucket(null),
      PHOTO,
      new Request("https://example.com/"),
      () => {},
    );

    expect(response.status).toBe(404);
  });
});

const cuts = (image: Square | null, frame: Square | null) => ({
  image: async () => image,
  frame: async () => frame,
});

const jpeg = (): Square => ({
  body: stream("jpeg"),
  contentType: "image/jpeg",
});

describe("serveThumbnail", () => {
  it("answers a photo's square and caches it", async () => {
    const etags: string[] = [];
    const response = await serveThumbnail(
      bucket(object()),
      PHOTO,
      cuts(jpeg(), null),
      (etag) => etags.push(etag),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(response.headers.get("etag")).toBe('"tag"');
    expect(etags).toEqual(['"tag"']);
  });

  it("cuts a video's square from its frame", async () => {
    const response = await serveThumbnail(
      bucket(object()),
      VIDEO,
      cuts(null, jpeg()),
      () => {},
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/jpeg");
  });

  // Redirecting would point a 48px `<img>` at the whole video.
  it("404s a video whose frame failed rather than redirecting", async () => {
    const etags: string[] = [];
    const response = await serveThumbnail(
      bucket(object()),
      VIDEO,
      cuts(jpeg(), null),
      (etag) => etags.push(etag),
    );

    expect(response.status).toBe(404);
    expect(response.headers.get("location")).toBeNull();
    expect(etags).toEqual([]);
  });

  it("redirects a photo whose transform failed to the original", async () => {
    const response = await serveThumbnail(
      bucket(object()),
      PHOTO,
      cuts(null, null),
      () => {},
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(`/photos/${PHOTO}`);
  });

  // The key names neither an image nor a video, so it could be carrying one.
  it("404s a failed transform on a key of unknown type", async () => {
    const response = await serveThumbnail(
      bucket(object()),
      OPAQUE,
      cuts(null, null),
      () => {},
    );

    expect(response.status).toBe(404);
  });

  it("404s a key the bucket does not hold", async () => {
    const response = await serveThumbnail(
      bucket(null),
      PHOTO,
      cuts(jpeg(), null),
      () => {},
    );

    expect(response.status).toBe(404);
  });
});
