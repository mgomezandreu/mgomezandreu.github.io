// Prefix an absolute, site-internal path with Astro's configured `base`. The
// site is served at the root, so this is currently a no-op, but routing paths
// through it keeps a future `base` a one-line change. External URLs, anchors,
// mailto: and already-prefixed paths are left untouched.
// import.meta.env.BASE_URL has a trailing slash ("/" at the root).
export function withBase(path: string): string {
  if (!path.startsWith("/")) return path;
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  if (base && path.startsWith(base + "/")) return path;
  return `${base}${path}`;
}

// Split text on ==highlighted== spans, so they can be rendered as <mark>.
export function splitMarks(text: string): { text: string; marked: boolean }[] {
  return text
    .split(/==(.+?)==/)
    .map((part, i) => ({ text: part, marked: i % 2 === 1 }))
    .filter(part => part.text);
}

export function formatDate(date: Date) {
  return Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric"
  }).format(date);
}

export function readingTime(html: string) {
  const textOnly = html.replace(/<[^>]+>/g, "");
  const wordCount = textOnly.split(/\s+/).length;
  const readingTimeMinutes = ((wordCount / 200) + 1).toFixed();
  return `${readingTimeMinutes} min read`;
}

export function dateRange(startDate: Date, endDate?: Date | string): string {
  const startMonth = startDate.toLocaleString("default", { month: "short" });
  const startYear = startDate.getFullYear().toString();
  let endMonth;
  let endYear;

  if (endDate) {
    if (typeof endDate === "string") {
      endMonth = "";
      endYear = endDate;
    } else {
      endMonth = endDate.toLocaleString("default", { month: "short" });
      endYear = endDate.getFullYear().toString();
    }
  }

  return `${startMonth}${startYear} - ${endMonth}${endYear}`;
}