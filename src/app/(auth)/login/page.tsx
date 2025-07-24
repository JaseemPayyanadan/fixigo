"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { AuthGuard } from "@/components";
import { HiMail, HiLockClosed, HiUsers, HiChartBar, HiClock, HiShieldCheck } from "react-icons/hi";
import Link from "next/link";
import TextInput from "@/components/ui/TextInput";
import PasswordInput from "@/components/ui/PasswordInput";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Redirect or show success
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // Redirect or show success
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
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
          <p className="text-sm lg:text-base xl:text-xl text-blue-100 mb-8 leading-relaxed">
            Manage technicians, track services, and grow your business with our comprehensive platform designed for service professionals.
          </p>

          {/* Features */}
          <div className="space-y-6">
            <div className="flex items-center">
              <div className="w-10 h-10 xl:w-12 xl:h-12 bg-white/20 rounded-xl flex items-center justify-center mr-4">
                <HiUsers className="w-4 h-4 xl:w-6 xl:h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-sm lg:text-base xl:text-lg">Team Management</h3>
                <p className="text-blue-100 text-sm">Efficiently manage your technicians and their assignments</p>
              </div>
            </div>
            <div className="flex items-center">
              <div className="w-10 h-10 xl:w-12 xl:h-12 bg-white/20 rounded-xl flex items-center justify-center mr-4">
                <HiChartBar className="w-4 h-4 xl:w-6 xl:h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-sm lg:text-base xl:text-lg">Analytics & Insights</h3>
                <p className="text-blue-100 text-sm">Track performance and make data-driven decisions</p>
              </div>
            </div>
            <div className="flex items-center">
              <div className="w-10 h-10 xl:w-12 xl:h-12 bg-white/20 rounded-xl flex items-center justify-center mr-4">
                <HiClock className="w-4 h-4 xl:w-6 xl:h-6 text-white" />
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
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8">
            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Email Field */}
              <TextInput
                type="email"
                id="email"
                name="email"
                label="Email Address"
                required
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                icon={<HiMail className="h-5 w-5 text-gray-400" />}
              />

              {/* Password Field */}
              <PasswordInput
                id="password"
                name="password"
                label="Password"
                required
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                icon={<HiLockClosed className="h-5 w-5 text-gray-400" />}
              />

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

            {/* Divider */}
            <div className="my-8">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500 font-medium">Or continue with</span>
                </div>
              </div>
            </div>

            {/* Google Sign In */}
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full bg-white border border-gray-300 text-gray-700 font-medium py-3 px-6 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center hover:shadow-lg transform hover:scale-[1.02]"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {loading ? "Please wait..." : "Continue with Google"}
            </button>

            {/* Register Link */}
            <div className="mt-8 text-center">
              <p className="text-gray-600 text-sm">
                Don&apos;t have an account?{" "}
                <Link 
                  href="/register" 
                  className="text-blue-600 hover:text-blue-700 font-semibold hover:underline transition duration-200"
                >
                  Create one here
                </Link>
              </p>
            </div>
          </div>

          {/* Security Notice */}
          <div className="mt-6 text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <HiShieldCheck className="h-4 w-4 text-green-500" />
              <span>Your data is protected with enterprise-grade security</span>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-6">
            <p className="text-xs text-gray-400">
              By signing in, you agree to our{" "}
              <a href="#" className="text-blue-600 hover:text-blue-700">Terms of Service</a>
              {" "}and{" "}
              <a href="#" className="text-blue-600 hover:text-blue-700">Privacy Policy</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 