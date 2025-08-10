import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/firebase";
import { validateInvoice } from "@/lib/validation";

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { invoiceId, invoice } = body;

    if (!invoiceId) {
      return NextResponse.json({ error: "Invoice ID is required" }, { status: 400 });
    }

    // Validate invoice data
    const validation = validateInvoice(invoice);
    if (!validation.isValid) {
      return NextResponse.json({ error: "Invalid invoice data", details: validation.errors }, { status: 400 });
    }

    // Update invoice in Firestore
    const invoiceRef = doc(db, "invoices", invoiceId);
    await updateDoc(invoiceRef, {
      ...invoice,
      updatedAt: serverTimestamp(),
    });

    return NextResponse.json(
      {
        success: true,
        message: "Invoice updated successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating invoice:", error);
    return NextResponse.json({ error: "Failed to update invoice" }, { status: 500 });
  }
}
