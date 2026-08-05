export type SupplierStatus = "active" | "inactive";

export interface Supplier {
  id: string;
  shopId: string;
  name: string;
  contactPerson: string;
  phone: string;
  email?: string;
  gstNumber?: string;
  address?: string;
  status: SupplierStatus;
  /**
   * Denormalized running totals. Written ONLY by purchaseRepo/supplierRepo
   * inside transactions — nothing else may touch them, or they drift.
   */
  totalPurchased: number;
  totalPaid: number;
  outstanding: number;
  lastPurchaseAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export type PurchasePaymentMethod = "cash" | "upi" | "bank";

/**
 * "Credit" is deliberately absent: on the Add Purchase form it means no money
 * moved, so it produces zero payments rather than a payment with this method.
 */
export interface PurchasePayment {
  id: string;
  amount: number;
  method: PurchasePaymentMethod;
  paidAt: Date;
  reference?: string;
  notes?: string;
  recordedBy: string;
  createdAt: Date;
}

export interface PurchaseItem {
  id: string;
  name: string;
  brand?: string;
  model?: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice?: number;
  warrantyMonths?: number;
  remarks?: string;
  /** Optional link to the job this part was bought for. */
  serviceId?: string;
  serviceRef?: string;
  lineTotal: number;
  /** Sum of quantities already returned against this line. Never exceeds `quantity`. */
  returnedQuantity: number;
}

export interface PurchaseReturnLine {
  itemId: string;
  name: string;
  quantity: number;
  /** Copied from the item's `purchasePrice` at return time, so a later price
   *  edit can never retroactively change a past return's value. */
  unitPrice: number;
  lineTotal: number;
}

export interface PurchaseReturn {
  id: string;
  items: PurchaseReturnLine[];
  totalAmount: number;
  reason: string;
  returnedBy: { userId: string; name: string };
  returnedAt: Date;
  createdAt: Date;
}

export interface PurchaseRefund {
  id: string;
  amount: number;
  method: PurchasePaymentMethod;
  receivedAt: Date;
  reference?: string;
  notes?: string;
  recordedBy: string;
  createdAt: Date;
}

export interface PurchaseDiscount {
  mode: "amount" | "percent";
  /** What the admin typed. */
  value: number;
  /** The rupee figure derived from `value`, so readers never re-derive it. */
  amount: number;
}

export type PurchasePaymentStatus = "unpaid" | "partial" | "paid";
export type PurchaseStatus = "active" | "cancelled";

export interface Purchase {
  id: string;
  shopId: string;
  branchId: string;
  /** App-generated, sequential per shop per year: "PUR-2026-0012". */
  ref: string;
  /** The number printed on the supplier's paper bill, if any. */
  supplierInvoiceNo?: string;
  supplierId: string;
  /** Denormalized so the list renders from one read. */
  supplierName: string;
  purchaseDate: Date;
  purchasedBy: { userId: string; name: string };

  items: PurchaseItem[];

  subtotal: number;
  discount: PurchaseDiscount;
  gstRate: number;
  gstAmount: number;
  transportCharge: number;
  grandTotal: number;

  payments: PurchasePayment[];
  paidAmount: number;
  balance: number;
  paymentStatus: PurchasePaymentStatus;
  /** Optional. "Overdue" is derived, never stored. */
  dueDate?: Date;

  returns: PurchaseReturn[];
  /** Sum of every return's `totalAmount`. */
  returnedAmount: number;
  refunds: PurchaseRefund[];
  /** Sum of every refund's `amount`. */
  refundReceived: number;
  /** What the supplier still owes back, e.g. items returned after the bill was paid in full. */
  refundDue: number;

  status: PurchaseStatus;
  cancelReason?: string;
  cancelledAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}
