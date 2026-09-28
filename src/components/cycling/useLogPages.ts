import { logPage } from "@/activity/log-page";
import type { MonthGroup } from "@/activity/types";
import {
  useMonthPages,
  type MonthPage,
  type MonthPages,
} from "./useMonthPages";

export type LogPages = MonthPages<MonthGroup>;

async function fetchCyclingPage(
  before: string,
): Promise<MonthPage<MonthGroup>> {
  const response = await fetch(`/activity/cycling/${before}.json`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return logPage.parse(await response.json());
}

/**
 * The log's months, growing backwards a page at a time through the month JSON
 * endpoint. `useMonthPages` holds the paging itself.
 */
export function useLogPages(
  initialMonths: MonthGroup[],
  initialCursor: string | null,
): LogPages {
  return useMonthPages(initialMonths, initialCursor, fetchCyclingPage);
}
