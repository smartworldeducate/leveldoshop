import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { ExternalLink, Eye, Layers, RotateCcw, Save } from "lucide-react";

import DashboardLayout, { dashboardGetLayout } from "@/components/dashboard/DashboardLayout";
import Card, { CardHeader } from "@/components/dashboard/ui/Card";
import Button from "@/components/dashboard/ui/Button";
import Badge from "@/components/dashboard/ui/Badge";
import SegmentedControl from "@/components/dashboard/ui/SegmentedControl";
import Field, { Input } from "@/components/dashboard/ui/Field";
import { SwitchRow } from "@/components/dashboard/ui/Switch";

import {
  CONTACT_FIELDS,
  DEFAULT_SETTINGS,
  HOME_SECTIONS,
  TOGGLEABLE_PAGES,
  saveSettings,
} from "@/redux/settings/settingsSlice";

export default function SettingsPage() {
  const dispatch = useDispatch();
  const { values, saving, loading } = useSelector((s) => s.settings);
  const [draft, setDraft] = useState(values);
  const [tab, setTab] = useState("pages");

  // Adopt the loaded document once it arrives.
  useEffect(() => {
    setDraft(values);
  }, [values]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(values);

  const setPage = (key, on) => setDraft((d) => ({ ...d, pages: { ...d.pages, [key]: on } }));
  const setSection = (key, on) =>
    setDraft((d) => ({ ...d, sections: { ...d.sections, [key]: on } }));

  const save = async () => {
    try {
      await dispatch(saveSettings(draft)).unwrap();
      toast.success("Storefront updated");
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Could not save settings");
    }
  };

  const pagesOff = TOGGLEABLE_PAGES.filter((p) => draft.pages?.[p.key] === false).length;
  const sectionsOff = HOME_SECTIONS.filter((s) => draft.sections?.[s.key] === false).length;

  return (
    <DashboardLayout
      title="Storefront"
      eyebrow="Settings"
      actions={
        <>
          {dirty && (
            <Button
              variant="outline"
              size="sm"
              icon={RotateCcw}
              onClick={() => setDraft(values)}
              className="hidden sm:inline-flex"
            >
              Discard
            </Button>
          )}
          <Button size="sm" icon={Save} loading={saving} disabled={!dirty} onClick={save}>
            {dirty ? "Save changes" : "Saved"}
          </Button>
        </>
      }
    >
      <SegmentedControl
        value={tab}
        onChange={setTab}
        options={[
          { value: "pages", label: "Pages", count: TOGGLEABLE_PAGES.length - pagesOff },
          { value: "sections", label: "Home sections", count: HOME_SECTIONS.length - sectionsOff },
          { value: "contact", label: "Contact details" },
          { value: "store", label: "Store identity" },
        ]}
      />

      {tab === "pages" && (
        <Card>
          <CardHeader
            title="Pages"
            subtitle="Switch a page off and it disappears from the menu; anyone with the link sees a friendly notice"
            action={pagesOff > 0 ? <Badge tone="warning">{pagesOff} hidden</Badge> : null}
          />
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {TOGGLEABLE_PAGES.map((page) => (
              <SwitchRow
                key={page.key}
                title={page.label}
                note={page.note}
                disabled={loading}
                checked={draft.pages?.[page.key] !== false}
                onChange={(on) => setPage(page.key, on)}
              />
            ))}
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
            <Eye className="h-3.5 w-3.5" />
            Home, Shop and the basket cannot be switched off — a shop needs them.
          </p>
        </Card>
      )}

      {tab === "sections" && (
        <Card>
          <CardHeader
            title="Home page sections"
            subtitle="Each block on the storefront home page, in the order it renders"
            action={sectionsOff > 0 ? <Badge tone="warning">{sectionsOff} hidden</Badge> : null}
          />
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {HOME_SECTIONS.map((section) => (
              <SwitchRow
                key={section.key}
                title={section.label}
                note={section.note}
                disabled={loading}
                checked={draft.sections?.[section.key] !== false}
                onChange={(on) => setSection(section.key, on)}
              />
            ))}
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
            <Layers className="h-3.5 w-3.5" />
            The hero always shows. Aisles come from Categories — switch individual aisles off there.
          </p>
        </Card>
      )}

      {tab === "contact" && (
        <Card>
          <CardHeader
            title="Contact details"
            subtitle="Shown on the contact page and in the footer — leave a field blank to hide it"
          />
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {CONTACT_FIELDS.map((f) => (
              <Field key={f.key} label={f.label}>
                <Input
                  type={f.type || "text"}
                  value={draft.contact?.[f.key] || ""}
                  placeholder={f.placeholder}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      contact: { ...d.contact, [f.key]: e.target.value },
                    }))
                  }
                />
              </Field>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-400">
            The address also powers the map on the contact page — leave it blank and the map is
            simply not shown.
          </p>
        </Card>
      )}

      {tab === "store" && (
        <Card>
          <CardHeader title="Store identity" subtitle="Shown in the storefront hero and the browser tab" />
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Store name">
              <Input
                value={draft.storeName || ""}
                onChange={(e) => setDraft((d) => ({ ...d, storeName: e.target.value }))}
                placeholder={DEFAULT_SETTINGS.storeName}
              />
            </Field>
            <Field label="Hero badge" hint="The green pill above the headline">
              <Input
                value={draft.tagline || ""}
                onChange={(e) => setDraft((d) => ({ ...d, tagline: e.target.value }))}
                placeholder={DEFAULT_SETTINGS.tagline}
              />
            </Field>
          </div>
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[26px] bg-white p-5 shadow-[0_20px_45px_-30px_rgba(80,70,150,0.55)]">
        <div>
          <p className="font-semibold text-slate-800">
            {dirty ? "You have unsaved changes" : "See it as a shopper does"}
          </p>
          <p className="text-sm text-slate-400">Changes apply as soon as they are saved.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {dirty && (
            <Button variant="outline" size="sm" icon={RotateCcw} onClick={() => setDraft(values)}>
              Discard
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            icon={ExternalLink}
            href="/"
            target="_blank"
            rel="noreferrer"
          >
            Open storefront
          </Button>
          <Button size="sm" icon={Save} loading={saving} disabled={!dirty} onClick={save}>
            Save changes
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}

SettingsPage.getLayout = dashboardGetLayout;
