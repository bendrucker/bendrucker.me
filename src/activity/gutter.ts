import type { Dated, Section } from "./sections";

/** What a row's timeline gutter draws: its day, and whether the line stops under it. */
export interface GutterMarks {
  showDay: boolean;
  weekEnd: boolean;
}

/**
 * A row a month list can hide on a desktop. Highlights past the phone's three
 * still show in the months on a phone, where they are hidden from the
 * highlights, and only there, so nothing is listed twice at either width.
 */
export interface Listed extends Dated {
  phoneOnly: boolean;
}

/**
 * A listed row with its gutter at each width. A desktop skips the phone's
 * rows, so its gutter can differ: the next row may be the first of its day,
 * or the one its week's line stops under.
 */
export type Guttered<T extends Listed> = T & {
  phone: GutterMarks;
  desktop: GutterMarks;
};

/** A month section, which a desktop hides when it holds only phone rows. */
export type GutteredSection<T extends Listed> = Section<Guttered<T>> & {
  phoneOnly: boolean;
};

/** Each row's gutter at both widths, reading the list as each width shows it. */
export function markGutters<T extends Listed>(
  sections: readonly Section<T>[],
): GutteredSection<T>[] {
  let desktopDay: string | undefined;

  return sections.map((section) => {
    const weeks = section.weeks.map((week) => {
      const lastOnDesktop = week.rows.findLast(({ item }) => !item.phoneOnly);
      return {
        key: week.key,
        rows: week.rows.map((grouped, i) => {
          const { item } = grouped;
          const desktop = {
            showDay: !item.phoneOnly && item.day !== desktopDay,
            weekEnd: grouped === lastOnDesktop,
          };
          if (!item.phoneOnly) desktopDay = item.day;
          return {
            ...grouped,
            item: {
              ...item,
              phone: {
                showDay: grouped.showDay,
                weekEnd: i === week.rows.length - 1,
              },
              desktop,
            },
          };
        }),
      };
    });

    return {
      key: section.key,
      label: section.label,
      weeks,
      phoneOnly: weeks.every((week) =>
        week.rows.every(({ item }) => item.phoneOnly),
      ),
    };
  });
}

export interface GutterCopy {
  key: string;
  marks: GutterMarks;
  /** Which width draws this copy, when the two differ. */
  class: "" | "md:hidden" | "max-md:hidden";
}

/**
 * The gutters a row draws: one when both widths mark it alike, otherwise one
 * per width, switched in CSS since a width check in script would paint the
 * wrong one before hydrating.
 */
export function gutterCopies(
  phone: GutterMarks,
  desktop: GutterMarks,
): GutterCopy[] {
  if (phone.showDay === desktop.showDay && phone.weekEnd === desktop.weekEnd) {
    return [{ key: "both", marks: phone, class: "" }];
  }
  return [
    { key: "phone", marks: phone, class: "md:hidden" },
    { key: "desktop", marks: desktop, class: "max-md:hidden" },
  ];
}
