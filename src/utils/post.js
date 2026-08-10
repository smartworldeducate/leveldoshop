// Helpers shared by the blog index, the article page and the home teaser.

/** Firestore Timestamp | Date | string → "7 Aug 2026". */
export function formatPostDate(value) {
  if (!value) return "";
  const date = value?.seconds ? new Date(value.seconds * 1000) : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Post content is stored as HTML; strip it for previews and meta tags. */
export function plainText(html) {
  return String(html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function excerptOf(html, length = 140) {
  const text = plainText(html);
  return text.length > length ? `${text.slice(0, length).trimEnd()}…` : text;
}

/** Rounded up, never zero — "0 min read" reads like an error. */
export function readingTime(html) {
  const words = plainText(html).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
