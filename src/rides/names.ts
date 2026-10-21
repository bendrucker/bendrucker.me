// Strava names an unrenamed ride for the time of day it started, which tells
// a reader nothing on a card that already shows the day.
const STRAVA_DEFAULT =
  /^(?:Morning|Lunch|Afternoon|Evening|Night) (?:\S+ )?Ride$/;

export function isDefaultName(name: string): boolean {
  return STRAVA_DEFAULT.test(name);
}
