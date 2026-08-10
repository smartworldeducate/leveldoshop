import { Inbox } from "lucide-react";
import Button from "./Button";

/** Shown wherever a list has nothing in it — never a bare "no data" string. */
export default function EmptyState({
  icon: Icon = Inbox,
  title = "Nothing here yet",
  body,
  action,
  onAction,
  className = "",
}) {
  return (
    <div className={`flex flex-col items-center justify-center px-6 py-14 text-center ${className}`}>
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F2F6FC] text-[#4267B2]">
        <Icon className="h-7 w-7" />
      </span>
      <p className="mt-4 font-semibold text-slate-700">{title}</p>
      {body && <p className="mt-1 max-w-sm text-sm text-slate-400">{body}</p>}
      {action && (
        <Button size="sm" className="mt-5" onClick={onAction}>
          {action}
        </Button>
      )}
    </div>
  );
}
