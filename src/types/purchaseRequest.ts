export type PurchaseRequestStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface PurchaseRequestItem {
  id: string;
  name: string;
  brand?: string;
  model?: string;
  quantity: number;
  remarks?: string;
}

export interface PurchaseRequest {
  id: string;
  shopId: string;
  branchId: string;
  /** App-generated, sequential per shop per year: "PR-2026-0007". */
  ref: string;

  serviceId: string;
  /** Denormalized so the list renders from one read. */
  serviceRef?: string;
  customerName: string;

  items: PurchaseRequestItem[];

  status: PurchaseRequestStatus;
  requestedBy: { userId: string; name: string };
  requestedAt: Date;

  decidedBy?: { userId: string; name: string };
  decidedAt?: Date;
  /** Required when status is "rejected". */
  rejectReason?: string;

  createdAt: Date;
  updatedAt: Date;
}
