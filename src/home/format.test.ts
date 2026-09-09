import { describe, it, expect } from "vitest";
import { formatStat } from "./format";

describe("formatStat", () => {
  it("rounds distances and counts to whole numbers with commas", () => {
    expect(formatStat(6460.4, "distance")).toBe("6,460");
    expect(formatStat(108116, "distance")).toBe("108,116");
    expect(formatStat(4225, "count")).toBe("4,225");
    expect(formatStat(22.3, "distance")).toBe("22");
  });

  it("compacts climbing once it passes six digits", () => {
    expect(formatStat(45120, "elevation")).toBe("45,120");
    expect(formatStat(507114, "elevation")).toBe("507k");
    expect(formatStat(7815454, "elevation")).toBe("7.8M");
  });
});
