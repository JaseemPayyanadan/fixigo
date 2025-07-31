"use client"
import React, { useState, useEffect } from "react";
import { CheckCircleIcon, UsersIcon, ChartBarIcon } from "@heroicons/react/24/outline";
import { BuildingStorefrontIcon } from "@heroicons/react/24/outline";

interface OnboardingCompleteProps {
  onContinue: () => void;
}

export default function OnboardingComplete({ onContinue }: OnboardingCompleteProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    setShowConfetti(true);
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      {/* Confetti Effect */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1 + Math.random() * 2}s`
              }}
            >
              <div className={`w-2 h-2 rounded-full ${
                ['bg-yellow-400', 'bg-blue-400', 'bg-green-400', 'bg-purple-400', 'bg-pink-400'][Math.floor(Math.random() * 5)]
              }`} />
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircleIcon className="w-10 h-10 text-green-600" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          🎉 Welcome to Fixigo!
        </h2>
        
        <p className="text-gray-600 mb-6">
          Your business profile has been set up successfully. You&apos;re now ready to start managing your services and growing your business!
        </p>

        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">What&apos;s Next?</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center">
              <BuildingStorefrontIcon className="w-4 h-4 text-blue-500 mr-2" />
              <span>Add your first branch</span>
            </div>
            <div className="flex items-center">
              <UsersIcon className="w-4 h-4 text-green-500 mr-2" />
              <span>Invite technicians to your team</span>
            </div>
            <div className="flex items-center">
              <ChartBarIcon className="w-4 h-4 text-purple-500 mr-2" />
              <span>Create your first service request</span>
            </div>
          </div>
        </div>

        <button
          onClick={onContinue}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105"
        >
          Continue to Dashboard
        </button>
      </div>
    </div>
  );
} 