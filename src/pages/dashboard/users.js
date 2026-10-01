import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Crown, Eye, EyeOff, Lock, ShieldCheck, Trash2, UserMinus, UserPlus, Users } from "lucide-react";

import DashboardLayout, { dashboardGetLayout } from "@/components/dashboard/DashboardLayout";
import Card, { CardHeader } from "@/components/dashboard/ui/Card";
import Button from "@/components/dashboard/ui/Button";
import Badge from "@/components/dashboard/ui/Badge";
import DataTable from "@/components/dashboard/ui/DataTable";
import EmptyState from "@/components/dashboard/ui/EmptyState";
import Modal from "@/components/dashboard/ui/Modal";
import ConfirmDialog from "@/components/dashboard/ui/ConfirmDialog";
import Field, { Input } from "@/components/dashboard/ui/Field";

import { useAuth } from "@/context/AuthContext";
import {
  OWNER_EMAILS,
  addDashboardUser,
  isAdmin,
  listDashboardUsers,
  removeDashboardUser,
} from "@/lib/admins";
import { formatDate } from "@/lib/analytics";

const EMPTY_FORM = { name: "", email: "", password: "" };

const AUTH_ERRORS = {
  "auth/invalid-email": "That email address doesn't look right.",
  "auth/weak-password": "Password must be at least 6 characters.",
  "auth/operation-not-allowed": "Email/password sign-in is turned off in Firebase.",
  "auth/too-many-requests": "Too many attempts — wait a minute and try again.",
};

const toDate = (v) => (v?.toDate ? v.toDate() : v instanceof Date ? v : null);

const initials = (row) =>
  (row.name || row.email)
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export default function DashboardUsersPage() {
  const { user } = useAuth();
  const owner = isAdmin(user);

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [removing, setRemoving] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setMembers(await listDashboardUsers());
    } catch (err) {
      toast.error(err.message || "Couldn't load dashboard users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (owner) load();
  }, [owner, load]);

  // Owners first (fixed, can't be removed), then everyone added here.
  const rows = useMemo(
    () => [
      ...OWNER_EMAILS.map((email) => ({ id: email, email, name: "", role: "owner" })),
      ...members
        .filter((m) => !OWNER_EMAILS.includes(m.email))
        .map((m) => ({ ...m, role: "user" })),
    ],
    [members]
  );

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setShowPassword(false);
    setAdding(true);
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = () => {
    const next = {};
    const email = form.email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) next.email = "Enter a valid email address";
    else if (rows.some((r) => r.email === email)) next.email = "This email already has access";
    if (form.password.length < 6) next.password = "At least 6 characters";
    setErrors(next);
    return !Object.keys(next).length;
  };

  const submit = async (e) => {
    e?.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const added = await addDashboardUser(form, user?.email);
      setMembers((list) => [...list.filter((m) => m.id !== added.id), added]);
      toast.success(`${added.email} can now sign in to the dashboard`);
      setAdding(false);
    } catch (err) {
      const message = AUTH_ERRORS[err.code] || err.message || "Couldn't add user";
      if (err.code === "auth/existing-account" || err.code === "auth/invalid-email") {
        setErrors({ email: message });
      } else if (err.code === "auth/weak-password") {
        setErrors({ password: message });
      } else {
        toast.error(message);
      }
    } finally {
      setSaving(false);
    }
  };

  const confirmRemove = async () => {
    if (!removing) return;
    setDeleting(true);
    try {
      await removeDashboardUser(removing.email);
      setMembers((list) => list.filter((m) => m.email !== removing.email));
      toast.success(`${removing.email} removed from the dashboard`);
      setRemoving(null);
    } catch (err) {
      toast.error(err.message || "Couldn't remove user");
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: "email",
      label: "User",
      sortable: true,
      render: (r) => (
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E4ECFA] text-xs font-bold text-[#4267B2]">
            {initials(r)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-800">{r.name || r.email}</p>
            {r.name && <p className="truncate text-xs text-slate-400">{r.email}</p>}
          </div>
        </div>
      ),
    },
    {
      key: "role",
      label: "Role",
      render: (r) =>
        r.role === "owner" ? (
          <Badge tone="brand" icon={Crown}>Owner</Badge>
        ) : (
          <Badge tone="success" icon={ShieldCheck}>Dashboard user</Badge>
        ),
    },
    {
      key: "createdAt",
      label: "Added",
      sortable: true,
      sortValue: (r) => toDate(r.createdAt)?.getTime() || 0,
      render: (r) => (
        <span className="text-slate-500">
          {r.role === "owner" ? "—" : toDate(r.createdAt) ? formatDate(toDate(r.createdAt)) : "—"}
          {r.addedBy && <span className="block text-xs text-slate-400">by {r.addedBy}</span>}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (r) =>
        r.role === "owner" ? (
          <span className="inline-flex items-center gap-1 text-xs text-slate-400">
            <Lock className="h-3.5 w-3.5" /> Always has access
          </span>
        ) : (
          <Button variant="softDanger" size="sm" icon={Trash2} onClick={() => setRemoving(r)}>
            Remove
          </Button>
        ),
    },
  ];

  if (user && !owner) {
    return (
      <DashboardLayout title="Dashboard users" eyebrow="Access">
        <Card>
          <EmptyState
            icon={Lock}
            title="Owners only"
            body="Only a store owner can add or remove dashboard users."
          />
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Dashboard users"
      eyebrow="Access"
      actions={
        <Button size="sm" icon={UserPlus} onClick={openAdd}>
          Add user
        </Button>
      }
    >
      <Card>
        <CardHeader
          title="Who can open the dashboard"
          subtitle="People you add here sign in at /login with the email and password you set."
        />
        <div className="mt-5">
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(r) => r.email}
            minWidth={720}
            loading={loading}
            empty={<EmptyState icon={Users} title="No dashboard users yet" />}
          />
        </div>
      </Card>

      <Modal
        open={adding}
        onClose={() => !saving && setAdding(false)}
        size="sm"
        title="Add dashboard user"
        subtitle="They'll be able to sign in and manage the store."
        footer={
          <>
            <Button variant="outline" onClick={() => setAdding(false)} disabled={saving}>
              Cancel
            </Button>
            <Button icon={UserPlus} loading={saving} onClick={submit}>
              Add user
            </Button>
          </>
        }
      >
        <form onSubmit={submit} className="grid grid-cols-1 gap-4" noValidate>
          <Field label="Name" hint="Optional — shown in this list">
            <Input value={form.name} onChange={set("name")} placeholder="Ayesha Khan" />
          </Field>
          <Field label="Email" required error={errors.email}>
            <Input
              type="email"
              value={form.email}
              onChange={set("email")}
              placeholder="staff@example.com"
              autoComplete="off"
            />
          </Field>
          <Field label="Password" required error={errors.password} hint="At least 6 characters. Share it with them securely.">
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={set("password")}
                autoComplete="new-password"
                className="pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#4267B2]"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>
          {/* lets Enter submit from any field */}
          <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        onConfirm={confirmRemove}
        loading={deleting}
        icon={UserMinus}
        title="Remove dashboard user?"
        preview={removing && { title: removing.name || removing.email, meta: removing.name ? removing.email : "Dashboard user" }}
        consequences={[
          "They lose dashboard access the next time they open or reload it.",
          "Their sign-in account stays, so they can still shop on the store.",
          "You can add them again later with the same email and password.",
        ]}
        confirmLabel="Remove access"
        irreversible={false}
      />
    </DashboardLayout>
  );
}

DashboardUsersPage.getLayout = dashboardGetLayout;
