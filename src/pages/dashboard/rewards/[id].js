import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { ArrowLeft, CalendarClock, Dices, Download, ExternalLink, Gift, MessageCircle, Save, Trash2, Trophy, Users } from "lucide-react";

import DashboardLayout, { dashboardGetLayout } from "@/components/dashboard/DashboardLayout";
import DrawStages from "@/components/dashboard/DrawStages";
import Card, { CardHeader } from "@/components/dashboard/ui/Card";
import Badge from "@/components/dashboard/ui/Badge";
import Button from "@/components/dashboard/ui/Button";
import DataTable from "@/components/dashboard/ui/DataTable";
import EmptyState from "@/components/dashboard/ui/EmptyState";
import Field, { Input, Textarea } from "@/components/dashboard/ui/Field";
import SegmentedControl from "@/components/dashboard/ui/SegmentedControl";
import { SwitchRow } from "@/components/dashboard/ui/Switch";
import { SearchInput } from "@/components/dashboard/ui/Toolbar";
import { FOCUS } from "@/components/dashboard/theme";

import { deleteDraw, drawWinner, fetchDraws, fetchEntries, saveDraw } from "@/redux/rewards/rewardsSlice";
import { formatDateTime } from "@/lib/analytics";
import { whatsappNumber } from "@/data/notifications";
import { EMPTY_DRAW, STANDARD_DRAW_RULES, drawErrors, drawNextStep, drawStage, drawStatus, entriesCsv, formatDrawDate, winnerMessage } from "@/data/rewards";

function toLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const inDays = (days, from = new Date()) => toLocalInput(new Date(new Date(from).getTime() + days * 86_400_000).toISOString());

const chip = `rounded-full bg-[#F2F6FC] px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:text-[#4267B2] ${FOCUS}`;

/** Create a draw or change one: name and prize, then dates, then rules. */
function DrawForm({ draw, saving, onSave, onDelete, entryCount }) {
  const [form, setForm] = useState(() =>
    draw ? { ...EMPTY_DRAW, ...draw, closesAt: toLocalInput(draw.closesAt), resultsAt: toLocalInput(draw.resultsAt) } : EMPTY_DRAW
  );
  const [errors, setErrors] = useState({});
  const [deleting, setDeleting] = useState(false);

  const change = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    setErrors((prev) => ({ ...prev, ...Object.fromEntries(Object.keys(patch).map((key) => [key, ""])) }));
  };
  const set = (key) => (e) => change({ [key]: e.target.value });

  const closeIn = (days) => {
    const closesAt = inDays(days);
    // A day to pick and contact the winner before the result goes up.
    change({ closesAt, resultsAt: inDays(1, closesAt) });
  };

  const submit = (e) => {
    e.preventDefault();
    const found = drawErrors(form);
    setErrors(found);
    const firstError = Object.keys(found)[0];
    if (firstError) {
      // The field may be off-screen, so a failed save must not look like nothing happened.
      toast.error(found[firstError]);
      document.querySelector(`[name="${firstError}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    onSave(form);
  };

  return (
    <form onSubmit={submit} noValidate className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-6">
        <Card>
          <CardHeader title="1. The prize" subtitle="What customers can win." />
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Draw name" required error={errors.title}>
              <Input name="title" value={form.title} onChange={set("title")} placeholder="Eid basket draw" maxLength={80} />
            </Field>
            <Field label="Prize" required error={errors.prize}>
              <Input name="prize" value={form.prize} onChange={set("prize")} placeholder="A free weekly grocery basket" maxLength={120} />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="2. The dates" subtitle="Entries close by themselves. You pick the winner after that." />
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Close entries in:</span>
            {[3, 7, 14, 30].map((days) => (
              <button key={days} type="button" className={chip} onClick={() => closeIn(days)}>{days} days</button>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Entries close" required error={errors.closesAt}>
              <Input name="closesAt" type="datetime-local" value={form.closesAt} onChange={set("closesAt")} />
            </Field>
            <Field label="Results shown" required error={errors.resultsAt} hint="The winner appears on the website from this time.">
              <Input name="resultsAt" type="datetime-local" value={form.resultsAt} onChange={set("resultsAt")} />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="3. The rules"
            subtitle="Who can enter, how the winner is contacted and how long they have to claim."
            action={
              <button type="button" className={chip} onClick={() => change({ terms: STANDARD_DRAW_RULES })}>
                Use standard rules
              </button>
            }
          />
          <div className="mt-4">
            <Field label="Rules" required error={errors.terms}>
              <Textarea name="terms" rows={4} value={form.terms} onChange={set("terms")} />
            </Field>
          </div>
        </Card>

        {draw && (
          <Card>
            <CardHeader title="Delete this draw" subtitle={`This also deletes its ${entryCount} ${entryCount === 1 ? "entry" : "entries"} and the winner record.`} />
            {deleting ? (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="mr-auto text-sm font-semibold text-rose-700">This can't be undone. Delete it?</span>
                <Button type="button" variant="outline" size="sm" onClick={() => setDeleting(false)}>Keep it</Button>
                <Button type="button" variant="danger" size="sm" icon={Trash2} onClick={onDelete}>Yes, delete the draw</Button>
              </div>
            ) : (
              <div className="mt-4">
                <Button type="button" variant="softDanger" size="sm" icon={Trash2} onClick={() => setDeleting(true)}>Delete draw</Button>
              </div>
            )}
          </Card>
        )}
      </div>

      <div className="flex flex-col gap-6 xl:sticky xl:top-0">
        <Card>
          <CardHeader title="How it looks on the website" />
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
            <div className="flex flex-col gap-1.5 bg-[linear-gradient(150deg,#F5B94E,#D98A1F)] p-5 text-[#3D2600]">
              <Gift className="h-7 w-7" />
              <p className="text-[11px] font-extrabold uppercase tracking-wider">You could win</p>
              <p className="break-words text-xl font-extrabold">{form.prize || "Your prize"}</p>
              <span className="mt-1 self-start rounded-full bg-white/45 px-2.5 py-0.5 text-xs font-bold">Free to enter</span>
            </div>
            <div className="p-4">
              <p className="break-words font-bold text-slate-800">{form.title || "Your draw name"}</p>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                <CalendarClock className="h-3.5 w-3.5 shrink-0" /> Entries close {form.closesAt ? formatDrawDate(form.closesAt) : "(not set)"}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                <Trophy className="h-3.5 w-3.5 shrink-0" /> Winner announced {form.resultsAt ? formatDrawDate(form.resultsAt) : "(not set)"}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <SwitchRow
              title="Show on the website"
              note="Adds Rewards to the website menu"
              checked={form.visible !== false}
              onChange={(on) => change({ visible: on })}
            />
          </div>
          <Button type="submit" icon={Save} className="mt-4 w-full" loading={saving}>
            {draw ? "Save changes" : "Create draw"}
          </Button>
        </Card>
      </div>
    </form>
  );
}

/** Choosing the winner, then telling them. */
function WinnerCard({ draw, entries }) {
  const dispatch = useDispatch();
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState("");
  const [picking, setPicking] = useState(false);

  const stage = drawStage(draw);
  const closed = stage > 0;
  const earlier = (draw.history || []).map((h) => h.entryId);
  const left = entries.filter((e) => !earlier.includes(e.id)).length;
  const winnerEntry = draw.winner && entries.find((e) => e.id === draw.winner.entryId);
  const number = winnerEntry && whatsappNumber(winnerEntry.phone);

  const pick = async () => {
    setPicking(true);
    try {
      await dispatch(drawWinner({ drawId: draw.id, reason })).unwrap();
      toast.success("Winner picked");
      setConfirming(false);
      setReason("");
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Could not pick a winner");
    }
    setPicking(false);
  };

  const blocked = !closed
    ? `You can pick a winner once entries close on ${formatDrawDate(draw.closesAt)}.`
    : !entries.length
      ? "Nobody entered this draw, so there's no one to pick."
      : !left
        ? "Everyone who entered has already been picked."
        : "";

  return (
    <Card>
      <CardHeader title="Winner" />

      {draw.winner ? (
        <div className="mt-4 rounded-2xl bg-[linear-gradient(150deg,#F5B94E,#D98A1F)] p-5 text-[#3D2600]">
          <Trophy className="h-7 w-7" />
          <p className="mt-2 break-words text-2xl font-extrabold">{winnerEntry?.name || draw.winner.name}</p>
          {winnerEntry && <p className="mt-0.5 text-sm font-semibold">{winnerEntry.phone}</p>}
          <p className="mt-2 text-xs">Picked {formatDateTime(draw.winner.at)}. The website shows "{draw.winner.name}" from the results date.</p>
        </div>
      ) : null}

      {blocked && <p className="mt-3 text-sm text-slate-500">{blocked}</p>}

      {number && (
        <a
          href={`https://wa.me/${number}?text=${encodeURIComponent(winnerMessage(draw, winnerEntry))}`}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          <MessageCircle className="h-[18px] w-[18px]" /> Tell the winner on WhatsApp
        </a>
      )}

      {confirming ? (
        <div className="mt-3 rounded-2xl bg-[#F6F8FC] p-4">
          <p className="text-sm font-semibold text-slate-700">
            {draw.winner
              ? "Only pick again if the winner can't accept. They stay on the record and can't be picked twice."
              : `One of ${entries.length} ${entries.length === 1 ? "entry" : "entries"} is chosen at random, and it's recorded.`}
          </p>
          {draw.winner && (
            <div className="mt-3">
              <Field label="Why are you picking again?" hint="Optional. Kept on the draw record.">
                <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Winner couldn't be reached" />
              </Field>
            </div>
          )}
          <div className="mt-3 flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => setConfirming(false)}>Not yet</Button>
            <Button size="sm" className="flex-1" icon={Dices} loading={picking} onClick={pick}>
              {draw.winner ? "Pick again" : "Pick now"}
            </Button>
          </div>
        </div>
      ) : (
        !blocked && (
          <Button variant={draw.winner ? "outline" : "primary"} icon={Dices} className="mt-3 w-full" onClick={() => setConfirming(true)}>
            {draw.winner ? "Pick a different winner" : "Pick a winner at random"}
          </Button>
        )
      )}

      {draw.history?.length > 0 && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Draw record</p>
          <ul className="mt-2 flex flex-col gap-2 text-xs text-slate-500">
            {draw.history.map((h) => (
              <li key={h.at}>
                {formatDateTime(h.at)}: {entries.find((e) => e.id === h.entryId)?.name || "Entry"}, from {h.entries} entries, by {h.by}
                {h.reason ? ` (“${h.reason}”)` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

function Entries({ draw, entries }) {
  const [query, setQuery] = useState("");
  const term = query.trim().toLowerCase();
  const rows = entries.filter((e) => !term || [e.name, e.phone].some((v) => String(v || "").toLowerCase().includes(term)));

  const download = () => {
    const url = URL.createObjectURL(new Blob([entriesCsv(entries, formatDateTime)], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `draw-entries-${draw.id}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const columns = [
    { key: "name", label: "Name", render: (e) => <span className="font-semibold text-slate-800">{e.name}</span> },
    { key: "phone", label: "WhatsApp", render: (e) => <span className="text-slate-500">{e.phone}</span> },
    { key: "when", label: "Entered", render: (e) => <span className="text-slate-500">{formatDateTime(e.createdAt)}</span> },
    {
      key: "state",
      label: "",
      align: "right",
      render: (e) => (draw.winner?.entryId === e.id ? <Badge tone="brand" icon={Trophy}>Winner</Badge> : null),
    },
  ];

  return (
    <Card>
      <CardHeader
        title={`Entries (${entries.length})`}
        subtitle="One per account. Everyone has the same chance."
        action={
          <Button variant="outline" size="sm" icon={Download} disabled={!entries.length} onClick={download}>
            Download
          </Button>
        }
      />
      {entries.length > 5 && (
        <div className="mt-4">
          <SearchInput value={query} onChange={setQuery} placeholder="Search name or number" className="sm:max-w-xs" />
        </div>
      )}
      <div className="mt-4">
        <DataTable
          columns={columns}
          rows={rows}
          minWidth={560}
          empty={<EmptyState icon={Users} title={entries.length ? "No one matches" : "No entries yet"} body={entries.length ? "Try another search." : "Customers enter from the Rewards page."} />}
        />
      </div>
    </Card>
  );
}

export default function DrawPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { draws, loaded, entries: entriesByDraw } = useSelector((s) => s.rewards);

  const param = router.query.id;
  const isNew = param === "new";
  const draw = draws.find((d) => d.id === param);
  const entries = entriesByDraw[param] || [];

  const [tab, setTab] = useState("overview");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loaded) dispatch(fetchDraws());
  }, [dispatch, loaded]);

  useEffect(() => {
    if (router.isReady && !isNew && param) dispatch(fetchEntries(param));
  }, [dispatch, router.isReady, isNew, param]);

  const save = async (form) => {
    setSaving(true);
    try {
      const saved = await dispatch(saveDraw({ id: isNew ? null : draw.id, form })).unwrap();
      toast.success(isNew ? "Draw created" : "Draw saved");
      if (isNew) router.replace(`/dashboard/rewards/${saved.id}`);
      else setTab("overview");
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Could not save the draw");
    }
    setSaving(false);
  };

  const remove = async () => {
    try {
      await dispatch(deleteDraw(draw.id)).unwrap();
      toast.success("Draw deleted");
      router.push("/dashboard/rewards");
    } catch {
      toast.error("Could not delete the draw");
    }
  };

  const back = (
    <Button variant="outline" size="sm" icon={ArrowLeft} href="/dashboard/rewards">
      All draws
    </Button>
  );

  if (!router.isReady || (!isNew && !loaded)) {
    return (
      <DashboardLayout title="Draw" eyebrow="Reward draw" actions={back}>
        <Card><p className="text-sm text-slate-400" aria-busy="true">Loading…</p></Card>
      </DashboardLayout>
    );
  }

  if (isNew) {
    return (
      <DashboardLayout title="New draw" eyebrow="Reward draw" actions={back}>
        <DrawForm saving={saving} onSave={save} />
      </DashboardLayout>
    );
  }

  if (!draw) {
    return (
      <DashboardLayout title="Draw" eyebrow="Reward draw" actions={back}>
        <Card>
          <EmptyState icon={Gift} title="Draw not found" body="It may have been deleted." />
        </Card>
      </DashboardLayout>
    );
  }

  const status = drawStatus(draw);

  return (
    <DashboardLayout title={draw.title} eyebrow="Reward draw" actions={back}>
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="break-words text-lg font-bold text-slate-800">{draw.prize}</p>
            <p className="mt-0.5 text-sm text-slate-500">{drawNextStep(draw)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={status.tone}>{status.label}</Badge>
            {draw.visible !== false && (
              <Button variant="ghost" size="icon" aria-label="See on the website" href="/rewards" target="_blank">
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <div className="mt-5">
          <DrawStages draw={draw} />
        </div>
      </Card>

      <SegmentedControl
        value={tab}
        onChange={setTab}
        options={[
          { value: "overview", label: "Winner and entries", count: entries.length },
          { value: "edit", label: "Edit details" },
        ]}
      />

      {tab === "overview" ? (
        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="order-2 min-w-0 xl:order-1">
            <Entries draw={draw} entries={entries} />
          </div>
          <div className="order-1 xl:order-2">
            <WinnerCard draw={draw} entries={entries} />
          </div>
        </div>
      ) : (
        <DrawForm key={draw.id} draw={draw} saving={saving} onSave={save} onDelete={remove} entryCount={entries.length} />
      )}
    </DashboardLayout>
  );
}

DrawPage.getLayout = dashboardGetLayout;
