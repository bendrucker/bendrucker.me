import { computed, ref, shallowRef, type Ref } from "vue";
import { logPage } from "@/activity/log-page";
import type { MonthGroup } from "@/activity/types";

export interface LogPages {
  months: Ref<MonthGroup[]>;
  hasMore: Ref<boolean>;
  loading: Ref<boolean>;
  failed: Ref<boolean>;
  loadMore: () => Promise<void>;
}

/**
 * The log's months, growing backwards a page at a time. The server renders the
 * first window and names the month the next page loads before. Each page names
 * the one after it, until a page comes back with no cursor at the first ride.
 *
 * A failure leaves the cursor where it was, so retrying repeats the same
 * request.
 */
export function useLogPages(
  initialMonths: MonthGroup[],
  initialCursor: string | null,
): LogPages {
  // Shallow because a ride never changes once it has been read: a deep ref
  // would wrap every ride, badge, fact and photo of every month in a proxy,
  // which costs tens of megabytes across a log scrolled to its first ride and
  // buys reactivity nothing reads. Pages are appended by replacing the array,
  // which is the only mutation the ref has to see.
  const months = shallowRef<MonthGroup[]>([...initialMonths]);
  const cursor = ref<string | null>(initialCursor);
  const loading = ref(false);
  const failed = ref(false);

  async function loadMore(): Promise<void> {
    const before = cursor.value;
    if (loading.value || before === null) return;

    loading.value = true;
    failed.value = false;
    try {
      const response = await fetch(`/activity/cycling/${before}.json`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const page = logPage.parse(await response.json());
      months.value = [...months.value, ...page.months];
      cursor.value = page.logCursor;
    } catch {
      failed.value = true;
    } finally {
      loading.value = false;
    }
  }

  return {
    months,
    hasMore: computed(() => cursor.value !== null),
    loading,
    failed,
    loadMore,
  };
}
