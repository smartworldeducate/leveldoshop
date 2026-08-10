// Who may open /dashboard. Set NEXT_PUBLIC_ADMIN_EMAILS to a comma-separated
// list to change this without a code edit; the literal below is the fallback.
const FALLBACK = ["salmanalisoftwareenginear@gmail.com"];

export const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const allowlist = ADMIN_EMAILS.length ? ADMIN_EMAILS : FALLBACK;

export const isAdmin = (user) =>
  Boolean(user?.email && allowlist.includes(user.email.toLowerCase()));

/** Two-letter avatar initials from a display name or email. */
export const initialsOf = (user) =>
  (user?.displayName || user?.email || "A")
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
