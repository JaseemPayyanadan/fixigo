// src/app/(dashboard)/purchases/requests/page.tsx
import PurchaseTabs from "@/modules/purchase/PurchaseTabs";

export default function PurchaseRequestsPage() {
  return (
    <div className="space-y-6">
      <PurchaseTabs />
      <p className="text-sm text-gray-500">Purchase requests coming soon.</p>
    </div>
  );
}
