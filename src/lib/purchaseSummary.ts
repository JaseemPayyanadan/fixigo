import { isSameDay, isSameMonth } from "@/lib/dateUtils";
import { roundMoney } from "@/lib/purchaseTotals";
import type { Purchase } from "@/types/purchase";

export interface PurchaseSummary {
  todayTotal: number;
  todayCount: number;
  monthTotal: number;
  pendingPayments: number;
  pendingBillCount: number;
  activeSupplierCount: number;
  itemsPurchasedToday: number;
}

/**
 * The five Spare Purchases summary cards. Low Stock Alerts is deliberately
 * absent — it needs stock levels this slice does not have, and a card that can
 * only ever render 0 is worse than no card.
 *
 * Cancelled purchases are excluded from every figure.
 */
export function summarizePurchases(
  purchases: Purchase[],
  activeSupplierCount: number,
  now: Date
): PurchaseSummary {
  const active = purchases.filter((purchase) => purchase.status !== "cancelled");
  const today = active.filter((purchase) => isSameDay(purchase.purchaseDate, now));
  const pending = active.filter((purchase) => purchase.balance > 0);

  return {
    todayTotal: roundMoney(today.reduce((sum, p) => sum + p.grandTotal, 0)),
    todayCount: today.length,
    monthTotal: roundMoney(
      active
        .filter((purchase) => isSameMonth(purchase.purchaseDate, now))
        .reduce((sum, p) => sum + p.grandTotal, 0)
    ),
    pendingPayments: roundMoney(pending.reduce((sum, p) => sum + p.balance, 0)),
    pendingBillCount: pending.length,
    activeSupplierCount,
    itemsPurchasedToday: today.reduce(
      (sum, purchase) => sum + purchase.items.reduce((count, item) => count + item.quantity, 0),
      0
    ),
  };
}
