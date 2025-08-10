import { NextRequest, NextResponse } from "next/server";

import { collection, addDoc, setDoc, doc, query, where, getDocs } from "firebase/firestore";

import { hashPassword } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { Technician } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { 
      name, 
      email, 
      phone, 
      password, 
      role = "technician", 
      shopId, 
      branchId,
      skills = [],
      bio = "",
      specializations = []
    } = await request.json();

    // Validate required fields
    if (!name || !email || !phone || !password || !shopId || !branchId) {
      return NextResponse.json(
        { error: "Name, email, phone, password, shopId, and branchId are required" },
        { status: 400 }
      );
    }

    // Ensure role is always "technician"
    if (role !== "technician") {
      return NextResponse.json(
        { error: "Role must be 'technician'" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const usersRef = collection(db, "users");
    const userQuery = query(usersRef, where("email", "==", email));
    const userQuerySnapshot = await getDocs(userQuery);
    
    if (!userQuerySnapshot.empty) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user document
    const userData = {
      name,
      email,
      password: hashedPassword,
      role,
      shopId,
      branchId,
      phone,
      status: "active",
      onboardingCompleted: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Add user to Firestore
    const userRef = doc(collection(db, "users"));
    await setDoc(userRef, userData);

    // Create technician document
    const technicianData: Omit<Technician, "id" | "createdAt" | "updatedAt"> = {
      name,
      email,
      phone,
      role,
      shopId,
      branchId,
      userId: userRef.id,
      skills,
      status: "active",
      bio,
      specializations,
      experience: 0,
      rating: 0,
      totalServices: 0,
      completedServices: 0,
      availability: {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: false,
        sunday: false,
      },
      // Add created_by field for compatibility with existing code
      created_by: userRef.id,
    };

    // Add technician to Firestore
    const technicianRef = await addDoc(collection(db, "technicians"), {
      ...technicianData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: userRef.id,
          name,
          email,
          role,
          shopId,
          branchId,
          phone,
        },
        technician: {
          id: technicianRef.id,
          ...technicianData,
        },
      },
      message: "Technician created successfully",
    });
  } catch (error) {
    console.error("Technician creation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create technician" },
      { status: 500 }
    );
  }
} 