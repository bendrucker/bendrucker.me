/**
 * One declaration of a story's controls, rendered twice: as `Hst*` controls in
 * the side panel, and as plain form fields inside the preview. Histoire drops
 * the side panel below a 640px viewport, so the preview copy is the only one a
 * phone reviewer can reach.
 */
export type StoryControl =
  | {
      type: "select";
      title: string;
      options: readonly string[] | Record<string, string>;
    }
  | { type: "slider"; title: string; min: number; max: number; step?: number }
  | { type: "checkbox"; title: string }
  | { type: "text"; title: string };

export type StoryControlSet = Record<string, StoryControl>;

export type StoryState = Record<string, unknown>;

const HST_COMPONENTS = {
  select: "HstSelect",
  slider: "HstSlider",
  checkbox: "HstCheckbox",
  text: "HstText",
} as const;

export function hstComponent(control: StoryControl): string {
  return HST_COMPONENTS[control.type];
}

export function hstProps(control: StoryControl): Record<string, unknown> {
  switch (control.type) {
    case "select":
      return { options: control.options };
    case "slider":
      return { min: control.min, max: control.max, step: control.step };
    default:
      return {};
  }
}

export interface SelectEntry {
  value: string;
  label: string;
}

export function selectEntries(
  options: readonly string[] | Record<string, string>,
): SelectEntry[] {
  if (Array.isArray(options)) {
    return options.map((value) => ({ value, label: value }));
  }
  return Object.entries(options as Record<string, string>).map(
    ([value, label]) => ({ value, label }),
  );
}
