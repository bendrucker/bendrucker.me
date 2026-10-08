import { describe, expect, it } from "vitest";
import {
  findTag,
  fullDate,
  highlightRows,
  localDay,
  neighbors,
  postRows,
  readingMinutes,
  postTags,
  transitionName,
  writingView,
  type PostSource,
} from "./rows";

function post(
  id: string,
  pubDatetime: string,
  data: Partial<PostSource["data"]> = {},
): PostSource {
  return {
    id,
    data: {
      title: id,
      description: `About ${id}`,
      pubDatetime: new Date(pubDatetime),
      tags: [],
      ...data,
    },
  };
}

const OPTIONS = {
  href: (p: PostSource) => `/writing/${p.id}`,
  timeZone: "America/Los_Angeles",
};

const POSTS = [
  post("contributing", "2014-02-19T12:00:00Z", {
    title: "How to Start Contributing to Open Source",
    tags: ["Software", "Open Source"],
    featured: true,
  }),
  post("eaze", "2015-07-01T12:00:00Z", { title: "I'm Joining Eaze" }),
  post("communities", "2014-05-23T12:00:00Z", {
    title: "Understanding Open Source Communities",
    tags: ["Open Source"],
    featured: true,
  }),
  post("open-default", "2013-12-16T12:00:00Z", {
    title: "The Open Default Principle",
    tags: ["Open"],
    featured: true,
  }),
];

const ROWS = postRows(POSTS, OPTIONS);

describe("postRows", () => {
  it("sorts newest first", () => {
    expect(ROWS.map((r) => r.href)).toEqual([
      "/writing/eaze",
      "/writing/communities",
      "/writing/contributing",
      "/writing/open-default",
    ]);
  });

  it("dates a post by its local day", () => {
    const [late] = postRows([post("late", "2014-02-20T04:00:00Z")], OPTIONS);
    expect(late?.day).toBe("2014-02-19");
  });

  it("dates a post in its own time zone when it names one", () => {
    const [east] = postRows(
      [post("east", "2014-02-20T04:00:00Z", { timezone: "Asia/Tokyo" })],
      OPTIONS,
    );
    expect(east?.day).toBe("2014-02-20");
  });

  it("reads a post's minutes from its body", () => {
    const [long] = postRows(
      [
        {
          ...post("long", "2014-01-01T12:00:00Z"),
          body: "word ".repeat(1500),
        },
      ],
      OPTIONS,
    );
    expect(long?.minutes).toBe(7);
  });

  it("drops a description that repeats the title", () => {
    const [same] = postRows(
      [post("same", "2014-01-01T12:00:00Z", { description: "same" })],
      OPTIONS,
    );
    expect(same?.text).toBeUndefined();
  });
});

describe("readingMinutes", () => {
  it.each<{ name: string; body: string; minutes: number }>([
    { name: "an empty body", body: "", minutes: 1 },
    { name: "a short note", body: "a few words", minutes: 1 },
    { name: "a long post", body: "word ".repeat(2300), minutes: 10 },
  ])("$name", ({ body, minutes }) => {
    expect(readingMinutes(body)).toBe(minutes);
  });
});

describe("postTags", () => {
  it("lists each tag once, by name", () => {
    expect(postTags(ROWS).map((t) => t.name)).toEqual([
      "Open",
      "Open Source",
      "Software",
    ]);
  });
});

describe("findTag", () => {
  const tags = postTags(ROWS);

  it("finds a tag by its slug", () => {
    expect(findTag(tags, "open-source")?.name).toBe("Open Source");
  });

  it("finds a tag by its name", () => {
    expect(findTag(tags, "Open Source")?.slug).toBe("open-source");
  });

  it("finds nothing for an unknown or missing tag", () => {
    expect(findTag(tags, "cooking")).toBeUndefined();
    expect(findTag(tags, null)).toBeUndefined();
  });
});

describe("highlightRows", () => {
  it("keeps the featured posts, newest first", () => {
    expect(highlightRows(ROWS).map((r) => r.href)).toEqual([
      "/writing/communities",
      "/writing/contributing",
      "/writing/open-default",
    ]);
  });
});

describe("writingView", () => {
  it("leads with highlights and groups by year by default", () => {
    const view = writingView(ROWS, { query: "" }, "2026");
    expect(view.highlights.map((r) => [r.dayNum, r.sub])).toEqual([
      ["23", "may"],
      ["19", "feb"],
      ["16", "dec"],
    ]);
    expect(view.sections.map((s) => s.label)).toEqual(["2015", "2014", "2013"]);
    expect(view.count).toBe(4);
  });

  it("drops highlights and the posts a tag doesn't carry", () => {
    const tag = findTag(postTags(ROWS), "open-source");
    const view = writingView(ROWS, { query: "", tag }, "2026");
    expect(view.highlights).toEqual([]);
    expect(view.sections.map((s) => s.label)).toEqual(["2014"]);
    expect(view.count).toBe(2);
  });

  it("hides what a search doesn't match without dropping it", () => {
    const view = writingView(ROWS, { query: "eaze" }, "2026");
    expect(view.highlights.every((r) => !r.shown)).toBe(true);
    expect(view.sections.map((s) => [s.label, s.shown])).toEqual([
      ["2015", true],
      ["2014", false],
      ["2013", false],
    ]);
    expect(view.count).toBe(1);
  });

  it("counts nothing when a search matches nothing", () => {
    expect(writingView(ROWS, { query: "zzz" }, "2026").count).toBe(0);
  });
});

describe("neighbors", () => {
  it("links the newer and older posts either side", () => {
    const { newer, older } = neighbors(ROWS, "/writing/contributing");
    expect(newer?.href).toBe("/writing/communities");
    expect(older?.href).toBe("/writing/open-default");
  });

  it("leaves out a neighbor past either end", () => {
    expect(neighbors(ROWS, "/writing/eaze").newer).toBeUndefined();
    expect(neighbors(ROWS, "/writing/open-default").older).toBeUndefined();
  });
});

describe("fullDate", () => {
  it("names the weekday, month, and year", () => {
    expect(fullDate("2014-02-19", "2026")).toBe("Wednesday, February 19, 2014");
  });

  it("leaves this year unsaid", () => {
    expect(fullDate("2026-09-27", "2026")).toBe("Sunday, September 27");
  });
});

describe("localDay", () => {
  it("formats a calendar day", () => {
    expect(localDay(new Date("2026-01-02T20:00:00Z"), "UTC")).toBe(
      "2026-01-02",
    );
  });
});

describe("transitionName", () => {
  it("names a post by its path", () => {
    expect(transitionName("/writing/going-all-in")).toBe("post-going-all-in");
  });
});
