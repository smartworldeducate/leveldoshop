import { FOCUS } from "../theme";

/**
 * On/off switch. Used wherever the shopkeeper turns something on the
 * storefront on or off — aisles, pages, home sections.
 */
export default function Switch({ checked, onChange, disabled, label, id }) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={Boolean(checked)}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS} ${
        checked ? "bg-[linear-gradient(150deg,#5B83D6,#4267B2)]" : "bg-slate-200"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

/** Switch with a title/description block — the row shape used on Settings. */
export function SwitchRow({ title, note, checked, onChange, disabled }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-[#F6F8FC] px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-700">{title}</p>
        {note && <p className="truncate text-xs text-slate-400">{note}</p>}
      </div>
      <Switch checked={checked} onChange={onChange} disabled={disabled} label={title} />
    </div>
  );
}
