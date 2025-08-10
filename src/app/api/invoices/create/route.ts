import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/firebase";
import { validateInvoice } from "@/lib/validation";
import type { Invoice } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const invoiceData = body.invoice;

    // Validate invoice data
    const validation = validateInvoice(invoiceData);
    if (!validation.isValid) {
      return NextResponse.json({ error: "Invalid invoice data", details: validation.errors }, { status: 400 });
    }

    // Add metadata
    const invoiceWithMetadata: Omit<Invoice, "id"> = {
      ...invoiceData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      status: "pending",
      paymentStatus: "unpaid",
    };

    // Create invoice in Firestore
    const docRef = await addDoc(collection(db, "invoices"), invoiceWithMetadata);

    return NextResponse.json(
      {
        success: true,
        invoiceId: docRef.id,
        message: "Invoice created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating invoice:", error);
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
  }
}
