"use client"
import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="max-w-md mx-auto p-8 bg-white rounded-lg shadow-md mt-10 text-center">
      <h1 className="text-2xl font-bold mb-4 text-red-600">Access Denied</h1>
      <p className="text-gray-600 mb-6">
        You dont have permission to access this page. Please contact your administrator.
      </p>
      <Link 
        href="/dashboard" 
        className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
      >
        Go to Dashboard
      </Link>
    </div>
  );
} 