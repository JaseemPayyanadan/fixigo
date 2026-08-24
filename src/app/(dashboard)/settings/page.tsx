"use client";

import React from "react";

import { Cog6ToothIcon, PencilIcon } from "@heroicons/react/24/outline";

import { Calendar, Download, Eye } from "lucide-react";

import PermissionGuard from "@/components/auth/PermissionGuard";
import BillingHistoryModal from "@/components/settings/BillingHistoryModal";
import { PageFallback } from "@/components/ui/PageSkeleton";
import { usePermissions } from "@/hooks/usePermissions";
import { billingReceiptFileName, buildBillingReceiptPdf } from "@/lib/billingPdf";
import type { Plan } from "@/types/plan";
import type { BillingInvoice } from "@/types/billing";

interface ShopSettings {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  gstNumber?: string;
  businessType?: string;
  description?: string;
  notificationsEnabled: boolean;
  activePlanId?: string;
}

interface ProfileDraft {
  name: string;
  address: string;
  phone: string;
  email: string;
  gstNumber: string;
  businessType: string;
  description: string;
}

function toProfileDraft(shop: ShopSettings): ProfileDraft {
  return {
    name: shop.name,
    address: shop.address,
    phone: shop.phone,
    email: shop.email,
    gstNumber: shop.gstNumber ?? "",
    businessType: shop.businessType ?? "",
    description: shop.description ?? "",
  };
}

async function readError(response: Response): Promise<string> {
  try {
    const body = await response.json();
    return body.error || "Request failed";
  } catch {
    return `Request failed (${response.status})`;
  }
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

function DetailRow({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-gray-900">{value || "—"}</dd>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

function EditField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

function ProfileCard({ shop, canEdit, onSaved }: { shop: ShopSettings; canEdit: boolean; onSaved: (shop: ShopSettings) => void }) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState<ProfileDraft>(() => toProfileDraft(shop));
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const startEditing = () => {
    setDraft(toProfileDraft(shop));
    setError(null);
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setError(null);
  };

  const updateDraft = <K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/shop", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!response.ok) throw new Error(await readError(response));
      const body = await response.json();
      onSaved(body.shop);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xl font-semibold text-blue-700">
            {initialsOf(shop.name)}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{shop.name || "Unnamed shop"}</h2>
            {shop.businessType && <p className="text-sm text-gray-500">{shop.businessType}</p>}
          </div>
        </div>

        {canEdit && !editing && (
          <button
            type="button"
            onClick={startEditing}
            aria-label="Edit shop profile"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {editing ? (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <EditField label="Shop name">
              <input className={inputClass} value={draft.name} onChange={(e) => updateDraft("name", e.target.value)} />
            </EditField>
            <EditField label="Business type">
              <input
                className={inputClass}
                value={draft.businessType}
                onChange={(e) => updateDraft("businessType", e.target.value)}
                placeholder="e.g. Mobile repair"
              />
            </EditField>
            <EditField label="Phone">
              <input className={inputClass} value={draft.phone} onChange={(e) => updateDraft("phone", e.target.value)} />
            </EditField>
            <EditField label="Email">
              <input type="email" className={inputClass} value={draft.email} onChange={(e) => updateDraft("email", e.target.value)} />
            </EditField>
            <EditField label="GST number">
              <input className={inputClass} value={draft.gstNumber} onChange={(e) => updateDraft("gstNumber", e.target.value)} />
            </EditField>
            <div className="sm:col-span-2">
              <EditField label="Address">
                <input className={inputClass} value={draft.address} onChange={(e) => updateDraft("address", e.target.value)} />
              </EditField>
            </div>
            <div className="sm:col-span-2">
              <EditField label="Description">
                <textarea className={inputClass} rows={3} value={draft.description} onChange={(e) => updateDraft("description", e.target.value)} />
              </EditField>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              onClick={cancelEditing}
              disabled={saving}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            {error && <span className="text-sm text-red-700">{error}</span>}
          </div>
        </div>
      ) : (
        <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DetailRow label="Phone" value={shop.phone} />
          <DetailRow label="Email" value={shop.email} />
          <DetailRow label="GST number" value={shop.gstNumber ?? ""} />
          <DetailRow label="Address" value={shop.address} wide />
          {shop.description && <DetailRow label="Description" value={shop.description} wide />}
        </dl>
      )}
    </section>
  );
}

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function formatBillDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * The active plan and its billing history are real (shop.activePlanId →
 * plans collection, and billingInvoices scoped to the shop). No payment
 * gateway integration exists yet — no stored card — so that part stays an
 * honest empty state.
 */
function BillingCard({
  shop,
  plan,
  planLoading,
  invoices,
  invoicesLoading,
  invoicesError,
}: {
  shop: ShopSettings;
  plan: Plan | null;
  planLoading: boolean;
  invoices: BillingInvoice[];
  invoicesLoading: boolean;
  invoicesError: string | null;
}) {
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const lastBill = invoices[0] ?? null;

  const downloadPdf = (invoice: BillingInvoice) => {
    const doc = buildBillingReceiptPdf(invoice, shop);
    doc.save(billingReceiptFileName());
  };

  return (
    <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Billing and payment</h2>

      <div className="flex items-start gap-3 text-sm text-gray-700">
        <Calendar className="h-5 w-5 shrink-0 text-gray-400" aria-hidden="true" />
        {planLoading ? (
          <p className="text-gray-500">Loading plan…</p>
        ) : plan ? (
          <div>
            <p className="font-medium text-gray-900">
              {plan.name} plan
              <span className="ml-2 text-xs font-medium uppercase tracking-wide text-blue-600">{plan.tier}</span>
            </p>
            <p className="text-gray-500">
              {plan.priceMonthly > 0 ? `${currencyFormatter.format(plan.priceMonthly)}/month` : "Free"}
            </p>
            {plan.description && <p className="mt-1 text-gray-500">{plan.description}</p>}
          </div>
        ) : (
          <p className="text-gray-500">No active plan</p>
        )}
      </div>

      <div className="mt-6 border-t border-gray-100 pt-4">
        <h3 className="text-xs font-medium uppercase tracking-wide text-gray-400">Last generated bill</h3>
        {invoicesLoading ? (
          <p className="mt-2 text-sm text-gray-500">Loading…</p>
        ) : invoicesError ? (
          <p className="mt-2 text-sm text-red-700">{invoicesError}</p>
        ) : lastBill ? (
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="text-sm">
              <p className="font-medium text-gray-900">
                {lastBill.planName} — {currencyFormatter.format(lastBill.amount)}
              </p>
              <p className="text-gray-500">{formatBillDate(lastBill.billingDate)}</p>
            </div>
            <div className="flex items-center gap-1">
              <a
                href={`/settings/billing/receipt?id=${encodeURIComponent(lastBill.id)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                aria-label="View last bill"
                title="View"
              >
                <Eye className="h-4 w-4" />
              </a>
              <button
                type="button"
                onClick={() => downloadPdf(lastBill)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                aria-label="Download last bill"
                title="Download"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-gray-500">No bills have been generated yet.</p>
        )}

        <button
          type="button"
          onClick={() => setHistoryOpen(true)}
          className="mt-4 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          View billing history
        </button>
      </div>

      <BillingHistoryModal
        open={historyOpen}
        invoices={invoices}
        loading={invoicesLoading}
        error={invoicesError}
        shop={shop}
        onClose={() => setHistoryOpen(false)}
      />
    </section>
  );
}

function SettingsContent() {
  const { canManageSetting } = usePermissions();
  const canEdit = canManageSetting();

  const [shop, setShop] = React.useState<ShopSettings | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [notificationsSaving, setNotificationsSaving] = React.useState(false);
  const [notificationsError, setNotificationsError] = React.useState<string | null>(null);
  const [activePlan, setActivePlan] = React.useState<Plan | null>(null);
  const [planLoading, setPlanLoading] = React.useState(true);
  const [invoices, setInvoices] = React.useState<BillingInvoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = React.useState(true);
  const [invoicesError, setInvoicesError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch("/api/shop");
      if (!response.ok) throw new Error(await readError(response));
      const body = await response.json();
      setShop(body.shop);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load shop settings");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    if (!shop?.activePlanId) {
      setActivePlan(null);
      setPlanLoading(false);
      return;
    }
    let cancelled = false;
    setPlanLoading(true);
    (async () => {
      try {
        const response = await fetch("/api/plans");
        if (!response.ok) throw new Error(await readError(response));
        const body = await response.json();
        const plans: Plan[] = Array.isArray(body?.plans) ? body.plans : [];
        if (!cancelled) setActivePlan(plans.find((p) => p.id === shop.activePlanId) ?? null);
      } catch {
        if (!cancelled) setActivePlan(null);
      } finally {
        if (!cancelled) setPlanLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [shop?.activePlanId]);

  React.useEffect(() => {
    if (!shop?.id) return;
    let cancelled = false;
    setInvoicesLoading(true);
    setInvoicesError(null);
    (async () => {
      try {
        const response = await fetch("/api/billing");
        if (!response.ok) throw new Error(await readError(response));
        const body = await response.json();
        const raw: Array<Record<string, unknown>> = Array.isArray(body?.invoices) ? body.invoices : [];
        const parsed: BillingInvoice[] = raw.map((item) => ({
          id: item.id as string,
          shopId: item.shopId as string,
          planId: item.planId as string,
          planName: (item.planName as string) || "",
          planTier: (item.planTier as string) || "",
          amount: (item.amount as number) || 0,
          currency: (item.currency as string) || "INR",
          periodStart: new Date(item.periodStart as string),
          periodEnd: new Date(item.periodEnd as string),
          billingDate: new Date(item.billingDate as string),
          status: (item.status as BillingInvoice["status"]) || "paid",
          createdAt: new Date(item.createdAt as string),
        }));
        if (!cancelled) setInvoices(parsed);
      } catch (err) {
        if (!cancelled) setInvoicesError(err instanceof Error ? err.message : "Failed to load billing history");
      } finally {
        if (!cancelled) setInvoicesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [shop?.id]);

  const toggleNotifications = async (enabled: boolean) => {
    if (!shop) return;
    setShop({ ...shop, notificationsEnabled: enabled });
    setNotificationsSaving(true);
    setNotificationsError(null);
    try {
      const response = await fetch("/api/shop", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationsEnabled: enabled }),
      });
      if (!response.ok) throw new Error(await readError(response));
      const body = await response.json();
      setShop(body.shop);
    } catch (err) {
      setShop({ ...shop, notificationsEnabled: !enabled });
      setNotificationsError(err instanceof Error ? err.message : "Failed to save notification preference");
    } finally {
      setNotificationsSaving(false);
    }
  };

  if (loading) return <PageFallback label="Loading settings" />;

  if (loadError || !shop) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm mx-auto">
          <p className="text-sm font-medium text-red-800">{loadError || "Could not load shop settings."}</p>
          <button onClick={() => void load()} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center gap-3">
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
            <Cog6ToothIcon className="w-6 h-6 text-gray-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600">Configure your shop profile and notification preferences</p>
          </div>
        </div>

        {!canEdit && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            You can view these settings, but only a shop admin can change them.
          </div>
        )}

        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ProfileCard shop={shop} canEdit={canEdit} onSaved={setShop} />
            <BillingCard
              shop={shop}
              plan={activePlan}
              planLoading={planLoading}
              invoices={invoices}
              invoicesLoading={invoicesLoading}
              invoicesError={invoicesError}
            />
          </div>

          {canEdit && (
            <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Notifications</h2>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={shop.notificationsEnabled}
                  disabled={notificationsSaving}
                  onChange={(e) => void toggleNotifications(e.target.checked)}
                />
                Send notifications for new services, purchase approvals, and other shop activity
              </label>
              {notificationsError && <p className="mt-2 text-sm text-red-700">{notificationsError}</p>}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <PermissionGuard permissions={["setting:read"]}>
      <SettingsContent />
    </PermissionGuard>
  );
}
