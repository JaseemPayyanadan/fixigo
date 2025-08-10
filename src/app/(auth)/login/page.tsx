"use client";

import React, { useCallback, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ChartBarIcon, ClockIcon, EnvelopeIcon, LockClosedIcon, ShieldCheckIcon, UsersIcon } from "@heroicons/react/24/outline";

import { AuthGuard } from "@/components";
import PasswordInput from "@/components/ui/PasswordInput";
import TextInput from "@/components/ui/TextInput";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  return (
    <AuthGuard requireAuth={false}>
      <LoginContent />
    </AuthGuard>
  );
}

function LoginContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value), []);
  const handlePasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value), []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      // Redirect to appropriate dashboard based on role
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [login, email, password, router]);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row w-full">
      {/* Left Side - Hero Section */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600">
        <div className="max-w-lg mx-auto text-white flex flex-col justify-center px-8">
          {/* Logo */}
          <div className="flex items-center mb-8">
            <div className="w-12 h-12 lg:w-14 lg:h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg mr-4">
              <span className="text-white font-bold text-2xl">F</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold">Fixigo</h1>
              <p className="text-blue-100 text-sm">Service Management Platform</p>
            </div>
          </div>

          {/* Hero Content */}
          <h2 className="text-2xl lg:text-2xl xl:text-4xl font-bold mb-6 leading-tight">
            Streamline Your <br />
            <span className="text-blue-200">Service Business</span>
          </h2>
          <p className="text-sm lg:text-base xl:text-xl text-blue-100 mb-8 leading-relaxed">Manage technicians, track services, and grow your business with our comprehensive platform designed for service professionals.</p>

          {/* Features */}
          <div className="space-y-6">
            <div className="flex items-center">
              <div className="w-10 h-10 xl:w-12 xl:h-12 bg-white/20 rounded-xl flex items-center justify-center mr-4">
                <UsersIcon className="w-4 h-4 xl:w-6 xl:h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-sm lg:text-base xl:text-lg">Team Management</h3>
                <p className="text-blue-100 text-sm">Efficiently manage your technicians and their assignments</p>
              </div>
            </div>
            <div className="flex items-center">
              <div className="w-10 h-10 xl:w-12 xl:h-12 bg-white/20 rounded-xl flex items-center justify-center mr-4">
                <ChartBarIcon className="w-4 h-4 xl:w-6 xl:h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-sm lg:text-base xl:text-lg">Analytics & Insights</h3>
                <p className="text-blue-100 text-sm">Track performance and make data-driven decisions</p>
              </div>
            </div>
            <div className="flex items-center">
              <div className="w-10 h-10 xl:w-12 xl:h-12 bg-white/20 rounded-xl flex items-center justify-center mr-4">
                <ClockIcon className="w-4 h-4 xl:w-6 xl:h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-sm lg:text-base xl:text-lg">Real-time Updates</h3>
                <p className="text-blue-100 text-sm">Stay updated with live service status and notifications</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile Brand Header */}
          <div className="text-center mb-8 lg:hidden">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-2xl">F</span>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h1>
            <p className="text-gray-600">Sign in to your Fixigo account</p>
          </div>

          {/* Login Card */}
          <div className="flex flex-col">
            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Email Field */}
              <TextInput type="email" id="email" name="email" label="Email Address" required placeholder="Email" value={email} onChange={handleEmailChange} icon={<EnvelopeIcon className="h-5 w-5 text-gray-400" />} />

              {/* Password Field */}
              <PasswordInput id="password" name="password" label="Password" required placeholder="Password" value={password} onChange={handlePasswordChange} icon={<LockClosedIcon className="h-5 w-5 text-gray-400" />} />

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 animate-in fade-in-0">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 px-6 rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl transform hover:scale-[1.02]"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </div>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            {/* Register Link */}
            <div className="mt-8 text-center">
              <p className="text-gray-600 text-sm">
                Don&apos;t have an account?{" "}
                <Link href="/register" className="text-blue-600 hover:text-blue-700 font-semibold hover:underline transition duration-200">
                  Create one here
                </Link>
              </p>
            </div>
          </div>

          {/* Security Notice */}
          <div className="mt-6 text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <ShieldCheckIcon className="h-4 w-4 text-green-500" />
              <span>Your data is protected with enterprise-grade security</span>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-6">
            <p className="text-xs text-gray-400">
              By signing in, you agree to our{" "}
              <a href="#" className="text-blue-600 hover:text-blue-700">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="text-blue-600 hover:text-blue-700">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
