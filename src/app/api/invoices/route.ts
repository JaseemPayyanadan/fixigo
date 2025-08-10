import { NextRequest, NextResponse } from "next/server";
import { collection, getDocs, query, where, orderBy, limit, startAfter } from "firebase/firestore";

import { db } from "@/lib/firebase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branchId");
    const status = searchParams.get("status");
    const paymentStatus = searchParams.get("paymentStatus");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const lastDoc = searchParams.get("lastDoc");

    // Build query
    let q = collection(db, "invoices");
    const constraints = [];

    if (branchId) {
      constraints.push(where("branchId", "==", branchId));
    }
    if (status) {
      constraints.push(where("status", "==", status));
    }
    if (paymentStatus) {
      constraints.push(where("paymentStatus", "==", paymentStatus));
    }

    constraints.push(orderBy("createdAt", "desc"));
    constraints.push(limit(pageSize));

    if (lastDoc) {
      // For pagination - you'd need to implement proper cursor-based pagination
      // This is a simplified version
    }

    const querySnapshot = await getDocs(query(q, ...constraints));
    const invoices = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({
      success: true,
      invoices,
      total: invoices.length,
      hasMore: invoices.length === pageSize
    });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}
