// ============================================================
// Reward draws — free to enter, kept apart from anything for sale.
//
//   rewardDraws/{id}                  the draw, its dates and its winner
//   rewardEntries/{drawId}_{uid}      one free entry per account
//
// Nobody pays for a chance: entry never depends on a purchase, and buying
// a coupon adds no entries. Keep it that way, because a draw people pay to
// enter is usually treated as a lottery.
// ============================================================

import { toCsv } from "./couponSales";

export const EMPTY_DRAW = {
  title: "",
  prize: "",
  terms: "",
  closesAt: "",
  resultsAt: "",
  visible: true,
};

/** Where a draw stands right now. Winners only show from the results date. */
export function drawStatus(draw, now = new Date()) {
  if (draw?.visible === false) return { key: "hidden", label: "Hidden", tone: "neutral" };
  if (now <= new Date(draw?.closesAt)) return { key: "open", label: "Open for entries", tone: "success" };
  if (now < new Date(draw?.resultsAt)) return { key: "closed", label: "Entries closed", tone: "warning" };
  return draw?.winner
    ? { key: "results", label: "Results out", tone: "brand" }
    : { key: "due", label: "Winner not picked yet", tone: "warning" };
}

/** Time left as days, hours, minutes and seconds, or null once it has passed. */
export function timeLeft(until, now = new Date()) {
  const ms = new Date(until) - now;
  if (!(ms > 0)) return null;
  const seconds = Math.floor(ms / 1000);
  return {
    days: Math.floor(seconds / 86400),
    hours: Math.floor(seconds / 3600) % 24,
    minutes: Math.floor(seconds / 60) % 60,
    seconds: seconds % 60,
  };
}

/** The steps every draw goes through, for the dashboard's progress bar. */
export const DRAW_STAGES = ["Entries open", "Entries closed", "Winner picked", "Results shown"];

/** How far along a draw is: an index into DRAW_STAGES. */
export function drawStage(draw, now = new Date()) {
  if (now <= new Date(draw?.closesAt)) return 0;
  if (!draw?.winner) return 1;
  return now < new Date(draw.resultsAt) ? 2 : 3;
}

/** What staff should do next, in a sentence. */
export function drawNextStep(draw, now = new Date()) {
  if (draw?.visible === false) return "Hidden from customers. Switch on Show on the website to open it.";
  const stage = drawStage(draw, now);
  if (stage === 0) return `Customers can enter until ${formatDrawDate(draw.closesAt)}.`;
  if (stage === 1) return "Entries have closed. Pick the winner.";
  if (stage === 2) return `Winner picked. Tell them now. The website shows the result on ${formatDrawDate(draw.resultsAt)}.`;
  return "Finished. The winner is on the website.";
}

/** A ready-made start, in plain words, for shops that don't have rules written. */
export const STANDARD_DRAW_RULES =
  "Free to enter, with no purchase needed. One entry per person. The winner is picked at random after entries close and contacted on WhatsApp. They have 7 days to reply and claim the prize, or we may pick again.";

export const entriesCsv = (entries, formatDate) =>
  toCsv([["Name", "WhatsApp", "Entered"], ...entries.map((e) => [e.name, e.phone, formatDate(e.createdAt)])]);

export const entryId = (drawId, uid) => `${drawId}_${uid}`;

/** "Sana Malik" → "Sana M.", so a winner can be announced without their full name. */
export function maskName(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "A customer";
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.` : parts[0];
}

/** Every eligible entry has the same chance. `excluded` are earlier winners of a redraw. */
export function pickWinner(entries, excluded = [], randomInt = secureRandomInt) {
  const eligible = entries.filter((entry) => !excluded.includes(entry.id));
  if (!eligible.length) return null;
  return eligible[randomInt(eligible.length)];
}

// Rejection sampling, because `random % n` would favour the earliest entries.
function secureRandomInt(n) {
  const limit = Math.floor(0x100000000 / n) * n;
  const value = new Uint32Array(1);
  do {
    crypto.getRandomValues(value);
  } while (value[0] >= limit);
  return value[0] % n;
}

export function drawFields(form) {
  return {
    title: String(form.title || "").trim(),
    prize: String(form.prize || "").trim(),
    terms: String(form.terms || "").trim(),
    closesAt: form.closesAt ? new Date(form.closesAt).toISOString() : "",
    resultsAt: form.resultsAt ? new Date(form.resultsAt).toISOString() : "",
    visible: form.visible !== false,
  };
}

export function drawErrors(form) {
  const errors = {};
  if (!String(form.title || "").trim()) errors.title = "Give the draw a name";
  if (!String(form.prize || "").trim()) errors.prize = "Say what the winner gets";
  if (!String(form.terms || "").trim()) errors.terms = "Add the rules customers should read";
  if (!form.closesAt) errors.closesAt = "Choose when entries close";
  if (!form.resultsAt) errors.resultsAt = "Choose when results are shown";
  else if (form.closesAt && new Date(form.resultsAt) < new Date(form.closesAt)) {
    errors.resultsAt = "Results can't come before entries close";
  }
  return errors;
}

export const formatDrawDate = (iso) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export function winnerMessage(draw, entry) {
  return `Hello ${entry.name?.trim() || "there"}, congratulations! You've been selected as the winner of our free draw "${draw.title}". Your reward: ${draw.prize}. Please reply to this message so we can arrange it.`;
}
