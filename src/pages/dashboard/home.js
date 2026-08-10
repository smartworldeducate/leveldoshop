import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";

import DashboardLayout, { dashboardGetLayout } from "@/components/dashboard/DashboardLayout";
import Card, { CardHeader } from "@/components/dashboard/ui/Card";
import Button from "@/components/dashboard/ui/Button";
import Badge from "@/components/dashboard/ui/Badge";
import SegmentedControl from "@/components/dashboard/ui/SegmentedControl";
import Field, { Input, Select, Textarea } from "@/components/dashboard/ui/Field";
import { SwitchRow } from "@/components/dashboard/ui/Switch";
import ImageUploader from "@/components/dashboard/ImageUploader";

import { saveSettings } from "@/redux/settings/settingsSlice";
import {
  BLANK,
  DEFAULT_HOME,
  HOME_ICONS,
  MOSAIC_VARIANTS,
  withHomeDefaults,
} from "@/data/home";
import { uploadToCloudinary } from "@/lib/cloudinary";

/** Sections whose heading copy is editable, labelled as on the storefront. */
const HEADING_KEYS = [
  { key: "aisles", label: "Explore our collections" },
  { key: "deals", label: "Deals rail" },
  { key: "fresh", label: "Fresh in today" },
  { key: "steps", label: "How it works" },
  { key: "everything", label: "Popular in store" },
  { key: "blog", label: "From the blog" },
];

const uid = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;

/* ------------------------------------------------------------------ */
/* small editors                                                       */
/* ------------------------------------------------------------------ */

/** Icon dropdown with a live preview of the glyph beside it. */
function IconPicker({ value, onChange, label = "Icon" }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EEF2FA] text-xl text-[#4267B2]">
          <i className={value || "bx bx-basket"}></i>
        </span>
        <Select value={value || ""} onChange={(e) => onChange(e.target.value)}>
          {!HOME_ICONS.includes(value) && value && <option value={value}>{value}</option>}
          {HOME_ICONS.map((icon) => (
            <option key={icon} value={icon}>
              {icon.replace("bx bx-", "")}
            </option>
          ))}
        </Select>
      </div>
    </Field>
  );
}

/** One picture, stored as a Cloudinary URL. The File waits on `_file`. */
function SingleImage({ item, onChange, label = "Picture", hint }) {
  // Stable array identities: ImageUploader builds its object URLs from these,
  // and a fresh array on every keystroke would recreate the preview each time.
  const images = useMemo(() => (item.image ? [item.image] : []), [item.image]);
  const files = useMemo(() => (item._file ? [item._file] : []), [item._file]);

  return (
    <div className="sm:col-span-2">
      <ImageUploader
        label={label}
        images={images}
        files={files}
        onChange={({ images, files }) =>
          onChange({ ...item, image: images[0] || "", _file: files[files.length - 1] || null })
        }
      />
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

/** A removable, re-orderable block in a repeatable list. */
function ListItem({ index, total, title, onMove, onRemove, canRemove = true, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-slate-700">{title}</p>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            icon={ArrowUp}
            disabled={index === 0}
            onClick={() => onMove(index, -1)}
            aria-label="Move up"
          />
          <Button
            variant="ghost"
            size="sm"
            icon={ArrowDown}
            disabled={index === total - 1}
            onClick={() => onMove(index, 1)}
            aria-label="Move down"
          />
          {canRemove && (
            <Button
              variant="ghost"
              size="sm"
              icon={Trash2}
              onClick={() => onRemove(index)}
              aria-label="Remove"
            />
          )}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* page                                                                */
/* ------------------------------------------------------------------ */

export default function HomeContentPage() {
  const dispatch = useDispatch();
  const { values, saving } = useSelector((s) => s.settings);
  const [draft, setDraft] = useState(() => withHomeDefaults(values.home));
  const [tab, setTab] = useState("hero");
  const [uploading, setUploading] = useState(false);

  // Adopt the loaded document once it arrives.
  useEffect(() => {
    setDraft(withHomeDefaults(values.home));
  }, [values.home]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(withHomeDefaults(values.home));

  // ---- draft helpers ----
  const setIn = (key, patch) => setDraft((d) => ({ ...d, [key]: { ...d[key], ...patch } }));

  const setList = (path, next) =>
    setDraft((d) => {
      if (path === "promises" || path === "steps") return { ...d, [path]: next };
      if (path === "slides") return { ...d, hero: { ...d.hero, slides: next } };
      if (path === "tiles") return { ...d, mosaic: { ...d.mosaic, tiles: next } };
      if (path === "points") return { ...d, rewards: { ...d.rewards, points: next } };
      return d;
    });

  const listOf = (path) =>
    path === "slides"
      ? draft.hero.slides
      : path === "tiles"
      ? draft.mosaic.tiles
      : path === "points"
      ? draft.rewards.points
      : draft[path];

  const patchItem = (path, index, patch) =>
    setList(
      path,
      listOf(path).map((item, i) => (i === index ? { ...item, ...patch } : item))
    );

  const addItem = (path, blank, prefix) =>
    setList(path, [...listOf(path), { ...blank, id: uid(prefix) }]);

  const removeItem = (path, index) =>
    setList(
      path,
      listOf(path).filter((_, i) => i !== index)
    );

  // Swap with the neighbour — the list is short enough that drag-and-drop would
  // be more machinery than it is worth.
  const moveItem = (path, index, delta) => {
    const next = [...listOf(path)];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setList(path, next);
  };

  const setHeading = (key, patch) =>
    setDraft((d) => ({
      ...d,
      headings: { ...d.headings, [key]: { ...d.headings[key], ...patch } },
    }));

  /**
   * Upload every freshly picked picture, then write the document. Uploading
   * first means a failed upload aborts the save instead of storing a slide
   * that points at nothing.
   */
  const save = async () => {
    try {
      setUploading(true);

      const resolve = async (items) =>
        Promise.all(
          items.map(async ({ _file, ...item }) => {
            if (!_file) return item;
            const url = await uploadToCloudinary(_file);
            if (!url) throw new Error("An image failed to upload — check your connection");
            return { ...item, image: url };
          })
        );

      const home = {
        ...draft,
        hero: { ...draft.hero, slides: await resolve(draft.hero.slides) },
        mosaic: { ...draft.mosaic, tiles: await resolve(draft.mosaic.tiles) },
      };

      await dispatch(saveSettings({ ...values, home })).unwrap();
      toast.success("Home page updated");
    } catch (err) {
      toast.error(err?.message || (typeof err === "string" ? err : "Could not save the home page"));
    } finally {
      setUploading(false);
    }
  };

  const resetTab = () => {
    const fresh = DEFAULT_HOME;
    if (tab === "hero") setDraft((d) => ({ ...d, hero: fresh.hero }));
    if (tab === "promises") setDraft((d) => ({ ...d, promises: fresh.promises }));
    if (tab === "headings") setDraft((d) => ({ ...d, headings: fresh.headings }));
    if (tab === "offers") setDraft((d) => ({ ...d, mosaic: fresh.mosaic }));
    if (tab === "steps") setDraft((d) => ({ ...d, steps: fresh.steps }));
    if (tab === "rewards") setDraft((d) => ({ ...d, rewards: fresh.rewards, closer: fresh.closer }));
    toast("Reset to the shipped copy — save to keep it");
  };

  const sectionOff = (key) => values.sections?.[key] === false;

  return (
    <DashboardLayout
      title="Home page"
      eyebrow="Storefront"
      actions={
        <>
          <Button
            href="/"
            target="_blank"
            variant="outline"
            size="sm"
            icon={ExternalLink}
            className="hidden sm:inline-flex"
          >
            View
          </Button>
          {dirty && (
            <Button
              variant="outline"
              size="sm"
              icon={RotateCcw}
              onClick={() => setDraft(withHomeDefaults(values.home))}
            >
              Discard
            </Button>
          )}
          <Button
            size="sm"
            icon={Save}
            loading={saving || uploading}
            disabled={!dirty}
            onClick={save}
          >
            {dirty ? "Save changes" : "Saved"}
          </Button>
        </>
      }
    >
      <SegmentedControl
        value={tab}
        onChange={setTab}
        options={[
          { value: "hero", label: "Hero", count: draft.hero.slides.length },
          { value: "promises", label: "Promises", count: draft.promises.length },
          { value: "headings", label: "Section titles" },
          { value: "offers", label: "Offer tiles" },
          { value: "steps", label: "How it works", count: draft.steps.length },
          { value: "rewards", label: "Banner & closer" },
        ]}
      />

      <p className="text-xs text-slate-400">
        Leave any field blank to fall back to the shipped wording. Which blocks appear at all is
        set under <strong className="text-slate-500">Pages &amp; sections</strong>.
      </p>

      {/* ---------------- hero ---------------- */}
      {tab === "hero" && (
        <>
          <Card className="space-y-4">
            <CardHeader
              title="Hero slider"
              subtitle="The first thing a shopper sees. Slides rotate; one slide means no slider."
            />
            <SwitchRow
              title="Add a deal slide automatically"
              note="Puts the biggest real markdown first, and removes it when nothing is reduced"
              checked={draft.hero.autoDeal !== false}
              onChange={(on) => setIn("hero", { autoDeal: on })}
            />
            <Field label="Seconds per slide" hint="Between 3 and 30">
              <Input
                type="number"
                min={3}
                max={30}
                value={Math.round((draft.hero.autoplayMs || 7000) / 1000)}
                onChange={(e) =>
                  setIn("hero", {
                    autoplayMs: Math.min(30, Math.max(3, Number(e.target.value) || 7)) * 1000,
                  })
                }
              />
            </Field>
          </Card>

          <Card className="space-y-4">
            <CardHeader
              title="Slides"
              subtitle="Write {aisle} anywhere to drop in the name of your first aisle"
              action={
                <Button
                  size="sm"
                  variant="outline"
                  icon={Plus}
                  onClick={() => addItem("slides", BLANK.slide, "slide")}
                >
                  Add slide
                </Button>
              }
            />

            {draft.hero.slides.map((slide, i) => (
              <ListItem
                key={slide.id || i}
                index={i}
                total={draft.hero.slides.length}
                title={slide.display || slide.script || `Slide ${i + 1}`}
                onMove={(idx, d) => moveItem("slides", idx, d)}
                onRemove={(idx) => removeItem("slides", idx)}
              >
                <Field label="Kicker" hint="Small uppercase line above the headline">
                  <Input
                    value={slide.kicker || ""}
                    onChange={(e) => patchItem("slides", i, { kicker: e.target.value })}
                    placeholder="Limited time only"
                  />
                </Field>
                <Field label="Headline" hint="Large serif line — keep it short">
                  <Input
                    value={slide.display || ""}
                    onChange={(e) => patchItem("slides", i, { display: e.target.value })}
                    placeholder="Same day"
                  />
                </Field>
                <Field label="Sub-headline" span={2}>
                  <Input
                    value={slide.script || ""}
                    onChange={(e) => patchItem("slides", i, { script: e.target.value })}
                    placeholder="Picked this morning, on your table tonight"
                  />
                </Field>
                <Field label="Paragraph" span={2}>
                  <Textarea
                    rows={2}
                    value={slide.lead || ""}
                    onChange={(e) => patchItem("slides", i, { lead: e.target.value })}
                  />
                </Field>
                <Field label="Button label">
                  <Input
                    value={slide.ctaLabel || ""}
                    onChange={(e) => patchItem("slides", i, { ctaLabel: e.target.value })}
                    placeholder="Start shopping"
                  />
                </Field>
                <Field label="Button link" hint="/catalog, /deals, /catalog?category=bakery">
                  <Input
                    value={slide.ctaHref || ""}
                    onChange={(e) => patchItem("slides", i, { ctaHref: e.target.value })}
                    placeholder="/catalog"
                  />
                </Field>
                <div className="sm:col-span-2">
                  <SwitchRow
                    title="Show the same-day countdown"
                    note="Replaces the kicker with the time left to order, and hides itself after the cut-off"
                    checked={slide.countdown === true}
                    onChange={(on) => patchItem("slides", i, { countdown: on })}
                  />
                </div>
                <SingleImage
                  item={slide}
                  label="Slide picture"
                  hint="Optional. With no picture the slide shows a basket built from your own stock."
                  onChange={(next) => patchItem("slides", i, next)}
                />
              </ListItem>
            ))}
          </Card>
        </>
      )}

      {/* ---------------- promises ---------------- */}
      {tab === "promises" && (
        <Card className="space-y-4">
          <CardHeader
            title="Promise strip"
            subtitle="The white band that overlaps the hero. Four reads best; more will wrap."
            action={
              <div className="flex items-center gap-2">
                {sectionOff("promise") && <Badge tone="warning">Section hidden</Badge>}
                <Button
                  size="sm"
                  variant="outline"
                  icon={Plus}
                  onClick={() => addItem("promises", BLANK.promise, "promise")}
                >
                  Add
                </Button>
              </div>
            }
          />

          {draft.promises.map((item, i) => (
            <ListItem
              key={item.id || i}
              index={i}
              total={draft.promises.length}
              title={item.title || `Promise ${i + 1}`}
              onMove={(idx, d) => moveItem("promises", idx, d)}
              onRemove={(idx) => removeItem("promises", idx)}
            >
              <IconPicker
                value={item.icon}
                onChange={(icon) => patchItem("promises", i, { icon })}
              />
              <Field label="Title">
                <Input
                  value={item.title || ""}
                  onChange={(e) => patchItem("promises", i, { title: e.target.value })}
                  placeholder="Same-day delivery"
                />
              </Field>
              <Field label="Note">
                <Input
                  value={item.note || ""}
                  onChange={(e) => patchItem("promises", i, { note: e.target.value })}
                  placeholder="Order by 4pm, eat it tonight."
                />
              </Field>
              <Field label="Link" hint="Leave blank to show it as plain text">
                <Input
                  value={item.href || ""}
                  onChange={(e) => patchItem("promises", i, { href: e.target.value })}
                  placeholder="/policy?tab=delivery"
                />
              </Field>
            </ListItem>
          ))}
        </Card>
      )}

      {/* ---------------- headings ---------------- */}
      {tab === "headings" && (
        <Card className="space-y-4">
          <CardHeader
            title="Section titles"
            subtitle="The kicker, title and note above each shelf on the home page"
          />

          {HEADING_KEYS.map(({ key, label }) => (
            <div key={key} className="rounded-2xl border border-slate-200 p-4">
              <div className="mb-3 flex items-center gap-2">
                <p className="text-sm font-bold text-slate-700">{label}</p>
                {sectionOff(key) && <Badge tone="warning">Hidden</Badge>}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Kicker">
                  <Input
                    value={draft.headings[key]?.kicker || ""}
                    onChange={(e) => setHeading(key, { kicker: e.target.value })}
                    placeholder={DEFAULT_HOME.headings[key]?.kicker}
                  />
                </Field>
                <Field label="Title">
                  <Input
                    value={draft.headings[key]?.title || ""}
                    onChange={(e) => setHeading(key, { title: e.target.value })}
                    placeholder={DEFAULT_HOME.headings[key]?.title}
                  />
                </Field>
                <Field label="Note">
                  <Input
                    value={draft.headings[key]?.note || ""}
                    onChange={(e) => setHeading(key, { note: e.target.value })}
                    placeholder={DEFAULT_HOME.headings[key]?.note || "—"}
                  />
                </Field>
                <Field label="Link label">
                  <Input
                    value={draft.headings[key]?.linkLabel || ""}
                    onChange={(e) => setHeading(key, { linkLabel: e.target.value })}
                    placeholder={DEFAULT_HOME.headings[key]?.linkLabel || "See all"}
                  />
                </Field>
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* ---------------- offer tiles ---------------- */}
      {tab === "offers" && (
        <>
          <Card className="space-y-4">
            <CardHeader
              title="Offer mosaic"
              subtitle="The four-tile band under the aisles"
              action={sectionOff("offers") ? <Badge tone="warning">Section hidden</Badge> : null}
            />
            <SwitchRow
              title="Build the tiles from live stock"
              note="Deepest markdown, the deals shelf, a stocked aisle and the newest arrival — updated as stock changes"
              checked={draft.mosaic.auto !== false}
              onChange={(on) => setIn("mosaic", { auto: on })}
            />
          </Card>

          {draft.mosaic.auto === false && (
            <Card className="space-y-4">
              <CardHeader
                title="Tiles"
                subtitle="Each tile sits in a fixed slot; give two tiles the same slot and one will cover the other"
                action={
                  draft.mosaic.tiles.length < 4 ? (
                    <Button
                      size="sm"
                      variant="outline"
                      icon={Plus}
                      onClick={() =>
                        addItem(
                          "tiles",
                          { ...DEFAULT_HOME.mosaic.tiles[draft.mosaic.tiles.length] },
                          "tile"
                        )
                      }
                    >
                      Add tile
                    </Button>
                  ) : null
                }
              />

              {draft.mosaic.tiles.map((tile, i) => (
                <ListItem
                  key={tile.id || i}
                  index={i}
                  total={draft.mosaic.tiles.length}
                  title={tile.title || `Tile ${i + 1}`}
                  onMove={(idx, d) => moveItem("tiles", idx, d)}
                  onRemove={(idx) => removeItem("tiles", idx)}
                >
                  <Field label="Position">
                    <Select
                      value={tile.variant || "tall"}
                      onChange={(e) => patchItem("tiles", i, { variant: e.target.value })}
                    >
                      {MOSAIC_VARIANTS.map((v) => (
                        <option key={v.value} value={v.value}>
                          {v.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <IconPicker
                    label="Watermark icon"
                    value={tile.icon}
                    onChange={(icon) => patchItem("tiles", i, { icon })}
                  />
                  <Field label="Kicker">
                    <Input
                      value={tile.kicker || ""}
                      onChange={(e) => patchItem("tiles", i, { kicker: e.target.value })}
                      placeholder="Special deal"
                    />
                  </Field>
                  <Field label="Title">
                    <Input
                      value={tile.title || ""}
                      onChange={(e) => patchItem("tiles", i, { title: e.target.value })}
                      placeholder="Everything on the list"
                    />
                  </Field>
                  <Field label="Big line" hint="Optional — e.g. 20% or One">
                    <Input
                      value={tile.headline || ""}
                      onChange={(e) => patchItem("tiles", i, { headline: e.target.value })}
                    />
                  </Field>
                  <Field label="Big line suffix" hint="Small caps beside it — e.g. off">
                    <Input
                      value={tile.headlineNote || ""}
                      onChange={(e) => patchItem("tiles", i, { headlineNote: e.target.value })}
                    />
                  </Field>
                  <Field label="Link" span={2}>
                    <Input
                      value={tile.href || ""}
                      onChange={(e) => patchItem("tiles", i, { href: e.target.value })}
                      placeholder="/catalog?category=bakery"
                    />
                  </Field>
                  <SingleImage
                    item={tile}
                    label="Tile picture"
                    hint="Optional. Without one the tile shows the watermark icon."
                    onChange={(next) => patchItem("tiles", i, next)}
                  />
                </ListItem>
              ))}
            </Card>
          )}
        </>
      )}

      {/* ---------------- how it works ---------------- */}
      {tab === "steps" && (
        <Card className="space-y-4">
          <CardHeader
            title="How it works"
            subtitle="Write {cutoff} to drop in the same-day cut-off from Contact details"
            action={
              <Button
                size="sm"
                variant="outline"
                icon={Plus}
                onClick={() => addItem("steps", BLANK.step, "step")}
              >
                Add step
              </Button>
            }
          />

          {draft.steps.map((step, i) => (
            <ListItem
              key={step.id || i}
              index={i}
              total={draft.steps.length}
              title={step.title || `Step ${i + 1}`}
              onMove={(idx, d) => moveItem("steps", idx, d)}
              onRemove={(idx) => removeItem("steps", idx)}
            >
              <IconPicker value={step.icon} onChange={(icon) => patchItem("steps", i, { icon })} />
              <Field label="Title">
                <Input
                  value={step.title || ""}
                  onChange={(e) => patchItem("steps", i, { title: e.target.value })}
                  placeholder="Fill your basket"
                />
              </Field>
              <Field label="Body" span={2}>
                <Textarea
                  rows={2}
                  value={step.body || ""}
                  onChange={(e) => patchItem("steps", i, { body: e.target.value })}
                />
              </Field>
            </ListItem>
          ))}
        </Card>
      )}

      {/* ---------------- rewards + closer ---------------- */}
      {tab === "rewards" && (
        <>
          <Card className="space-y-4">
            <CardHeader
              title="Rewards banner"
              subtitle="The blue band near the bottom of the page"
              action={sectionOff("promo") ? <Badge tone="warning">Section hidden</Badge> : null}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Kicker">
                <Input
                  value={draft.rewards.kicker || ""}
                  onChange={(e) => setIn("rewards", { kicker: e.target.value })}
                />
              </Field>
              <Field label="Heading">
                <Input
                  value={draft.rewards.title || ""}
                  onChange={(e) => setIn("rewards", { title: e.target.value })}
                />
              </Field>
              <Field label="Paragraph" span={2}>
                <Textarea
                  rows={2}
                  value={draft.rewards.body || ""}
                  onChange={(e) => setIn("rewards", { body: e.target.value })}
                />
              </Field>
              <Field label="Button label">
                <Input
                  value={draft.rewards.ctaLabel || ""}
                  onChange={(e) => setIn("rewards", { ctaLabel: e.target.value })}
                />
              </Field>
              <Field label="Button link">
                <Input
                  value={draft.rewards.ctaHref || ""}
                  onChange={(e) => setIn("rewards", { ctaHref: e.target.value })}
                />
              </Field>
              <Field label="Secondary link label" hint="Blank hides the link">
                <Input
                  value={draft.rewards.linkLabel || ""}
                  onChange={(e) => setIn("rewards", { linkLabel: e.target.value })}
                />
              </Field>
              <Field label="Secondary link">
                <Input
                  value={draft.rewards.linkHref || ""}
                  onChange={(e) => setIn("rewards", { linkHref: e.target.value })}
                />
              </Field>
            </div>
          </Card>

          <Card className="space-y-4">
            <CardHeader
              title="Member benefits"
              subtitle="Listed down the right of the banner"
              action={
                <Button
                  size="sm"
                  variant="outline"
                  icon={Plus}
                  onClick={() => addItem("points", BLANK.point, "point")}
                >
                  Add benefit
                </Button>
              }
            />

            {draft.rewards.points.map((point, i) => (
              <ListItem
                key={point.id || i}
                index={i}
                total={draft.rewards.points.length}
                title={point.title || `Benefit ${i + 1}`}
                onMove={(idx, d) => moveItem("points", idx, d)}
                onRemove={(idx) => removeItem("points", idx)}
              >
                <IconPicker
                  value={point.icon}
                  onChange={(icon) => patchItem("points", i, { icon })}
                />
                <Field label="Title">
                  <Input
                    value={point.title || ""}
                    onChange={(e) => patchItem("points", i, { title: e.target.value })}
                  />
                </Field>
                <Field label="Note" span={2}>
                  <Input
                    value={point.note || ""}
                    onChange={(e) => patchItem("points", i, { note: e.target.value })}
                  />
                </Field>
              </ListItem>
            ))}
          </Card>

          <Card className="space-y-4">
            <CardHeader
              title="Closing invitation"
              subtitle="The last block on the page — always shown"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Heading">
                <Input
                  value={draft.closer.title || ""}
                  onChange={(e) => setIn("closer", { title: e.target.value })}
                />
              </Field>
              <Field label="Paragraph" hint="Blank counts your products automatically">
                <Input
                  value={draft.closer.body || ""}
                  onChange={(e) => setIn("closer", { body: e.target.value })}
                />
              </Field>
              <Field label="Primary button">
                <Input
                  value={draft.closer.primaryLabel || ""}
                  onChange={(e) => setIn("closer", { primaryLabel: e.target.value })}
                />
              </Field>
              <Field label="Primary link">
                <Input
                  value={draft.closer.primaryHref || ""}
                  onChange={(e) => setIn("closer", { primaryHref: e.target.value })}
                />
              </Field>
              <Field label="Secondary button" hint="Blank hides it">
                <Input
                  value={draft.closer.ghostLabel || ""}
                  onChange={(e) => setIn("closer", { ghostLabel: e.target.value })}
                />
              </Field>
              <Field label="Secondary link">
                <Input
                  value={draft.closer.ghostHref || ""}
                  onChange={(e) => setIn("closer", { ghostHref: e.target.value })}
                />
              </Field>
            </div>
          </Card>
        </>
      )}

      <div className="flex justify-end">
        <Button variant="ghost" size="sm" icon={RotateCcw} onClick={resetTab}>
          Reset this tab to the shipped copy
        </Button>
      </div>
    </DashboardLayout>
  );
}

HomeContentPage.getLayout = dashboardGetLayout;
