import type { WeekSummary } from "./recent";

const WORDS = [
  "no",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
];

function count(n: number, singular: string, plural: string): string {
  const word = WORDS[n] ?? String(n);
  return `${word} ${n === 1 ? singular : plural}`;
}

/**
 * The week as one sentence, the way a friend would answer "what have you
 * been up to": rides and miles, a race if there was one, and where the
 * code went. A week with nothing in it says so rather than going blank.
 */
export function latelySentence(week: WeekSummary): string {
  const parts: string[] = [];
  if (week.rideCount > 0) {
    let rides = count(week.rideCount, "ride", "rides");
    if (week.distanceMi > 0) {
      rides += ` and ${Math.round(week.distanceMi).toLocaleString("en-US")} miles`;
    }
    if (week.raceCount > 0) {
      rides +=
        week.raceCount === 1 && week.rideCount === 1
          ? ", a race"
          : `, ${count(week.raceCount, "of them a race", "of them races")}`;
    }
    parts.push(rides);
  }
  if (week.repoCount > 0) {
    parts.push(
      `code in ${count(week.repoCount, "repository", "repositories")}`,
    );
  }
  if (parts.length === 0) return "A quiet week.";
  return `This week: ${parts.join(", plus ")}.`;
}
