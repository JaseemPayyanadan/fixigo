import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, addDoc, setDoc, doc, query, where, getDocs } from "firebase/firestore";
import { hashPassword } from "@/lib/auth";
import { Branch } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
        const {
      name, 
      location, 
      phone, 
      email, 
      password, 
      shopId,
      managerName,
      managerPhone
    } = await request.json();

    // Validate required fields
    if (!name || !location || !phone || !email || !password || !shopId) {
      return NextResponse.json(
        { error: "Name, location, phone, email, password, and shopId are required" },
        { status: 400 }
      );
    }

    // Check if branch already exists with same name in the shop
    const branchesRef = collection(db, "branches");
    const branchQuery = query(branchesRef, where("shopId", "==", shopId), where("name", "==", name));
    const branchQuerySnapshot = await getDocs(branchQuery);
    
    if (!branchQuerySnapshot.empty) {
      return NextResponse.json(
        { error: "A branch with this name already exists in your shop" },
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

    // Create user document for branch manager
    const userData = {
      name: managerName || name + " Manager",
      email,
      password: hashedPassword,
      role: "branch_admin",
      shopId,
      phone: managerPhone || phone,
      status: "active",
      onboardingCompleted: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Add user to Firestore
    const userRef = doc(collection(db, "users"));
    await setDoc(userRef, userData);

    // Create branch document
    const branchData: Omit<Branch, "id" | "createdAt" | "updatedAt"> = {
      name,
      location,
      phone,
      email,
      status: "active",
      shopId,
      managerId: userRef.id, // Link to the user account
      managerName: managerName || name + " Manager",
      managerEmail: email,
      managerPhone: managerPhone || phone,
    };

    // Add branch to Firestore
    const branchRef = await addDoc(collection(db, "branches"), {
      ...branchData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: userRef.id,
          name: userData.name,
          email,
          role: "branch_admin",
          shopId,
          phone: userData.phone,
        },
        branch: {
          id: branchRef.id,
          ...branchData,
        },
      },
      message: "Branch created successfully",
    });
  } catch (error) {
    console.error("Branch creation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create branch" },
      { status: 500 }
    );
  }
} 