import { computed, ref, shallowRef, type Ref } from "vue";

// Kept apart from `useLogPages`, whose cycling schema would otherwise ride
// along into every island that pages months of another shape.

export interface MonthPages<M> {
  months: Ref<M[]>;
  /** The month the next page loads before, or null past the first ride. */
  cursor: Ref<string | null>;
  hasMore: Ref<boolean>;
  loading: Ref<boolean>;
  failed: Ref<boolean>;
  loadMore: () => Promise<void>;
  /** Puts back months paged in before, as a reader returning to the list left them. */
  restore: (page: MonthPage<M>) => void;
}

/** One page of months, and the month the page after it loads before. */
export interface MonthPage<M> {
  months: M[];
  logCursor: string | null;
}

/** Fetches and parses the page of months ending just before `before`. */
export type FetchMonthPage<M> = (before: string) => Promise<MonthPage<M>>;

/**
 * Months of any shape, growing backwards a page at a time. The server renders
 * the first window and names the month the next page loads before. Each page
 * names the one after it, until a page comes back with no cursor at the first
 * ride.
 *
 * A failure leaves the cursor where it was, so retrying repeats the same
 * request.
 */
export function useMonthPages<M>(
  initialMonths: M[],
  initialCursor: string | null,
  fetchPage: FetchMonthPage<M>,
): MonthPages<M> {
  // Shallow because a ride never changes once it has been read: a deep ref
  // would wrap every ride, badge, fact and photo of every month in a proxy,
  // which costs tens of megabytes across a log scrolled to its first ride and
  // buys reactivity nothing reads. Pages are appended by replacing the array,
  // which is the only mutation the ref has to see.
  const months = shallowRef<M[]>([...initialMonths]);
  const cursor = ref<string | null>(initialCursor);
  const loading = ref(false);
  const failed = ref(false);
  // Moves on every restore, so a page requested before one lands nowhere
  // rather than on the end of months it was never the next page of.
  let generation = 0;

  async function loadMore(): Promise<void> {
    const before = cursor.value;
    if (loading.value || before === null) return;

    const started = generation;
    loading.value = true;
    failed.value = false;
    try {
      const page = await fetchPage(before);
      if (started !== generation) return;
      months.value = [...months.value, ...page.months];
      cursor.value = page.logCursor;
    } catch {
      if (started === generation) failed.value = true;
    } finally {
      loading.value = false;
    }
  }

  function restore(page: MonthPage<M>) {
    generation += 1;
    months.value = [...page.months];
    cursor.value = page.logCursor;
    failed.value = false;
  }

  return {
    months,
    cursor,
    hasMore: computed(() => cursor.value !== null),
    loading,
    failed,
    loadMore,
    restore,
  };
}
