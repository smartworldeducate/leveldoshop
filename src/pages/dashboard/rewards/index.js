import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AlertTriangle, ArrowRight, CalendarClock, Dices, EyeOff, Gift, Plus, Trophy, Users } from "lucide-react";

import DashboardLayout, { dashboardGetLayout } from "@/components/dashboard/DashboardLayout";
import DrawStages from "@/components/dashboard/DrawStages";
import Card from "@/components/dashboard/ui/Card";
import Badge from "@/components/dashboard/ui/Badge";
import Button from "@/components/dashboard/ui/Button";
import EmptyState from "@/components/dashboard/ui/EmptyState";
import SegmentedControl from "@/components/dashboard/ui/SegmentedControl";
import StatTile from "@/components/dashboard/ui/StatTile";
import { BRAND, FRESH } from "@/components/dashboard/theme";

import { fetchDraws, fetchEntries } from "@/redux/rewards/rewardsSlice";
import { drawNextStep, drawStage, drawStatus, formatDrawDate } from "@/data/rewards";

const needsWinner = (draw) => draw.visible !== false && drawStage(draw) === 1;

function DrawCard({ draw, entries }) {
  const status = drawStatus(draw);
  const pick = needsWinner(draw);

  return (
    <li className={`flex flex-col overflow-hidden rounded-2xl border bg-white ${pick ? "border-amber-300" : "border-slate-100"}`}>
      <div className="flex items-start gap-3 bg-[linear-gradient(150deg,#FCEFD5,#FBE3B4)] p-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/70 text-[#B26F0E]">
          <Gift className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-slate-800">{draw.title}</p>
          <p className="truncate text-sm text-[#7A4D08]">{draw.prize}</p>
          <div className="mt-1.5">
            <Badge tone={status.tone} icon={draw.visible === false ? EyeOff : undefined}>{status.label}</Badge>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <DrawStages draw={draw} compact />

        <dl className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <dt className="flex items-center gap-1 text-xs text-slate-400"><Users className="h-3.5 w-3.5" /> Entries</dt>
            <dd className="mt-0.5 text-lg font-bold text-slate-800">{entries ? entries.length : "…"}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1 text-xs text-slate-400"><CalendarClock className="h-3.5 w-3.5" /> Closes</dt>
            <dd className="mt-0.5 font-semibold text-slate-700">{formatDrawDate(draw.closesAt)}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1 text-xs text-slate-400"><Trophy className="h-3.5 w-3.5" /> Winner</dt>
            <dd className="mt-0.5 font-semibold text-slate-700">{draw.winner?.name || "Not picked"}</dd>
          </div>
        </dl>

        <p className="text-sm text-slate-500">{drawNextStep(draw)}</p>

        <div className="mt-auto flex justify-end">
          {pick ? (
            <Button size="sm" icon={Dices} href={`/dashboard/rewards/${draw.id}`}>Pick the winner</Button>
          ) : (
            <Button variant="outline" size="sm" icon={ArrowRight} href={`/dashboard/rewards/${draw.id}`}>Manage</Button>
          )}
        </div>
      </div>
    </li>
  );
}

export default function RewardsPage() {
  const dispatch = useDispatch();
  const { draws, loaded, entries } = useSelector((s) => s.rewards);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    dispatch(fetchDraws());
  }, [dispatch]);

  // Each card shows how many have entered.
  const ids = draws.map((d) => d.id).join(",");
  useEffect(() => {
    if (ids) ids.split(",").forEach((id) => dispatch(fetchEntries(id)));
  }, [dispatch, ids]);

  const count = (key) => draws.filter((d) => drawStatus(d).key === key).length;
  const toPick = draws.filter(needsWinner);
  const finished = (d) => d.visible !== false && drawStage(d) >= 2;

  const rows = useMemo(() => {
    const matches = {
      all: () => true,
      open: (d) => drawStatus(d).key === "open",
      pick: needsWinner,
      done: finished,
      hidden: (d) => d.visible === false,
    };
    return draws.filter(matches[filter]);
  }, [draws, filter]);

  return (
    <DashboardLayout
      title="Reward draw"
      eyebrow="Storefront"
      actions={
        <Button size="sm" icon={Plus} href="/dashboard/rewards/new">
          New draw
        </Button>
      }
    >
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatTile icon={Gift} label="Open for entries" value={count("open")} accent={BRAND} />
        <StatTile icon={AlertTriangle} label="Winner to pick" value={toPick.length} accent="#F59E0B" />
        <StatTile icon={Trophy} label="Results out" value={count("results")} accent={FRESH} />
      </div>

      {toPick.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span className="min-w-0 flex-1">
            {toPick.length === 1 ? `"${toPick[0].title}" has closed and needs a winner.` : `${toPick.length} draws have closed and need a winner.`}
          </span>
          {toPick.length === 1 && (
            <Button size="sm" icon={Dices} href={`/dashboard/rewards/${toPick[0].id}`}>Pick the winner</Button>
          )}
        </div>
      )}

      <Card>
        <p className="text-sm text-slate-500">
          Draws are free for customers and separate from anything on sale. Never link an entry to a purchase: a draw people pay to enter is usually treated as a lottery.
        </p>

        {draws.length > 0 && (
          <div className="mt-4">
            <SegmentedControl
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: "All", count: draws.length },
                { value: "open", label: "Open", count: count("open") },
                { value: "pick", label: "Winner to pick", count: toPick.length },
                { value: "done", label: "Finished", count: draws.filter(finished).length },
                { value: "hidden", label: "Hidden", count: count("hidden") },
              ]}
            />
          </div>
        )}

        {!loaded ? (
          <p className="mt-5 text-sm text-slate-400" aria-busy="true">Loading…</p>
        ) : !draws.length ? (
          <div className="mt-5">
            <EmptyState icon={Gift} title="No draws yet" body="Create a free draw with a prize and dates. Customers enter from the Rewards page." />
            <div className="mt-4 flex justify-center">
              <Button icon={Plus} href="/dashboard/rewards/new">Create your first draw</Button>
            </div>
          </div>
        ) : !rows.length ? (
          <div className="mt-5">
            <EmptyState icon={Gift} title="Nothing here" body="Try another filter." />
          </div>
        ) : (
          <ul className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
            {rows.map((draw) => <DrawCard key={draw.id} draw={draw} entries={entries[draw.id]} />)}
          </ul>
        )}
      </Card>
    </DashboardLayout>
  );
}

RewardsPage.getLayout = dashboardGetLayout;
